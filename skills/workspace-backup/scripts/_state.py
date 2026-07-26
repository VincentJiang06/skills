#!/usr/bin/env python3
"""_state.py — the ONE implementation of lock, atomic replace, journal append,
schema-version check, and manifest read/commit.

Imported by inventory / plan / init_destination / copy / verify / status. Never
read into the model's context; never invoked directly except for --selftest.

Writes ONLY under the configured state directory. There is no code path in this
module that can write to a source root or to a backup destination.

Ordering that failure modes F2 (silent partial reported as success) and F3
(stale believed fresh) turn on:
  * the journal is append-only JSONL, one self-contained object per line,
    flushed and fsynced BEFORE the action it announces;
  * the manifest is committed by temp-file + fsync + os.replace, so the old
    manifest stays valid until the instant the new one is complete;
  * a run that ANNOUNCED a copy it never carried to a passing verify is TORN,
    which is a different thing from a journal that never started and from an
    administrative journal that never ran a chain at all.

It also owns the ONE definition of the write target: `derive_dest_path` builds
it from the config destination root + unit id, and `check_plan_dest_path`
refuses a plan.json that names anywhere else. plan.json is an artifact this
pipeline wrote earlier — it is DATA, not authority over where bytes land.
"""
from __future__ import annotations

import errno
import hashlib
import json
import os
import re
import socket
import sys
import time

SCHEMA_VERSION = "1.1"
MANIFEST = "manifest.json"
LOCK = "lock"
RUNS = "runs"
CURRENT_RUN = "current_run"
STALE_LOCK_SECONDS = 6 * 3600

CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


# ----------------------------------------------------------------- config

def load_config(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    major_check(cfg.get("schema_version", SCHEMA_VERSION), "config.json")
    cfg["_path"] = os.path.abspath(path)
    cfg["state_dir"] = os.path.expanduser(cfg.get("state_dir", "~/.workspace-backup"))
    cfg["source_roots"] = [os.path.expanduser(p) for p in cfg.get("source_roots", [])]
    for d in cfg.get("destinations", []):
        d["path"] = os.path.expanduser(d["path"])
    # The copy-bomb rule protects DESTINATIONS from living inside a source root.
    # The state directory is an active writer too — journal, lock, memo, per-run
    # exclude files — and "keep the ledger with the project" is a natural config
    # edit. Inside a source root it would mutate the tree it is fingerprinting on
    # every run, and be copied to the destinations as ordinary data.
    sd = os.path.realpath(cfg["state_dir"])
    for r in cfg["source_roots"]:
        rp = os.path.realpath(r)
        if sd == rp or sd.startswith(rp + os.sep):
            raise ConfigError(
                f"state_dir {cfg['state_dir']} resolves inside source root {r}. The ledger is an "
                f"active writer and the source is read-only (INV-02); move state_dir outside "
                f"every source root — the default ~/.workspace-backup is outside all of them.")
    return cfg


def save_config(cfg):
    out = {k: v for k, v in cfg.items() if not k.startswith("_")}
    atomic_write_json(cfg["_path"], out)


def dest_by_id(cfg, dest_id):
    for d in cfg.get("destinations", []):
        if d.get("id") == dest_id:
            return d
    return None


def major_check(version, what):
    """A newer MAJOR schema makes this build refuse to write, with migration
    instructions. An older major is migrated or discarded-and-recopied."""
    try:
        theirs = int(str(version).split(".")[0])
    except Exception:
        raise SchemaError(f"{what}: unreadable schema_version {version!r}")
    ours = int(SCHEMA_VERSION.split(".")[0])
    if theirs > ours:
        raise SchemaError(
            f"{what} was written by a NEWER major schema version ({version} > {SCHEMA_VERSION}). "
            f"Refusing to write, because an older build that rewrites a newer file silently "
            f"destroys its fields. To migrate: upgrade vince-workspace-backup, or move "
            f"{what} aside and accept that the next run is a full copy.")


class SchemaError(Exception):
    pass


class ConfigError(Exception):
    pass


class PlanTargetError(Exception):
    """plan.json named a write target that is not the guarded destination."""


# ------------------------------------------------- the ONE write-target rule

def derive_dest_path(cfg, dest_id, unit_id):
    """The write target, derived from the GUARDED config destination root and
    the unit id. Never read from plan.json."""
    d = dest_by_id(cfg, dest_id)
    if d is None:
        raise PlanTargetError(f"no destination with id {dest_id!r} in {cfg.get('_path')}")
    return os.path.abspath(os.path.join(os.path.abspath(d["path"]), unit_id))


def _under(root, path):
    r = os.path.realpath(root)
    p = os.path.realpath(path)
    return p == r or p.startswith(r + os.sep)


def check_plan_dest_path(cfg, dest_id, unit_id, plan_dest_path, guarded_root=None):
    """Returns the derived path, or raises PlanTargetError.

    The plan is allowed to AGREE and nothing else. A stale plan.json — written
    before the destination path changed in config.json — names a path the guard
    never cleared, and that is exactly the non-adversarial shape of this bug:
    the guard proves one path, the copier writes another.
    """
    derived = derive_dest_path(cfg, dest_id, unit_id)
    root = os.path.abspath(guarded_root or dest_by_id(cfg, dest_id)["path"])
    if not _under(root, derived):
        raise PlanTargetError(f"derived path {derived} is not under the guarded root {root}")
    if plan_dest_path is None:
        return derived
    given = os.path.abspath(plan_dest_path)
    if given == derived:
        return derived
    if not _under(root, given):
        raise PlanTargetError(
            f"plan.json routes {unit_id} to {given}, which is NOT under the destination the "
            f"guard cleared ({root}). Refusing: an intermediate file this pipeline wrote "
            f"earlier is data, not authority over where bytes land. Re-run plan.py.")
    raise PlanTargetError(
        f"plan.json routes {unit_id} to {given} but this config resolves it to {derived}. "
        f"The plan is stale or hand-edited; re-run plan.py.")


# --------------------------------------------------------------- io atoms

def ensure_state_dir(state_dir):
    os.makedirs(os.path.join(state_dir, RUNS), exist_ok=True)
    return state_dir


def atomic_write_json(path, data):
    """temp file + fsync + os.replace. There is no in-place mutation of a
    durable state file anywhere in this codebase."""
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    tmp = os.path.join(d, f".{os.path.basename(path)}.tmp.{os.getpid()}")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def escape_untrusted(s):
    """Filesystem- and marker-sourced strings are rendered as escaped data:
    a path containing newlines or ANSI escapes cannot forge a report line."""
    if s is None:
        return ""
    s = str(s)
    s = s.replace("\\", "\\\\").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
    return CONTROL.sub(lambda m: "\\x%02x" % ord(m.group()), s)


# ---------------------------------------------------------------- journal

class Journal:
    def __init__(self, state_dir, run_id):
        ensure_state_dir(state_dir)
        self.state_dir = state_dir
        self.run_id = run_id
        self.path = os.path.join(state_dir, RUNS, f"{run_id}.jsonl")

    def append(self, event, **fields):
        rec = {"event": event, "run_id": self.run_id, "ts": time.time(),
               "ts_iso": time.strftime("%Y-%m-%dT%H:%M:%S"), "pid": os.getpid()}
        rec.update(fields)
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            f.flush()
            os.fsync(f.fileno())
        return rec


def new_run_id():
    return time.strftime("%Y%m%d-%H%M%S") + f"-{os.getpid()}"


def set_current_run(state_dir, run_id):
    ensure_state_dir(state_dir)
    with open(os.path.join(state_dir, CURRENT_RUN), "w", encoding="utf-8") as f:
        f.write(run_id)
        f.flush()
        os.fsync(f.fileno())


def get_current_run(state_dir):
    p = os.path.join(state_dir, CURRENT_RUN)
    if os.path.exists(p):
        rid = open(p, encoding="utf-8").read().strip()
        if rid and os.path.exists(os.path.join(state_dir, RUNS, f"{rid}.jsonl")):
            return rid
        if rid:
            return rid
    rid = new_run_id()
    set_current_run(state_dir, rid)
    return rid


def read_events(state_dir, run_id=None):
    rd = os.path.join(state_dir, RUNS)
    if not os.path.isdir(rd):
        return []
    files = sorted(f for f in os.listdir(rd) if f.endswith(".jsonl"))
    if run_id:
        files = [f for f in files if f == f"{run_id}.jsonl"]
    out = []
    for fn in files:
        with open(os.path.join(rd, fn), encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    # a torn write damages exactly the last line; it is dropped,
                    # never half-interpreted
                    continue
    return out


def _run_events_by_file(state_dir):
    rd = os.path.join(state_dir, RUNS)
    out = {}
    if not os.path.isdir(rd):
        return out
    for fn in sorted(os.listdir(rd)):
        if not fn.endswith(".jsonl"):
            continue
        rid = fn[: -len(".jsonl")]
        evs = []
        for line in open(os.path.join(rd, fn), encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                evs.append(json.loads(line))
            except Exception:
                # a torn write damages exactly the last line; drop it
                continue
        out[rid] = evs
    return out


def classify_runs(state_dir):
    """ONE definition of 'run', used by every caller.

      EMPTY     the journal file exists with no parseable event — never started.
      ADMIN     a journal with no `run_start`: init_destination.py, a recorded
                rework signal. It never ran a chain, so it can never be torn.
      TORN      a run that ANNOUNCED a copy (`unit_copy_intent`) which never
                reached a passing `unit_verify_result` — anywhere in the ledger.
      COMPLETE  anything else: every announced copy reached a passing verify,
                or nothing was ever announced (a declined dry run).

    The old rule — COMPLETE iff any `run_end` event exists — was satisfied by
    the per-destination run_end verify.py writes for a destination it did
    nothing with, so a single benign line retro-certified an interrupted
    multi-destination run and its half-copied tree was trusted forever.
    """
    per_file = _run_events_by_file(state_dir)
    unretired = torn_units(state_dir)
    out = {}
    for rid, evs in per_file.items():
        if not evs:
            out[rid] = "EMPTY"
            continue
        if not any(e.get("event") == "run_start" for e in evs):
            out[rid] = "ADMIN"
            continue
        announced = {(e.get("unit"), e.get("dest")) for e in evs
                     if e.get("event") == "unit_copy_intent"}
        out[rid] = "TORN" if (announced & unretired) else "COMPLETE"
    return out


def torn_units(state_dir, exclude_run=None):
    """(unit, dest) pairs whose LATEST ledger evidence is an announced copy with
    no passing verify after it.

    Latest-wins is what retires a torn pair: a later run that copies and verifies
    the unit clears it. The previous implementation re-scanned each torn journal
    in isolation, so a pair could never be retired and one interrupted run
    condemned that unit to a full re-copy on every future run, for ever.
    """
    latest = {}
    for e in sorted(read_events(state_dir), key=lambda x: (x.get("ts", 0), x.get("event", ""))):
        if exclude_run and e.get("run_id") == exclude_run:
            continue
        ev = e.get("event")
        if ev == "unit_copy_intent":
            latest[(e.get("unit"), e.get("dest"))] = "announced"
        elif ev == "unit_verify_result" and e.get("ok"):
            latest[(e.get("unit"), e.get("dest"))] = "verified"
    return {k for k, v in latest.items() if v == "announced" and k[0]}


# ------------------------------------------------------------------ lock

class LockHeld(Exception):
    pass


def acquire_lock(state_dir, run_id, journal=None):
    ensure_state_dir(state_dir)
    path = os.path.join(state_dir, LOCK)
    me = {"pid": os.getpid(), "hostname": socket.gethostname(),
          "run_id": run_id, "started_at": time.time()}
    for _ in range(2):
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w") as f:
                json.dump(me, f)
                f.flush()
                os.fsync(f.fileno())
            return path
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
            try:
                held = json.load(open(path, encoding="utf-8"))
            except Exception:
                held = {}
            if _is_stale(held):
                os.unlink(path)
                if journal:
                    journal.append("lock_broken", broken=held,
                                   why="pid absent / same host / older than stale threshold")
                continue
            raise LockHeld(
                f"another run holds the lock: run_id={held.get('run_id')} "
                f"pid={held.get('pid')} host={held.get('hostname')} "
                f"started_at={held.get('started_at')}")
    raise LockHeld("could not acquire the lock")


def _is_stale(held):
    """LIVENESS FIRST. A running process never has its lock broken, however old
    the run is: the first real run is a full copy of ~35 GB to an unbenchmarked
    USB enclosure, which is precisely the run that can exceed six hours. The age
    threshold only decides what to do when the holder's identity is unusable."""
    if not held:
        return True
    if held.get("hostname") != socket.gethostname():
        return False          # another machine — never break it
    pid = held.get("pid")
    if isinstance(pid, int):
        try:
            os.kill(pid, 0)
            return False      # ALIVE — never stale, at any age
        except OSError as e:
            if e.errno == errno.ESRCH:
                return True   # the holder is gone
            return False      # EPERM: it exists and belongs to someone else
    # no usable pid: fall back to age alone
    return time.time() - float(held.get("started_at") or 0) > STALE_LOCK_SECONDS


def release_lock(path):
    try:
        os.unlink(path)
    except OSError:
        pass


# -------------------------------------------------------------- manifest

def read_manifest(state_dir):
    """Returns (data, readable). The manifest is a CACHE, never an authority:
    missing / unparseable state degrades to 'nothing known' and a full re-copy.
    The failure direction is always more work, never a false claim of safety."""
    path = os.path.join(state_dir, MANIFEST)
    if not os.path.exists(path):
        return {"schema_version": SCHEMA_VERSION, "entries": {}}, True
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        return {"schema_version": SCHEMA_VERSION, "entries": {}}, False
    if not isinstance(data, dict) or not isinstance(data.get("entries"), dict):
        return {"schema_version": SCHEMA_VERSION, "entries": {}}, False
    return data, True


def _load_manifest_for_write(state_dir):
    path = os.path.join(state_dir, MANIFEST)
    data, _readable = read_manifest(state_dir)
    if os.path.exists(path):
        raw = {}
        try:
            raw = json.load(open(path, encoding="utf-8"))
        except Exception:
            raw = {}
        if isinstance(raw, dict):
            major_check(raw.get("schema_version", SCHEMA_VERSION), MANIFEST)
            # unknown keys are preserved on rewrite so an older build cannot
            # silently destroy a newer one's fields
            data = dict(raw)
            data.setdefault("entries", {})
    data["schema_version"] = data.get("schema_version", SCHEMA_VERSION)
    data.setdefault("dirty", {})
    return path, data


def commit_manifest(state_dir, key, entry):
    """The ONLY way a unit becomes 'safe'. verify.py is its only caller.

    A successful commit also clears the unit's dirty mark: the destination has
    just been re-observed and found good."""
    path, data = _load_manifest_for_write(state_dir)
    data["entries"][key] = entry
    data.get("dirty", {}).pop(key, None)
    atomic_write_json(path, data)


def mark_dirty(state_dir, key, reason, force_checksum=False):
    """Record that the last observation of this (dest, unit) FAILED.

    The previous entry is left exactly as it was — the last known-good state
    stays true — but the next plan is required to re-copy rather than trust the
    fingerprint. Without this, 'run it again', the documented reaction to a red
    run, is provably useless: the source fingerprint still matches, so nothing
    is ever copied and the destination stays broken for ever."""
    path, data = _load_manifest_for_write(state_dir)
    data.setdefault("dirty", {})[key] = {
        "reason": reason, "force_checksum": bool(force_checksum),
        "marked_at": time.time(),
        "marked_at_iso": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    atomic_write_json(path, data)


def dirty_map(state_dir):
    data, readable = read_manifest(state_dir)
    d = data.get("dirty")
    return d if isinstance(d, dict) else {}


def apfs_cache(state_dir, ttl=120):
    """`diskutil apfs list -plist`, cached in the state directory for one run.
    The guard is write-free, so the cache is written HERE and handed to it with
    --plist; it is re-taken every run because a drive can be swapped between
    runs."""
    import subprocess
    ensure_state_dir(state_dir)
    path = os.path.join(state_dir, "apfs-cache.plist")
    try:
        if os.path.exists(path) and (time.time() - os.path.getmtime(path)) < ttl \
                and os.path.getsize(path) > 0:
            return path
    except OSError:
        pass
    try:
        out = subprocess.run(["/usr/sbin/diskutil", "apfs", "list", "-plist"],
                             capture_output=True, timeout=30).stdout
        if out:
            tmp = path + f".tmp.{os.getpid()}"
            with open(tmp, "wb") as f:
                f.write(out)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, path)
            return path
    except Exception:
        pass
    return path if os.path.exists(path) else None


def manifest_key(dest_id, unit_id):
    return f"{dest_id}::{unit_id}"


# ------------------------------------------------------------ fingerprint

FINGERPRINT_METHOD = "bytes+file_count+max_mtime+tree_digest"
FINGERPRINT_KEYS = ("bytes", "file_count", "max_mtime", "tree_digest")

VERIFY_LEVELS = ("L1", "L2", "L3", "L4")


def level_rank(level):
    try:
        return VERIFY_LEVELS.index(level)
    except ValueError:
        return -1


def weakest_level(levels):
    known = [x for x in levels if level_rank(x) >= 0]
    return min(known, key=level_rank) if known else None


def tree_digest(files):
    """sha256 over the sorted (relpath, size) list.

    bytes+file_count+max_mtime alone is blind to any change that preserves all
    three, and a pure RENAME is exactly such a change: same bytes, same count,
    and file mtimes are untouched by rename. The name list costs one hash over
    data the walk already collected — no extra I/O."""
    h = hashlib.sha256()
    for rel, size in sorted(files):
        h.update(os.fsencode(rel))
        h.update(b"\0")
        h.update(str(size).encode())
        h.update(b"\n")
    return h.hexdigest()


def fingerprint_equal(a, b):
    """Every component must match. A component missing on either side counts as
    a difference — an entry written by an older build with a weaker method is
    re-copied and re-verified rather than trusted. The failure direction is
    always more work, never a false claim of safety."""
    if not a or not b:
        return False
    return all(a.get(k) is not None and a.get(k) == b.get(k) for k in FINGERPRINT_KEYS)


def human_bytes(n):
    n = float(n or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024


# ------------------------------------------------------------- --selftest

def _selftest(state_dir):
    """Proves this module DISCRIMINATES: every check is fed a known-bad input
    and required to fail."""
    import shutil
    import tempfile
    tmp = state_dir or tempfile.mkdtemp(prefix="wsbk-state-selftest-")
    ensure_state_dir(tmp)
    fails = []

    # 1. atomic_write_json really replaces and really lands
    p = os.path.join(tmp, "x.json")
    atomic_write_json(p, {"a": 1})
    atomic_write_json(p, {"a": 2})
    if json.load(open(p))["a"] != 2:
        fails.append("atomic_write_json did not land the second write")
    if any(f.startswith(".x.json.tmp") for f in os.listdir(tmp)):
        fails.append("atomic_write_json left a temp file behind")

    # 2. major_check must REFUSE a newer major (known-bad input)
    try:
        major_check("99.0", "fixture")
        fails.append("major_check accepted a newer major schema version")
    except SchemaError:
        pass
    major_check("1.0", "fixture")

    # 2b. a state_dir inside a source root must be REFUSED (known-bad input:
    #     the natural 'keep the ledger with the project' config edit)
    cfgp = os.path.join(tmp, "cfg-selftest.json")
    src_root = os.path.join(tmp, "srcroot")
    os.makedirs(src_root, exist_ok=True)
    atomic_write_json(cfgp, {"schema_version": SCHEMA_VERSION,
                             "state_dir": os.path.join(src_root, ".wsbk"),
                             "source_roots": [src_root], "destinations": []})
    try:
        load_config(cfgp)
        fails.append("load_config accepted a state_dir inside a source root — an active writer "
                     "inside the tree INV-02 declares read-only")
    except ConfigError:
        pass
    atomic_write_json(cfgp, {"schema_version": SCHEMA_VERSION,
                             "state_dir": os.path.join(tmp, "outside"),
                             "source_roots": [src_root], "destinations": []})
    load_config(cfgp)
    os.unlink(cfgp)

    # 3. unreadable manifest degrades to nothing-known, never to partial trust
    with open(os.path.join(tmp, MANIFEST), "w") as f:
        f.write("{ not json")
    data, readable = read_manifest(tmp)
    if readable or data["entries"]:
        fails.append("an unparseable manifest was not degraded to 'nothing known'")
    os.unlink(os.path.join(tmp, MANIFEST))

    # 4. EMPTY / ADMIN / COMPLETE / TORN must be four distinguishable states,
    #    and a benign per-destination run_end must NOT certify a torn run
    j = Journal(tmp, "selftest-torn")
    j.append("run_start")
    j.append("unit_copy_intent", unit="u/x", dest="d1")
    j.append("run_end", dest="d2", why="OFFLINE")     # the exact benign line
    j2 = Journal(tmp, "selftest-done")
    j2.append("run_start")
    j2.append("unit_copy_intent", unit="u/y", dest="d1")
    j2.append("unit_verify_result", unit="u/y", dest="d1", ok=True)
    j3 = Journal(tmp, "selftest-dry")
    j3.append("run_start")
    j4 = Journal(tmp, "selftest-admin")
    j4.append("destination_initialised", dest="d1")
    open(os.path.join(tmp, RUNS, "selftest-empty.jsonl"), "w").close()
    got = classify_runs(tmp)
    want = {"selftest-torn": "TORN", "selftest-done": "COMPLETE", "selftest-empty": "EMPTY",
            "selftest-dry": "COMPLETE", "selftest-admin": "ADMIN"}
    for k, v in want.items():
        if got.get(k) != v:
            fails.append(f"classify_runs({k}) = {got.get(k)}, want {v}")
    if ("u/x", "d1") not in torn_units(tmp):
        fails.append("an announced-and-abandoned copy was not reported torn")
    if ("u/y", "d1") in torn_units(tmp):
        fails.append("a pair with a passing verify was still reported torn")
    # ... and a later passing verify RETIRES the torn pair
    j5 = Journal(tmp, "selftest-later")
    j5.append("run_start")
    j5.append("unit_verify_result", unit="u/x", dest="d1", ok=True)
    if ("u/x", "d1") in torn_units(tmp):
        fails.append("a torn pair verified by a LATER run was never retired")

    # 4b. the dirty mark must survive a commit for a DIFFERENT key and clear on
    #     a commit for its own
    mark_dirty(tmp, "d1::u/x", "verify failed", force_checksum=True)
    if not dirty_map(tmp).get("d1::u/x", {}).get("force_checksum"):
        fails.append("mark_dirty did not record a forced-checksum re-copy")
    commit_manifest(tmp, "d1::u/other", {"unit": "u/other"})
    if "d1::u/x" not in dirty_map(tmp):
        fails.append("committing another unit cleared an unrelated dirty mark")
    commit_manifest(tmp, "d1::u/x", {"unit": "u/x"})
    if "d1::u/x" in dirty_map(tmp):
        fails.append("a successful commit did not clear the unit's dirty mark")
    os.unlink(os.path.join(tmp, MANIFEST))

    # 4c. the write target comes from the config, and a plan that names anything
    #     else is REFUSED (known-bad input)
    cfg = {"_path": os.path.join(tmp, "config.json"),
           "destinations": [{"id": "local", "path": os.path.join(tmp, "DEST")}]}
    if derive_dest_path(cfg, "local", "src/u") != os.path.join(tmp, "DEST", "src", "u"):
        fails.append("derive_dest_path did not build the target from the config root")
    check_plan_dest_path(cfg, "local", "src/u", os.path.join(tmp, "DEST", "src", "u"))
    for bad in (os.path.join(tmp, "ELSEWHERE", "src", "u"),
                os.path.join(tmp, "DEST", "src", "OTHER"),
                os.path.join(tmp, "src", "u")):
        try:
            check_plan_dest_path(cfg, "local", "src/u", bad)
            fails.append(f"check_plan_dest_path accepted a plan pointing at {bad}")
        except PlanTargetError:
            pass

    # 5. a torn LINE must be dropped, not half-interpreted
    with open(os.path.join(tmp, RUNS, "selftest-torn.jsonl"), "a") as f:
        f.write('{"event": "unit_copy_res')
    evs = read_events(tmp, "selftest-torn")
    if any(e.get("event", "").startswith("unit_copy_res") for e in evs):
        fails.append("a torn journal line was interpreted instead of dropped")

    # 6. the lock must actually hold against a live holder
    lp = acquire_lock(tmp, "run-A")
    try:
        acquire_lock(tmp, "run-B")
        fails.append("a second acquire_lock succeeded while the lock was held")
    except LockHeld:
        pass
    release_lock(lp)
    lp2 = acquire_lock(tmp, "run-C")
    release_lock(lp2)

    # 7. a stale lock (dead pid, same host) must be breakable
    with open(os.path.join(tmp, LOCK), "w") as f:
        json.dump({"pid": 999999, "hostname": socket.gethostname(),
                   "run_id": "dead", "started_at": time.time()}, f)
    lp3 = acquire_lock(tmp, "run-D")
    release_lock(lp3)

    # 7b. a LIVE holder must never be evicted by age alone (known-bad input:
    #     an 8-hour-old lock held by this very process)
    with open(os.path.join(tmp, LOCK), "w") as f:
        json.dump({"pid": os.getpid(), "hostname": socket.gethostname(),
                   "run_id": "long-copy", "started_at": time.time() - 8 * 3600}, f)
    try:
        acquire_lock(tmp, "run-E")
        fails.append("an 8-hour-old lock held by a LIVE process was broken — two copiers "
                     "would write the same tree and both commit the memo")
    except LockHeld:
        pass
    os.unlink(os.path.join(tmp, LOCK))

    # 8. escaping must neutralise a report-forging filename
    ev = escape_untrusted("ok\n  ALL UNITS SAFE\x1b[32m")
    if "\n" in ev or "\x1b" in ev:
        fails.append("escape_untrusted let a control character through")

    # 9. fingerprint equality must be false on ANY differing component
    base = {"bytes": 1, "file_count": 2, "max_mtime": 3.0, "tree_digest": "abc"}
    for k in base:
        alt = dict(base)
        alt[k] = "zzz" if k == "tree_digest" else base[k] + 1
        if fingerprint_equal(base, alt):
            fails.append(f"fingerprint_equal ignored a change in {k}")
    if not fingerprint_equal(base, dict(base)):
        fails.append("fingerprint_equal rejected identical fingerprints")
    legacy = {"bytes": 1, "file_count": 2, "max_mtime": 3.0}
    if fingerprint_equal(base, legacy):
        fails.append("a fingerprint missing a component was treated as equal — a weaker "
                     "older method must degrade to 're-copy', never to 'unchanged'")

    # 9b. a pure RENAME must change the fingerprint (the case the old method missed)
    before = tree_digest([("a.txt", 10), ("b.txt", 20)])
    after = tree_digest([("a-v2.txt", 10), ("b.txt", 20)])
    if before == after:
        fails.append("tree_digest is blind to a rename")
    if before != tree_digest([("b.txt", 20), ("a.txt", 10)]):
        fails.append("tree_digest depends on walk order rather than on the tree")

    # 9c. the weakest level must win when destinations disagree
    if weakest_level(["L3", "L1", "L4"]) != "L1":
        fails.append("weakest_level did not pick the weakest claim")
    if weakest_level([]) is not None:
        fails.append("weakest_level invented a level out of nothing")

    if state_dir is None:
        shutil.rmtree(tmp, ignore_errors=True)
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("_state.py selftest: 15 checks (atomic write, schema refusal, unreadable memo, "
          "4-state run classification + torn retirement, dirty marks, plan-target refusal, "
          "torn line, live-lock never broken, escaping, fingerprint incl. rename, weakest "
          "level), each proven against a known-bad input")
    return 0


def main():
    args = sys.argv[1:]
    state_dir = None
    if "--state-dir" in args:
        state_dir = args[args.index("--state-dir") + 1]
    if "--selftest" in args:
        return _selftest(state_dir)
    if "--classify-runs" in args:
        sd = state_dir or os.path.expanduser("~/.workspace-backup")
        out = {"runs": classify_runs(sd),
               "torn_units": sorted([list(t) for t in torn_units(sd)])}
        print(json.dumps(out, indent=2))
        return 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main())
