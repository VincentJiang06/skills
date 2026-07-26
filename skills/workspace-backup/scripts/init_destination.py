#!/usr/bin/env python3
"""init_destination.py — the ONLY writer of a destination marker.

Writes exactly two things: the backup root directory and its
.workspace-backup-dest.json marker. It never copies data and never overwrites an
existing marker. It refuses to run on any path guard_destination.py did not
clear in the same invocation — including, with no override, a Time Machine
volume.

The marker carries dest_id, machine UUID, hostname, layout_version, created_at
and nothing free-text, so no future reader can mistake its contents for
instructions.

Usage:
  init_destination.py --config C --dest-id ID --confirm
  init_destination.py --config C --dest-id ID --ack-secrets --confirm
  init_destination.py --selftest
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time

# running any of these by hand must not leave __pycache__ inside the shipped
# package; the internal spawns pass -B for the same reason
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _state  # noqa: E402
import guard_destination as guard  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
MARKER = ".workspace-backup-dest.json"


def run_guard(cfg_path, dest_id, plist=None):
    cmd = [sys.executable, "-B", os.path.join(HERE, "guard_destination.py"),
           "--config", cfg_path, "--dest-id", dest_id, "--json"]
    if plist:
        cmd += ["--plist", plist]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    try:
        return json.loads(p.stdout), p.returncode
    except Exception:
        return {"verdict": "GUARD_FAILED", "anomalies": [], "stderr": p.stderr}, (p.returncode or 1)


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    if "--config" not in args or "--dest-id" not in args:
        print(__doc__, file=sys.stderr)
        return 2
    cfg_path = args[args.index("--config") + 1]
    dest_id = args[args.index("--dest-id") + 1]
    confirmed = "--confirm" in args
    ack_secrets = "--ack-secrets" in args
    adopt = "--adopt-foreign-marker" in args

    cfg = _state.load_config(cfg_path)
    dest = _state.dest_by_id(cfg, dest_id)
    if dest is None:
        print(f"no destination with id {dest_id!r}", file=sys.stderr)
        return 2
    state = _state.ensure_state_dir(cfg["state_dir"])
    run_id = _state.get_current_run(state)
    j = _state.Journal(state, run_id)
    plist = _state.apfs_cache(state)

    g, code = run_guard(cfg_path, dest_id, plist)
    codes = [a.get("code") for a in (g.get("anomalies") or [])]

    if code in (guard.TM, guard.INSIDE_SOURCE):
        for a in g.get("anomalies") or []:
            print(f"[{a['code']}] {a['message']}")
        print("REFUSED. Setup does not override a refusal; there is no flag that does.")
        j.append("init_refused", dest=dest_id, verdict=g.get("verdict"), codes=codes)
        return code
    if code == guard.OFFLINE:
        print(f"{dest_id} is OFFLINE — the volume is not mounted, so there is nothing to "
              f"initialise. Plug the drive in and run this again.")
        j.append("init_skipped_offline", dest=dest_id)
        return guard.OFFLINE
    if "FOREIGN_MACHINE" in codes and not adopt:
        for a in g.get("anomalies") or []:
            if a["code"] == "FOREIGN_MACHINE":
                print(f"[FOREIGN_MACHINE] {a['message']}")
        print("REFUSED until confirmed. Re-run with --adopt-foreign-marker only if you are "
              "certain this drive should now belong to this machine.")
        j.append("init_refused", dest=dest_id, verdict="FOREIGN_MACHINE")
        return guard.CONFIRM
    if not confirmed:
        print(f"Would initialise destination {dest_id!r} at:\n  {_state.escape_untrusted(dest['path'])}\n"
              f"Setup never guesses a destination. Re-run with --confirm once that exact path "
              f"is the one you mean.")
        return guard.CONFIRM

    marker_path = os.path.join(dest["path"], MARKER)
    existed = os.path.exists(marker_path)
    if not existed:
        os.makedirs(dest["path"], exist_ok=True)
        _state.atomic_write_json(marker_path, {
            "schema_version": _state.SCHEMA_VERSION,
            "dest_id": dest_id,
            "machine": guard.machine_uuid(),
            "hostname": os.uname().nodename,
            "layout_version": 1,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })
        j.append("destination_initialised", dest=dest_id, path=dest["path"],
                 marker=marker_path)
        print(f"initialised {dest_id} at {_state.escape_untrusted(dest['path'])} (marker written)")
    else:
        print(f"{dest_id} already carries a marker at "
              f"{_state.escape_untrusted(marker_path)} — left untouched")

    if ack_secrets:
        ack = cfg.get("portable_secrets_ack") or {}
        ack[dest_id] = {"acknowledged_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "note": ("the user was shown the secret-bearing files and their "
                                 "destination paths, and accepted that they will live on this "
                                 "portable destination. Every run restates the count.")}
        cfg["portable_secrets_ack"] = ack
        _state.save_config(cfg)
        j.append("portable_secrets_acknowledged", dest=dest_id)
        print(f"recorded the one-time portable-destination secrets acknowledgement for {dest_id}")
    return 0


def _selftest():
    """Refusals first: setup must be unable to initialise the two destinations
    that would be catastrophic."""
    import shutil
    import tempfile
    tmp = tempfile.mkdtemp(prefix="wsbk-init-selftest-")
    fails = []
    try:
        fixtures = os.path.join(os.path.dirname(HERE), "evals", "fixtures")
        src = os.path.join(tmp, "src")
        os.makedirs(os.path.join(src, "u"))
        state = os.path.join(tmp, "state")

        def write_cfg(dests):
            cfg = {"schema_version": "1.0", "state_dir": state, "source_roots": [src],
                   "known_units": ["src/u"], "destinations": dests, "exclusions": [],
                   "secret_patterns": [], "portable_secrets_ack": {}}
            p = os.path.join(tmp, "config.json")
            with open(p, "w") as f:
                json.dump(cfg, f)
            return p

        # 1. a Time Machine volume must not be initialisable, even with --confirm
        p = write_cfg([{"id": "tm", "path": os.path.join(fixtures, "tmvol")}])
        rc = subprocess.run([sys.executable, "-B", __file__, "--config", p, "--dest-id", "tm",
                             "--confirm"], capture_output=True, text=True).returncode
        if rc != guard.TM:
            fails.append(f"init on a Time Machine volume returned {rc}, want {guard.TM}")
        if os.path.exists(os.path.join(fixtures, "tmvol", MARKER)):
            fails.append("a marker was written onto the Time Machine fixture")

        # 2. a destination inside a source root must not be initialisable
        p = write_cfg([{"id": "bomb", "path": os.path.join(src, "u", "backup")}])
        rc = subprocess.run([sys.executable, "-B", __file__, "--config", p, "--dest-id", "bomb",
                             "--confirm"], capture_output=True, text=True).returncode
        if rc != guard.INSIDE_SOURCE:
            fails.append(f"init inside a source root returned {rc}, want {guard.INSIDE_SOURCE}")
        if os.path.exists(os.path.join(src, "u", "backup")):
            fails.append("a refused destination directory was created anyway")

        # 3. without --confirm nothing is created (setup never guesses)
        good = os.path.join(tmp, "dest")
        p = write_cfg([{"id": "ok", "path": good}])
        rc = subprocess.run([sys.executable, "-B", __file__, "--config", p, "--dest-id", "ok"],
                            capture_output=True, text=True).returncode
        if os.path.exists(good):
            fails.append("the destination was created without --confirm")

        # 4. with --confirm the root and marker appear, and only those two things
        rc = subprocess.run([sys.executable, "-B", __file__, "--config", p, "--dest-id", "ok",
                             "--confirm"], capture_output=True, text=True).returncode
        if rc != 0 or not os.path.exists(os.path.join(good, MARKER)):
            fails.append(f"init --confirm failed (rc={rc})")
        else:
            m = json.load(open(os.path.join(good, MARKER)))
            if set(m) != {"schema_version", "dest_id", "machine", "hostname",
                          "layout_version", "created_at"}:
                fails.append(f"the marker carries unexpected keys: {sorted(m)}")
            if os.listdir(good) != [MARKER]:
                fails.append(f"init wrote more than the marker: {os.listdir(good)}")

        # 5. re-running must not overwrite an existing marker
        before = open(os.path.join(good, MARKER)).read()
        subprocess.run([sys.executable, "-B", __file__, "--config", p, "--dest-id", "ok", "--confirm"],
                       capture_output=True, text=True)
        if open(os.path.join(good, MARKER)).read() != before:
            fails.append("an existing marker was overwritten")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("init_destination.py selftest: 5 checks (TM refusal, copy-bomb refusal, "
          "no-confirm no-write, marker shape, no marker overwrite)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
