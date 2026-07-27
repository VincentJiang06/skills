#!/usr/bin/env python3
"""copy.py — detect the copier, emit only flags valid for it, move the bytes for
one unit, and journal intent BEFORE and result AFTER.

MEASURED on this Mac 2026-07-27: /usr/bin/rsync is openrsync ("protocol version
29 / rsync version 2.6.9 compatible") and /opt/homebrew/bin/rsync is ABSENT.
The invocation every backup tutorial gives — `rsync -aHAX --info=progress2` —
exits 1 here ("invalid option -- A"). But `-E` IS accepted and DOES preserve
extended attributes and resource forks at exit 0, together with the full flag
set this script emits, exclusions included. So there is exactly ONE copy path:
version-detected rsync with only measured-accepted flags, `-E` added when a
runtime probe proves this binary honours it. The previous build routed
"fidelity" units to /usr/bin/ditto, which has no exclude mechanism — it copied
those units WHOLE while every report claimed the exclusions applied.

WHERE THE BYTES GO is derived from the GUARDED config destination + the unit id,
never from plan.json. plan.json is a file this pipeline wrote earlier: it is
data, not authority. A plan naming any other path is refused (exit 11).

This script has NO import of, and no write path to, the memo file that records
what is safe. A unit becomes 'safe' only when verify.py commits it — never here,
so an interrupted or partial copy can never mark itself done.

Exit codes:
  0 ok / nothing to do / destination OFFLINE   3 destination BLOCKED by the plan
  2 usage                                      4 the guard did not clear it
  5 unrecognised copier                        6 another run holds the lock
  7 at least one unit failed to copy          11 plan.json named a target the
                                                 guard never cleared

Usage:
  copy.py --config C --plan plan.json --dest ID [--unit U] [--go]
  copy.py --config C --plan plan.json --dest ID --emit-commands --json
  copy.py --detect-copier --json [--rsync-bin B]
  copy.py --selftest
"""
from __future__ import annotations

import inspect
import json
import os
import re
import shutil
import subprocess
import sys

# running any of these by hand must not leave __pycache__ inside the shipped
# package; the internal spawns pass -B for the same reason
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _state  # noqa: E402
import guard_destination as guard  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RSYNC = "/usr/bin/rsync"
PLAN_TARGET_REFUSED = 11

# Every entry below was executed against this machine's /usr/bin/rsync on
# 2026-07-27; references/openrsync-compat.md is the dated record of that run and
# an eval asserts the two agree.
ALLOWED_FLAGS_OPENRSYNC = [
    "-a", "-E", "--itemize-changes", "--stats", "--numeric-ids", "--delete",
    "--exclude-from", "--dry-run", "--checksum",
]
ALLOWED_FLAGS_GNU = [
    "-a", "--itemize-changes", "--stats", "--numeric-ids", "--delete",
    "--exclude-from", "--dry-run", "--checksum", "-H", "-A", "-X",
]
# MEASURED to exit 1 under openrsync 2.6.9-compatible. Never emitted on that
# branch; --info= is denied as a PREFIX so no later refactor can reintroduce
# --info=progress2 by way of an --info=stats2 that happened to look harmless.
DENIED_FLAGS = ["-A", "-X", "--xattrs", "--acls", "-N", "--info="]

# The flag that preserves extended attributes differs per copier, and `-E` means
# something ELSE on GNU rsync (--executability), so it is never guessed: the
# right flag per branch, then a runtime probe.
XATTR_FLAG = {"openrsync": "-E", "gnu": "-X"}

ITEMIZE = re.compile(rb"^[<>]f")
# openrsync escapes some high bytes in --itemize-changes as \#NNN (octal).
OCTAL_ESCAPE = re.compile(rb"\\#(\d{3})")
# rsync's in-flight temp file: .<name>.XXXXXXXXXX  (measured: .big.bin.xdt2Z6kA96)
TEMP_ARTIFACT = re.compile(r"^\.(?P<base>.+)\.[A-Za-z0-9]{6,12}$")


def detect_copier(rsync_bin=RSYNC):
    try:
        p = subprocess.run([rsync_bin, "--version"], capture_output=True, text=True, timeout=20)
        out = (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return "absent", str(e)
    low = out.lower()
    if "openrsync" in low:
        return "openrsync", out.strip().splitlines()[0] if out.strip() else ""
    if re.search(r"rsync\s+version\s+[3-9]", low) or "protocol version 3" in low:
        return "gnu", out.strip().splitlines()[0] if out.strip() else ""
    return "unknown", out.strip().splitlines()[0] if out.strip() else ""


def probe_flag(rsync_bin, flag, workdir):
    """Run the flag for real against a throw-away pair of directories under the
    STATE dir. A capability is measured on this machine, this run — never
    inherited from a table."""
    if not flag:
        return False
    s = os.path.join(workdir, "probe-src")
    d = os.path.join(workdir, "probe-dst")
    try:
        os.makedirs(s, exist_ok=True)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(s, "probe.txt"), "w") as f:
            f.write("probe\n")
        p = subprocess.run([rsync_bin, "-a", flag, "--dry-run", s + os.sep, d + os.sep],
                           capture_output=True, timeout=30)
        return p.returncode == 0
    except Exception:
        return False
    finally:
        shutil.rmtree(s, ignore_errors=True)
        shutil.rmtree(d, ignore_errors=True)


def allowed_for(copier):
    return ALLOWED_FLAGS_GNU if copier == "gnu" else ALLOWED_FLAGS_OPENRSYNC


def assert_no_denied(argv, copier):
    if copier == "gnu":
        bad = [t for t in argv if t.startswith("--info=")]
    else:
        bad = [t for t in argv if t in DENIED_FLAGS or t.startswith("--info=")]
    if bad:
        raise RuntimeError(f"refusing to emit flags denied for {copier}: {bad}")


def write_exclude_file(state_dir, run_id, exclusions):
    path = os.path.join(state_dir, f"exclude-{run_id}.txt")
    with open(path, "w", encoding="utf-8") as f:
        for e in exclusions:
            f.write(e + "\n")
        f.flush()
        os.fsync(f.fileno())
    return path


def build_command(unit, route, cfg, copier, rsync_bin, exclude_file, xattr_flag=None):
    """The source path is NEVER legal in the destination position, and a source
    path is never a delete target. Argument order is asserted by the harness.

    `route["dest_path"]` must already be the DERIVED path (see resolve_route);
    this function re-checks the copy-bomb rule and nothing else."""
    src = os.path.abspath(unit["path"])
    dst = os.path.abspath(route["dest_path"])
    for r in cfg.get("source_roots", []):
        rp = os.path.realpath(r)
        if os.path.realpath(dst) == rp or os.path.realpath(dst).startswith(rp + os.sep):
            raise RuntimeError(f"destination {dst} resolves inside source root {r} — refusing")
    argv = [rsync_bin, "-a"]
    if xattr_flag:
        argv.append(xattr_flag)
    argv += ["--itemize-changes", "--stats", "--numeric-ids"]
    if route.get("delete_at_destination"):
        argv.append("--delete")
    if route.get("force_checksum"):
        # the destination copy failed a CONTENT check while size and mtime
        # agreed, so rsync's quick check would skip the file for ever
        argv.append("--checksum")
    argv.append(f"--exclude-from={exclude_file}")
    argv += [src + os.sep, dst + os.sep]
    assert_no_denied(argv, copier)
    return {"unit": unit["id"], "dest": route.get("dest_id"), "copier": copier,
            "argv": argv, "exclusions_applied": True,
            "xattrs_preserved": bool(xattr_flag),
            "force_checksum": bool(route.get("force_checksum"))}


def unescape_itemize(raw):
    """openrsync renders some bytes of a filename as \\#NNN (octal). Reconstruct
    the real bytes: the escaped form does not exist on disk, so joining it onto
    the source path silently loses that file from the byte accounting."""
    return OCTAL_ESCAPE.sub(lambda m: bytes([int(m.group(1), 8)]), raw)


def transferred(stdout_bytes, src):
    """Bytes moved, taken from --itemize-changes rather than from a --stats
    string, so the number does not depend on a human-readable unit suffix.

    Parsed as BYTES. openrsync's output is not valid UTF-8 for non-ASCII names
    (measured: 中文.txt, emoji-🔥-ok.txt), and decoding it strictly used to kill
    the first --go copy of any unit holding such a file, leaving every later
    unit in the plan untouched."""
    names, total = [], 0
    src_b = os.fsencode(src)
    for line in (stdout_bytes or b"").splitlines():
        if ITEMIZE.match(line):
            parts = line.split(None, 1)
            if len(parts) == 2:
                rel_b = unescape_itemize(parts[1].strip())
                names.append(os.fsdecode(rel_b))
                try:
                    total += os.path.getsize(os.path.join(src_b, rel_b))
                except OSError:
                    pass
    return total, names


def _is_xattr_permission_failure(stderr):
    """Does this stderr look like the copier choking on an extended attribute it
    is not allowed to read, rather than a genuine unreadable file?

    MEASURED 2026-07-27 on a file carrying com.apple.macl:
        rsync -a -E <file>  -> exit 1, 'error: <name>: openat: Permission denied'
        rsync -a    <file>  -> exit 0
    The message names a permission problem on a file the user can plainly read,
    which is the signature. Kept deliberately narrow: a real EACCES on a file
    owned by someone else produces the same words, so the caller only consults
    this AFTER a failure and only when the xattr flag was actually in play — and
    the retry either succeeds (it was the flag) or fails again (it was real)."""
    if not stderr:
        return False
    low = stderr.lower()
    return ("permission denied" in low) and ("openat" in low or "xattr" in low
                                             or "attribute" in low)


def sweep_copier_temp_files(src_path, dest_path):
    """REPORT (never delete) the '.NAME.XXXXXXXXXX' files a killed copier leaves.

    History, and why this function no longer deletes anything (0.2.1):

    A hard interruption leaves a temp file at the destination. 0.2.0 fixed the
    resulting wedge by deleting those files here. That was a second fix for an
    already-solved problem — verify.py classifies them as `temp_artifacts` and
    does NOT fail the unit, so the wedge was gone without any deletion — and the
    deletion destroyed real user data:

        TEMP_ARTIFACT is `^\\.(.+)\\.[A-Za-z0-9]{6,12}$`, which matches
        '.env.production' and '.env.staging' as readily as '.big.bin.xdt2Z6kA96'.
        The only guard was "skip if the same name still exists in the source", so
        deleting OR MERELY RENAMING a source file destroyed its destination copy
        on the next ordinary run — while delete_at_destination was false and the
        report printed RUN OK / SAFE. Reproduced end-to-end; see eval L4-29.

    No filename pattern can separate a copier's debris from a user's dotfile,
    because the shapes genuinely overlap. So the authority to remove anything at
    the destination stays where the user put it: `delete_at_destination`. Debris
    is named in the report and left on disk — a bounded, visible space leak is
    strictly better than an invisible deletion. When the user does enable
    delete_at_destination, the copier's own --delete reclaims it.

    INVARIANT: this function performs no deletion. It has no unlink call, and
    eval L4-29 fails if a destination file ever disappears without consent."""
    found = []
    if not os.path.isdir(dest_path):
        return found
    for dirpath, _dirnames, filenames in os.walk(dest_path):
        for fn in filenames:
            if not TEMP_ARTIFACT.match(fn):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, dest_path)
            if os.path.lexists(os.path.join(src_path, rel)):
                continue          # a real source file that merely looks like one
            try:
                found.append({"rel": rel, "bytes": os.path.getsize(full)})
            except OSError as e:
                found.append({"rel": rel, "error": str(e)})
    return found


def resolve_route(cfg, dest_id, unit, route, guarded_root):
    """The write target for this unit, derived and cross-checked. Raises
    _state.PlanTargetError if plan.json names anything else."""
    derived = _state.check_plan_dest_path(cfg, dest_id, unit["id"],
                                          route.get("dest_path"), guarded_root)
    return dict(route, dest_path=derived, dest_id=dest_id)


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    rsync_bin = args[args.index("--rsync-bin") + 1] if "--rsync-bin" in args else RSYNC

    if "--detect-copier" in args:
        copier, banner = detect_copier(rsync_bin)
        out = {"copier": copier, "banner": banner, "binary": rsync_bin,
               "allowed_flags": allowed_for(copier), "denied_flags": DENIED_FLAGS,
               "xattr_flag": XATTR_FLAG.get(copier)}
        print(json.dumps(out, indent=2))
        return 0

    if "--config" not in args or "--plan" not in args or "--dest" not in args:
        print(__doc__, file=sys.stderr)
        return 2
    cfg = _state.load_config(args[args.index("--config") + 1])
    plan = json.load(open(args[args.index("--plan") + 1], encoding="utf-8"))
    dest_id = args[args.index("--dest") + 1]
    only_unit = args[args.index("--unit") + 1] if "--unit" in args else None
    go = "--go" in args
    emit_only = "--emit-commands" in args
    as_json = "--json" in args

    state = _state.ensure_state_dir(cfg["state_dir"])
    run_id = plan.get("run_id") or _state.get_current_run(state)
    j = _state.Journal(state, run_id)

    d = plan.get("destinations", {}).get(dest_id)
    if d is None:
        print(f"plan.json has no destination {dest_id!r}", file=sys.stderr)
        return 2
    if d["state"] == "OFFLINE":
        print(f"{dest_id}: OFFLINE — skipped. An unplugged removable destination is a NORMAL "
              f"outcome, not an error; the report carries its staleness in days.")
        j.append("dest_skipped", dest=dest_id, why="OFFLINE")
        return 0
    if dest_id in (plan.get("blocked") or {}):
        b = plan["blocked"][dest_id]
        print(f"{dest_id}: BLOCKED [{b['code']}] {b['message']}", file=sys.stderr)
        return 3
    if d["state"] != "CLEAR":
        print(f"{dest_id}: guard verdict {d['state']} — no writer runs for a destination the "
              f"guard did not clear.", file=sys.stderr)
        return 4

    # The drive may have been swapped since the plan was made, and a resume
    # re-enters here, so identity is re-proved by a fresh guard process. The
    # path that guard proves is the path this process is allowed to write.
    gcmd = [sys.executable, "-B", os.path.join(HERE, "guard_destination.py"),
            "--config", cfg["_path"], "--dest-id", dest_id, "--json"]
    plist = _state.apfs_cache(state)
    if plist:
        gcmd += ["--plist", plist]
    gp = subprocess.run(gcmd, capture_output=True, timeout=120)
    gp_out = (gp.stdout or b"").decode("utf-8", "replace")
    try:
        gres = json.loads(gp_out)
    except Exception:
        gres = {}
    if gp.returncode != guard.CLEAR:
        print(f"{dest_id}: re-check before writing returned {gp.returncode} — refusing to write.",
              file=sys.stderr)
        print(gp_out[:800], file=sys.stderr)
        j.append("copy_refused_by_guard_recheck", dest=dest_id, exit_code=gp.returncode)
        return 0 if gp.returncode == guard.OFFLINE else 4
    guarded_root = gres.get("path") or os.path.abspath(_state.dest_by_id(cfg, dest_id)["path"])

    # delete authorisation is computed for, and applied to, the SAME path the
    # guard just cleared — never to a path plan.json supplied.
    delete_ok = bool(cfg.get("delete_at_destination")) and bool(gres.get("marker_valid"))
    sweep_ok = bool(gres.get("marker_valid"))
    copier, banner = detect_copier(rsync_bin)
    if copier in ("absent", "unknown"):
        print(f"cannot recognise `{rsync_bin} --version` ({banner!r}). Refusing to guess a flag "
              f"set — see references/openrsync-compat.md.", file=sys.stderr)
        j.append("copier_unrecognised", banner=banner, binary=rsync_bin)
        return 5
    xattr_flag = XATTR_FLAG.get(copier)
    if xattr_flag and not probe_flag(rsync_bin, xattr_flag, state):
        j.append("xattr_flag_unsupported", copier=copier, flag=xattr_flag, binary=rsync_bin,
                 why="the runtime probe of this flag exited non-zero on this machine")
        print(f"NOTE: {rsync_bin} did not accept {xattr_flag} — extended attributes and resource "
              f"forks will NOT be preserved by this run, and the report says so.",
              file=sys.stderr)
        xattr_flag = None

    exclude_file = write_exclude_file(state, run_id, cfg.get("exclusions", []))

    def routes_for(unit):
        route = (unit.get("routes") or {}).get(dest_id)
        if not route or route.get("refused"):
            return None
        return resolve_route(cfg, dest_id, unit, route, guarded_root)

    commands, results = [], []
    try:
        for u in plan["units"]:
            if only_unit and u["id"] != only_unit:
                continue
            route = routes_for(u)
            if route is None or not route["changed"]:
                continue
            route = dict(route, delete_at_destination=delete_ok)
            commands.append(build_command(u, route, cfg, copier, rsync_bin, exclude_file,
                                          xattr_flag))
    except _state.PlanTargetError as e:
        print(f"REFUSING TO WRITE: {e}", file=sys.stderr)
        j.append("plan_target_refused", dest=dest_id, detail=str(e), guarded_root=guarded_root)
        return PLAN_TARGET_REFUSED

    if emit_only:
        out = {"copier": copier, "banner": banner, "dest": dest_id,
               "xattr_flag": xattr_flag, "guarded_root": guarded_root, "commands": commands}
        if as_json:
            print(json.dumps(out, indent=2, ensure_ascii=False))
        else:
            for c in commands:
                print(" ".join(c["argv"]))
        return 0

    if not go:
        print("DRY-RUN (the default). Nothing has been written. These are the exact "
              "invocations a --go run would execute:")
        for c in commands:
            print("  " + " ".join(_state.escape_untrusted(a) for a in c["argv"]))
        skipped = [u["id"] for u in plan["units"]
                   if (u.get("routes") or {}).get(dest_id) and not u["routes"][dest_id]["changed"]]
        print(f"  ({len(commands)} unit(s) would be copied to {dest_id}; "
              f"{len(skipped)} unchanged by fingerprint and would be skipped)")
        return 0

    try:
        lock = _state.acquire_lock(state, run_id, j)
    except _state.LockHeld as e:
        print(f"REFUSING: {e}", file=sys.stderr)
        return 6

    failures = 0
    copied = 0
    skipped = 0
    try:
        for u in plan["units"]:
            if only_unit and u["id"] != only_unit:
                continue
            raw_route = (u.get("routes") or {}).get(dest_id)
            if not raw_route:
                continue
            if raw_route.get("refused"):
                j.append("unit_refused", unit=u["id"], dest=dest_id, why=raw_route["refused"],
                         detail=u.get("case_collisions"))
                continue
            try:
                route = resolve_route(cfg, dest_id, u, raw_route, guarded_root)
            except _state.PlanTargetError as e:
                print(f"REFUSING TO WRITE: {e}", file=sys.stderr)
                j.append("plan_target_refused", unit=u["id"], dest=dest_id, detail=str(e),
                         guarded_root=guarded_root)
                _state.release_lock(lock)
                return PLAN_TARGET_REFUSED
            if not route["changed"]:
                skipped += 1
                j.append("unit_skip_memo", unit=u["id"], dest=dest_id,
                         fingerprint_method=(u.get("fingerprint") or {}).get(
                             "method", _state.FINGERPRINT_METHOD),
                         fingerprint_age_days=u.get("fingerprint_age_days"),
                         dest_observed_days_ago=route.get("dest_observed_days_ago"),
                         why="source fingerprint AND destination re-check both matched the memo")
                continue
            route = dict(route, delete_at_destination=delete_ok)
            c = build_command(u, route, cfg, copier, rsync_bin, exclude_file, xattr_flag)
            # intent is journalled BEFORE the action it announces
            j.append("unit_copy_intent", unit=u["id"], dest=dest_id, status="in_progress",
                     argv=c["argv"], copier=c["copier"], dest_path=route["dest_path"],
                     exclusions_applied=c["exclusions_applied"],
                     xattrs_preserved=c["xattrs_preserved"])
            try:
                if sweep_ok:
                    debris = sweep_copier_temp_files(u["path"], route["dest_path"])
                    if debris:
                        j.append("copier_temp_found", unit=u["id"], dest=dest_id, files=debris,
                                 why="left behind by an interrupted copier run; REPORTED, not "
                                     "removed — destination deletion requires "
                                     "delete_at_destination (see L4-29)")
                os.makedirs(os.path.dirname(os.path.abspath(route["dest_path"])), exist_ok=True)
                p = subprocess.run(c["argv"], capture_output=True, timeout=3600)
                rc, out_b = p.returncode, p.stdout
                err = (p.stderr or b"").decode("utf-8", "replace")
                # LIVE-FIRE (2026-07-27): the startup probe proves the BINARY
                # accepts the xattr flag; it cannot prove the flag works on THIS
                # corpus. Files carrying com.apple.macl (WeChat/AirDrop/Safari
                # downloads) make openrsync exit 1 with 'openat: Permission
                # denied' under -E, while the same file copies fine without it.
                # Three whole units — one holding an irreplaceable KB — landed
                # 0 bytes because of this. Metadata is worth less than the
                # bytes: retry once without the flag and SAY the metadata was
                # lost, rather than abandoning the unit. (L4-31)
                if rc != 0 and xattr_flag and _is_xattr_permission_failure(err):
                    j.append("xattr_flag_failed_on_corpus", unit=u["id"], dest=dest_id,
                             flag=xattr_flag, stderr=err[-400:],
                             why="the flag was accepted by the binary but rejected on this "
                                 "unit's files; retrying without it")
                    c = build_command(u, route, cfg, copier, rsync_bin, exclude_file, None)
                    p = subprocess.run(c["argv"], capture_output=True, timeout=3600)
                    rc, out_b = p.returncode, p.stdout
                    err = (p.stderr or b"").decode("utf-8", "replace")
                    if rc == 0:
                        print(f"       {u['id']}: extended attributes NOT preserved — "
                              f"{xattr_flag} failed on this unit's files (com.apple.macl or "
                              f"similar); the bytes are copied, the metadata is not.")
            except OSError as e:
                # a read-only destination (NTFS by default, or a drive remounted
                # read-only after I/O errors) must be ONE unit's failure, not the
                # death of the run
                rc, out_b, err = 13, b"", f"{type(e).__name__}: {e}"
            bytes_moved, names = transferred(out_b, u["path"])
            ok = rc == 0
            if not ok:
                failures += 1
                bytes_moved = 0     # a failed copy landed nothing it can claim
            else:
                copied += 1
            j.append("unit_copy_result", unit=u["id"], dest=dest_id,
                     exit_code=rc, ok=ok, copier=c["copier"],
                     dest_path=route["dest_path"],
                     bytes_transferred=bytes_moved, file_count=len(names),
                     copied_files=names[:200],
                     exclusions_applied=c["exclusions_applied"],
                     xattrs_preserved=c["xattrs_preserved"],
                     force_checksum=c["force_checksum"],
                     stderr=err[-800:])
            results.append({"unit": u["id"], "exit_code": rc,
                            "bytes": bytes_moved, "copier": c["copier"]})
            print(f"  {'ok ' if ok else 'FAIL'} {_state.escape_untrusted(u['id'])}  "
                  f"copier={c['copier']}  exit={rc}  "
                  f"{_state.human_bytes(bytes_moved)}")
            if not ok:
                print(f"       copier exited {rc}: "
                      f"{_state.escape_untrusted(err.strip()[:300])}", file=sys.stderr)
                print(f"       {_state.escape_untrusted(u['id'])} stays UNVERIFIED — a partial "
                      f"result is never coerced to success.", file=sys.stderr)
    finally:
        _state.release_lock(lock)

    print(f"  ({copied} unit(s) copied to {dest_id}, {skipped} unchanged and skipped, "
          f"{failures} failed; extended attributes "
          f"{'preserved with ' + xattr_flag if xattr_flag else 'NOT preserved'})")
    if as_json:
        print(json.dumps({"dest": dest_id, "results": results, "failures": failures}, indent=2))
    return 7 if failures else 0


def _selftest():
    import tempfile
    tmp = tempfile.mkdtemp(prefix="wsbk-copy-selftest-")
    fails = []
    try:
        # 1. detection must branch on the banner, not on the path
        stub = os.path.join(tmp, "rsync-gnu")
        with open(stub, "w") as f:
            f.write("#!/bin/sh\necho 'rsync  version 3.2.7  protocol version 31'\n")
        os.chmod(stub, 0o755)
        if detect_copier(stub)[0] != "gnu":
            fails.append("a GNU banner did not select the GNU branch")
        stub2 = os.path.join(tmp, "rsync-open")
        with open(stub2, "w") as f:
            f.write("#!/bin/sh\necho 'openrsync: protocol version 29'\n"
                    "echo 'rsync version 2.6.9 compatible'\n")
        os.chmod(stub2, 0o755)
        if detect_copier(stub2)[0] != "openrsync":
            fails.append("an openrsync banner did not select the openrsync branch")
        stub3 = os.path.join(tmp, "rsync-weird")
        with open(stub3, "w") as f:
            f.write("#!/bin/sh\necho 'totally unknown copier 9000'\n")
        os.chmod(stub3, 0o755)
        if detect_copier(stub3)[0] != "unknown":
            fails.append("an unrecognised banner was not reported as unknown")
        if detect_copier(os.path.join(tmp, "nope"))[0] != "absent":
            fails.append("a missing binary was not reported as absent")
        if os.path.exists(RSYNC) and detect_copier(RSYNC)[0] != "openrsync":
            fails.append(f"the REAL {RSYNC} was not detected as openrsync on this machine")

        # 2. a denied flag must raise, never be emitted (known-bad input)
        for bad in (["rsync", "-a", "-A", "s/", "d/"],
                    ["rsync", "-a", "--info=progress2", "s/", "d/"],
                    ["rsync", "-a", "--xattrs", "s/", "d/"]):
            try:
                assert_no_denied(bad, "openrsync")
                fails.append(f"assert_no_denied let {bad} through on the openrsync branch")
            except RuntimeError:
                pass
        try:
            assert_no_denied(["rsync", "-a", "-E", "--itemize-changes", "s/", "d/"], "openrsync")
        except RuntimeError:
            fails.append("assert_no_denied rejected a legal command")

        # 3. every flag this build can emit must actually run under the real
        #    binary, AND the xattr flag must actually preserve an xattr
        if os.path.exists(RSYNC) and detect_copier(RSYNC)[0] == "openrsync":
            s = os.path.join(tmp, "s")
            dd = os.path.join(tmp, "d")
            os.makedirs(os.path.join(s, "sub"))
            os.makedirs(dd)
            with open(os.path.join(s, "sub", "f.txt"), "w") as f:
                f.write("x")
            ex = os.path.join(tmp, "ex.txt")
            with open(ex, "w") as f:
                f.write("node_modules/\n")
            argv = [RSYNC, "-a", "-E", "--itemize-changes", "--stats", "--numeric-ids",
                    "--delete", "--checksum", f"--exclude-from={ex}", "--dry-run",
                    s + "/", dd + "/"]
            p = subprocess.run(argv, capture_output=True, text=True)
            if p.returncode != 0:
                fails.append(f"the emitted flag set exits {p.returncode} under the real "
                             f"{RSYNC}: {p.stderr.strip()[:200]}")
            if not probe_flag(RSYNC, "-E", tmp):
                fails.append(f"the runtime probe says {RSYNC} rejects -E")
            xw = subprocess.run(["/usr/bin/xattr", "-w", "com.test.selftest", "V",
                                 os.path.join(s, "sub", "f.txt")], capture_output=True)
            if xw.returncode == 0:
                subprocess.run([RSYNC, "-a", "-E", s + "/", dd + "/"], capture_output=True)
                got = subprocess.run(["/usr/bin/xattr", os.path.join(dd, "sub", "f.txt")],
                                     capture_output=True, text=True).stdout
                if "com.test.selftest" not in got:
                    fails.append("the emitted xattr flag did NOT preserve an extended "
                                 f"attribute: {got!r}")
                plain = os.path.join(tmp, "d-plain")
                subprocess.run([RSYNC, "-a", s + "/", plain + "/"], capture_output=True)
                got2 = subprocess.run(["/usr/bin/xattr", os.path.join(plain, "sub", "f.txt")],
                                      capture_output=True, text=True).stdout
                if "com.test.selftest" in got2:
                    fails.append("the fixture is degenerate: plain -a preserved the xattr too, "
                                 "so the flag proves nothing")

        # 4. the source must never land in the destination position
        cfg = {"source_roots": [os.path.join(tmp, "src")]}
        os.makedirs(os.path.join(tmp, "src", "u"), exist_ok=True)
        try:
            build_command({"id": "src/u", "path": os.path.join(tmp, "src", "u")},
                          {"dest_path": os.path.join(tmp, "src", "u", "backup"),
                           "copier": "rsync", "changed": True},
                          cfg, "openrsync", RSYNC, "/dev/null")
            fails.append("build_command accepted a destination inside a source root")
        except RuntimeError:
            pass

        # 5. transferred() must count only itemized transfers — including files
        #    whose names openrsync escaped (known-bad input: the escaped form
        #    does not exist on disk, so a naive join silently loses the bytes)
        s2 = os.path.join(tmp, "s2")
        os.makedirs(s2)
        with open(os.path.join(s2, "a.txt"), "w") as f:
            f.write("12345")
        with open(os.path.join(s2, "中文.txt"), "w") as f:
            f.write("1234567")
        n, names = transferred(b">f+++++++ a.txt\ncd+++++++ sub/\n"
                               b">f+++++++ \xe4\xb8\\#255\xe6\\#226\\#207.txt\n", s2)
        if n != 12 or names != ["a.txt", "中文.txt"]:
            fails.append(f"transferred() = {n}, {names}; want 12, ['a.txt', '中文.txt'] "
                         f"(a created directory is not a transfer; an escaped non-ASCII name "
                         f"must still be counted)")

        # 6. the copier's temp debris must be REPORTED and NOTHING must be deleted.
        #    A user dotfile whose shape collides with the temp pattern
        #    ('.env.production' matches it exactly) must survive even when it is
        #    gone from the source — that is the whole point of a mirror (L4-29).
        s3 = os.path.join(tmp, "s3")
        d3 = os.path.join(tmp, "d3")
        os.makedirs(s3)
        os.makedirs(d3)
        with open(os.path.join(s3, ".real.file.abcdef1234"), "w") as f:
            f.write("a genuine source file")
        with open(os.path.join(d3, ".real.file.abcdef1234"), "w") as f:
            f.write("its faithful copy")
        with open(os.path.join(d3, ".big.bin.xdt2Z6kA96"), "w") as f:
            f.write("orphaned by a killed copier")
        # a destination-only dotfile that matches the temp pattern: the 0.2.0
        # sweep deleted exactly this shape once the source copy was removed
        with open(os.path.join(d3, ".env.production"), "w") as f:
            f.write("PROD_DB_PASSWORD=hunter2")
        found = sorted(r["rel"] for r in sweep_copier_temp_files(s3, d3))
        if found != [".big.bin.xdt2Z6kA96", ".env.production"]:
            fails.append(f"debris report = {found}; want both destination-only "
                         f"temp-shaped names REPORTED (reporting is not deletion)")
        for must_live in (".real.file.abcdef1234", ".big.bin.xdt2Z6kA96", ".env.production"):
            if not os.path.exists(os.path.join(d3, must_live)):
                fails.append(f"{must_live} was DELETED at the destination; destination "
                             f"deletion requires delete_at_destination — no filename "
                             f"pattern may authorise it (L4-29)")
        # structural guard: the function body (docstring excluded) must contain no
        # deletion call, so a future edit cannot quietly reintroduce 0.2.0's bug
        _body = inspect.getsource(sweep_copier_temp_files)
        _doc = sweep_copier_temp_files.__doc__ or ""
        _code_only = _body.replace(_doc, "")
        for _danger in ("os.unlink", "os.remove", "shutil.rmtree", "os.rmdir"):
            if _danger in _code_only:
                fails.append(f"sweep_copier_temp_files regained a deletion call ({_danger}); "
                             f"destination deletion requires delete_at_destination (L4-29)")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("copy.py selftest: 6 checks (4 copier banners incl. the real binary, denied-flag "
          "refusal on 3 known-bad argvs, real-binary flag execution + a MEASURED xattr "
          "round-trip against a plain -a control, copy-bomb refusal, transfer accounting "
          "incl. escaped non-ASCII names, temp-debris REPORTED not deleted, with a look-alike control + a structural no-unlink guard)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
