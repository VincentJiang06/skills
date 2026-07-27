#!/usr/bin/env python3
"""verify.py — independently re-enumerate the destination, run the unit's verify
level, and be the ONLY component that commits a memo entry.

The destination is re-enumerated FROM THE FILESYSTEM, at a path DERIVED from the
config destination root + the unit id. The copy step's own record of what it
moved is not read, not passed in, and not available to this process — and
plan.json is not allowed to name the location either: a plan whose dest_path was
the source made this verifier agree with itself at L4 and commit "complete
byte-identity" with zero bytes copied.

Levels, and the exact claim each one earns:
  L1  re-stat: the destination exists and is non-empty. Never checksum evidence.
  L2  file count + total bytes match. Detects truncation and missing files,
      NOT in-place content corruption.
  L3  L2 + sampled SHA-256 (Class A default), over a sample that ROTATES per
      run, so coverage accumulates instead of re-checking one fixed tenth for
      ever. The rate is printed and the unit is never labelled fully checksummed.
  L4  L2 + SHA-256 of every non-excluded file. Opt-in, because hashing 35G on
      every run is how a backup tool stops being run at all.

Symlinks are compared by TARGET, not by opening them: a dangling link is a
faithful copy when both sides dangle the same way. Files the copier left behind
after an interruption (".NAME.XXXXXXXXXX") are reported, not counted as
corruption. Files present only at the destination are a FAILURE only when
delete-at-destination is on; otherwise they are the documented consequence of
one-way mirroring and are reported with their size.

A memo entry is committed only after the level PASSES, and it stores the level
ACTUALLY executed plus an observation of the DESTINATION, which is what lets the
next plan notice that the destination changed under it. A verify failure leaves
the previous entry untouched — the last known-good state stays true — and marks
the unit dirty so the next run re-copies instead of trusting the fingerprint.

Exit codes: 0 ok · 2 usage · 6 lock held · 8 schema refusal · 9 verify failures
            11 plan.json named a target the guard never cleared

Usage:
  verify.py --config C --plan plan.json --dest ID [--unit U] [--level L1..L4]
  verify.py --sample-report --json [--n N]
  verify.py --selftest
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import sys
import time

# running any of these by hand must not leave __pycache__ inside the shipped
# package; the internal spawns pass -B for the same reason
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _state  # noqa: E402
import inventory as inv_mod  # noqa: E402

SAMPLE_FRACTION = 0.10
SAMPLE_FLOOR = 8
XATTR_PROBE_MAX = 8
PLAN_TARGET_REFUSED = 11
TEMP_ARTIFACT = re.compile(r"^\.(?P<base>.+)\.[A-Za-z0-9]{6,12}$")


def sha256(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def sample_offset(n, run_id="", unit="", dest=""):
    """Deterministic for a given (run, unit, destination) — the same run always
    checks the same files, so a result is reproducible — but DIFFERENT across
    runs, so coverage accumulates. The old fixed stride hashed the same tenth of
    every unit for ever and never reached the alphabetically last files at all,
    while the report called it 'probabilistic'."""
    if n <= 0:
        return 0
    d = hashlib.sha256(f"{run_id}\0{unit}\0{dest}".encode("utf-8")).hexdigest()
    return int(d[:12], 16) % n


def sample_indices(n, offset=0):
    """Even spread, rotated by `offset`, and the LAST file always included.

    The old fixed stride had a structural tail blind spot: its maximum index was
    n - stride, so the alphabetically last files of every unit were never
    checked at any size, in any number of runs."""
    if n == 0:
        return []
    k = min(n, max(SAMPLE_FLOOR, int(math.ceil(n * SAMPLE_FRACTION))))
    idx = {(int(i * n / k) + offset) % n for i in range(k)}
    idx.add(n - 1)
    return sorted(idx)


def xattr_names(path):
    try:
        p = subprocess.run(["/usr/bin/xattr", path], capture_output=True, text=True, timeout=20)
        return sorted(x for x in (p.stdout or "").split() if x)
    except Exception:
        return None


def is_temp_artifact(rel):
    return bool(TEMP_ARTIFACT.match(os.path.basename(rel)))


def _copier_could_carry_xattrs(state_dir, unit_id, dest_id):
    """Could the COPIER carry extended attributes for this (unit, destination)?

    This deliberately reads only the copier's CAPABILITY record
    (`xattr_flag_failed_on_corpus`), never its result record. The distinction is
    the architectural one L0-05 defends: verify must never take the copier's
    word for WHAT LANDED — that is the self-agreeing verifier this whole design
    exists to prevent — but "which flags did the tool manage to use" is a fact
    about the tool, not evidence about the destination. Every claim about the
    destination is still made by walking it.

    Fail-closed: anything unreadable, absent, or ambiguous returns True, so a
    missing journal can only ever make verification STRICTER, never weaker."""
    try:
        events = _state.read_events(state_dir)
    except Exception:
        return True
    for e in events:
        if (e.get("event") == "xattr_flag_failed_on_corpus"
                and e.get("unit") == unit_id and e.get("dest") == dest_id):
            return False
    return True


def verify_unit(src_path, dst_path, exclusions, level, delete_on=False,
                run_id="", unit_id="", dest_id="", xattr_check=True,
                xattrs_expected=True):
    """Both sides are walked here, now, from the filesystem."""
    out = {"level_executed": level, "ok": False, "mismatches": [], "notes": [],
           "sample_rate": None, "checked_files": 0, "src_files": 0, "dst_files": 0,
           "src_bytes": 0, "dst_bytes": 0, "content_mismatch": False,
           "temp_artifacts": [], "extra_files": [], "extra_bytes": 0,
           "dest_fingerprint": None}
    if not os.path.isdir(dst_path):
        out["mismatches"].append(f"MISSING destination directory {_state.escape_untrusted(dst_path)}")
        return out
    if not os.path.isdir(src_path):
        # 0.2.0 coerced a missing source to an EMPTY source, compared nothing to
        # nothing, passed, and committed a memo entry — so a source root that
        # unmounted mid-run printed SAFE over a destination holding nothing.
        # Absence of evidence is not evidence of safety: a source we cannot read
        # is unverifiable, never verified (L4-30).
        out["mismatches"].append(
            f"SOURCE UNREADABLE {_state.escape_untrusted(src_path)} — it vanished or "
            f"unmounted between the plan and this check, so nothing can be compared "
            f"and no verify level can be claimed")
        return out
    smeas = inv_mod.walk_unit(src_path, exclusions)
    dmeas = inv_mod.walk_unit(dst_path, exclusions)
    out["src_files"], out["dst_files"] = smeas["file_count"], dmeas["file_count"]
    out["src_bytes"], out["dst_bytes"] = smeas["bytes"], dmeas["bytes"]
    out["dest_fingerprint"] = {
        "bytes": dmeas["bytes"], "file_count": dmeas["file_count"],
        "max_mtime": dmeas["max_mtime"], "tree_digest": _state.tree_digest(dmeas["files"]),
        "method": _state.FINGERPRINT_METHOD, "taken_at": time.time()}

    if level == "L1":
        out["ok"] = dmeas["file_count"] > 0 or smeas["file_count"] == 0
        if not out["ok"]:
            out["mismatches"].append("the destination directory is empty while the source is not")
        if dmeas["file_count"] < smeas["file_count"]:
            out["notes"].append(
                f"L1 DOES NOT COMPARE CONTENTS: the destination holds {dmeas['file_count']} "
                f"file(s) where the source holds {smeas['file_count']}. L1 passes on any "
                f"non-empty directory — this line is the only warning you get.")
        return out

    srcmap = dict(smeas["files"])
    dstmap = dict(dmeas["files"])
    missing = sorted(set(srcmap) - set(dstmap))
    extra = sorted(set(dstmap) - set(srcmap))
    for m in missing[:20]:
        out["mismatches"].append(f"MISSING at destination: {_state.escape_untrusted(m)}")
    for m in extra:
        if is_temp_artifact(m):
            out["temp_artifacts"].append(m)
        else:
            out["extra_files"].append(m)
            out["extra_bytes"] += int(dstmap.get(m) or 0)
    if out["temp_artifacts"]:
        out["notes"].append(
            f"{len(out['temp_artifacts'])} file(s) left behind by an interrupted copier "
            f"({', '.join(_state.escape_untrusted(t) for t in out['temp_artifacts'][:3])}). "
            f"They are copier debris, not a difference in your data; the next --go run sweeps "
            f"them.")
    if out["extra_files"]:
        if delete_on:
            for m in out["extra_files"][:20]:
                out["mismatches"].append(f"UNEXPECTED at destination: {_state.escape_untrusted(m)}")
        else:
            out["notes"].append(
                f"{len(out['extra_files'])} file(s) exist at the destination and no longer in "
                f"the source ({_state.human_bytes(out['extra_bytes'])}), because "
                f"delete-at-destination is off. That is the documented one-way behaviour, not a "
                f"failure: {', '.join(_state.escape_untrusted(m) for m in out['extra_files'][:3])}")
    for rel in sorted(set(srcmap) & set(dstmap)):
        if srcmap[rel] != dstmap[rel]:
            out["mismatches"].append(
                f"SIZE MISMATCH {_state.escape_untrusted(rel)}: "
                f"{srcmap[rel]} vs {dstmap[rel]}")
    if level == "L2":
        out["ok"] = not out["mismatches"]
        return out

    common = sorted(set(srcmap) & set(dstmap))
    if level == "L4":
        chosen = common
    else:
        chosen = [common[i] for i in
                  sample_indices(len(common), sample_offset(len(common), run_id, unit_id, dest_id))]
    out["sample_rate"] = (len(chosen) / len(common)) if common else 1.0
    out["checked_files"] = len(chosen)
    probed = 0
    for rel in chosen:
        s = os.path.join(src_path, rel)
        d = os.path.join(dst_path, rel)
        if os.path.islink(s) or os.path.islink(d):
            # a dangling link is a faithful copy when both sides dangle the same
            # way; opening it made every stale worktree link a permanent failure
            try:
                ts, td = os.readlink(s), os.readlink(d)
            except OSError as e:
                out["mismatches"].append(f"SYMLINK UNREADABLE {_state.escape_untrusted(rel)}: {e}")
                continue
            if ts != td:
                out["content_mismatch"] = True
                out["mismatches"].append(
                    f"SYMLINK TARGET MISMATCH {_state.escape_untrusted(rel)}: "
                    f"{_state.escape_untrusted(ts)} vs {_state.escape_untrusted(td)}")
            continue
        try:
            h_src = sha256(s)
            h_dst = sha256(d)
        except OSError as e:
            out["mismatches"].append(f"UNREADABLE {_state.escape_untrusted(rel)}: {e}")
            continue
        if not (h_src == h_dst):
            out["content_mismatch"] = True
            out["mismatches"].append(
                f"CHECKSUM MISMATCH {_state.escape_untrusted(rel)}: "
                f"{h_src[:16]} vs {h_dst[:16]} (size and mtime can agree while content does not)")
            continue
        if xattr_check and probed < XATTR_PROBE_MAX:
            probed += 1
            xs, xd = xattr_names(s), xattr_names(d)
            if xs is not None and xd is not None and set(xs) - set(xd):
                lost = sorted(set(xs) - set(xd))
                if not xattrs_expected:
                    # The copier told us, in this run's journal, that it could not
                    # carry xattrs for this unit (com.apple.macl and friends make
                    # -E fail outright). Their absence is then the KNOWN, ALREADY
                    # REPORTED consequence of a deliberate fallback — not a
                    # difference re-copying could ever repair. Failing it would
                    # produce a permanent false alarm that re-copies the unit on
                    # every run and teaches the reader to ignore the report; the
                    # report is the entire product, so it is stated, not counted.
                    if len(out["notes"]) < 4:
                        out["notes"].append(
                            f"extended attributes not preserved for "
                            f"{_state.escape_untrusted(rel)}: {lost} — the copier could not "
                            f"carry them for this unit and said so; the data fork is verified, "
                            f"the metadata is knowingly not (L4-32)")
                else:
                    out["content_mismatch"] = True
                    out["mismatches"].append(
                        f"EXTENDED ATTRIBUTES LOST {_state.escape_untrusted(rel)}: "
                        f"{lost} present at the source, absent at the "
                        f"destination (a data-fork checksum cannot see this)")
    out["ok"] = not out["mismatches"]
    return out


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    if "--sample-report" in args:
        n = int(args[args.index("--n") + 1]) if "--n" in args else 100
        rounds = [sample_indices(n, sample_offset(n, f"run-{i}", "src/u", "local"))
                  for i in range(6)]
        again = sample_indices(n, sample_offset(n, "run-0", "src/u", "local"))
        print(json.dumps({"n": n, "runs": rounds, "deterministic": again == rounds[0],
                          "per_run": len(rounds[0]),
                          "covered": len(set().union(*[set(r) for r in rounds]))}, indent=2))
        return 0
    if "--config" not in args or "--plan" not in args or "--dest" not in args:
        print(__doc__, file=sys.stderr)
        return 2
    cfg = _state.load_config(args[args.index("--config") + 1])
    plan = json.load(open(args[args.index("--plan") + 1], encoding="utf-8"))
    dest_id = args[args.index("--dest") + 1]
    only_unit = args[args.index("--unit") + 1] if "--unit" in args else None
    level_override = args[args.index("--level") + 1] if "--level" in args else None

    state = _state.ensure_state_dir(cfg["state_dir"])
    run_id = plan.get("run_id") or _state.get_current_run(state)
    j = _state.Journal(state, run_id)
    xattr_check = bool(cfg.get("xattr_check", True))
    delete_on = bool(cfg.get("delete_at_destination"))

    # Refuse to write over a memo written by a newer major schema, BEFORE
    # anything else happens.
    mpath = os.path.join(state, _state.MANIFEST)
    if os.path.exists(mpath):
        try:
            raw = json.load(open(mpath, encoding="utf-8"))
            if isinstance(raw, dict):
                _state.major_check(raw.get("schema_version", _state.SCHEMA_VERSION),
                                   _state.MANIFEST)
        except _state.SchemaError as e:
            print(f"REFUSING TO WRITE: {e}", file=sys.stderr)
            j.append("schema_refusal", detail=str(e))
            return 8
        except Exception:
            pass

    d = plan.get("destinations", {}).get(dest_id)
    if d is None:
        print(f"plan.json has no destination {dest_id!r}", file=sys.stderr)
        return 2
    if d["state"] != "CLEAR":
        print(f"{dest_id}: {d['state']} — nothing to verify there this run.")
        j.append("dest_verify_end", dest=dest_id, verified=0, failed=0, why=d["state"])
        return 0

    try:
        lock = _state.acquire_lock(state, run_id, j)
    except _state.LockHeld as e:
        print(f"REFUSING: {e}", file=sys.stderr)
        return 6

    failures, verified = 0, 0
    try:
        for u in plan["units"]:
            if only_unit and u["id"] != only_unit:
                continue
            route = (u.get("routes") or {}).get(dest_id)
            if not route or route.get("refused"):
                continue
            # A unit is verified when it was (re)copied this run, and ALSO when
            # the plan asked for a content re-check — Class A's fingerprint can
            # say "unchanged" for an mtime-preserving in-place edit, so the cheap
            # answer is never the last word for an irreplaceable unit.
            if not route["changed"] and not route.get(
                    "recheck_required", u.get("recheck_required")):
                continue
            try:
                dest_path = _state.check_plan_dest_path(cfg, dest_id, u["id"],
                                                        route.get("dest_path"))
            except _state.PlanTargetError as e:
                print(f"REFUSING TO VERIFY: {e}", file=sys.stderr)
                j.append("plan_target_refused", unit=u["id"], dest=dest_id, detail=str(e))
                return PLAN_TARGET_REFUSED
            configured = route["verify_level"]
            level = level_override or configured
            if level_override and _state.level_rank(level_override) < _state.level_rank(configured):
                j.append("verify_level_downgrade", unit=u["id"], dest=dest_id,
                         level_configured=configured, level_executed=level_override,
                         why=("an operator asked for a level BELOW the one this unit's class "
                              "requires; recorded so a cheap pass can never be mistaken for the "
                              "configured claim"))
            # Did the copier manage to carry extended attributes for THIS unit?
            # It records the answer per unit; a fallback copy (see copy.py's
            # xattr retry) sets it False, and verify must not then fail the unit
            # for the very loss the copier already reported (L4-32).
            xattrs_expected = _copier_could_carry_xattrs(state, u["id"], dest_id)
            res = verify_unit(u["path"], dest_path, cfg.get("exclusions", []), level,
                              delete_on=delete_on, run_id=run_id, unit_id=u["id"],
                              dest_id=dest_id, xattr_check=xattr_check,
                              xattrs_expected=xattrs_expected)
            ok = res["ok"]
            j.append("unit_verify_result", unit=u["id"], dest=dest_id,
                     dest_path=dest_path,
                     level_configured=configured, level_executed=res["level_executed"],
                     level_override=level_override,
                     ok=ok, sample_rate=res["sample_rate"],
                     checked_files=res["checked_files"],
                     src_files=res["src_files"], dst_files=res["dst_files"],
                     src_bytes=res["src_bytes"], dst_bytes=res["dst_bytes"],
                     mismatches=res["mismatches"][:40],
                     notes=res["notes"][:10],
                     temp_artifacts=res["temp_artifacts"][:20],
                     extra_files=res["extra_files"][:20], extra_bytes=res["extra_bytes"],
                     dest_fingerprint=res["dest_fingerprint"],
                     recheck_only=bool(not route["changed"]))
            if ok:
                verified += 1
                _state.commit_manifest(state, _state.manifest_key(dest_id, u["id"]), {
                    "unit": u["id"], "dest": dest_id, "dest_path": dest_path,
                    "fingerprint": u.get("fingerprint"),
                    "dest_fingerprint": res["dest_fingerprint"],
                    "verify_level": res["level_executed"],
                    "sample_rate": res["sample_rate"],
                    "checksum_verified": res["level_executed"] in ("L3", "L4"),
                    "complete_checksum": res["level_executed"] == "L4",
                    "copier": route["copier"],
                    "class": u["class"],
                    "file_count": res["dst_files"], "bytes": res["dst_bytes"],
                    "extra_files_at_destination": len(res["extra_files"]),
                    "committed_at": time.time(),
                    "committed_at_iso": time.strftime("%Y-%m-%dT%H:%M:%S"),
                })
                print(f"  ok   {_state.escape_untrusted(u['id'])}  verified {res['level_executed']}"
                      + (f" (sampled {res['sample_rate'] * 100:.0f}% of files, rotating)"
                         if res["sample_rate"] is not None and res["level_executed"] == "L3" else ""))
                for n in res["notes"][:3]:
                    print(f"       note: {n}")
            else:
                failures += 1
                _state.mark_dirty(state, _state.manifest_key(dest_id, u["id"]),
                                  reason=(res["mismatches"][:1] or ["verify failed"])[0],
                                  force_checksum=res["content_mismatch"])
                print(f"  FAIL {_state.escape_untrusted(u['id'])}  {res['level_executed']} — "
                      f"{len(res['mismatches'])} problem(s); the previous memo entry is left "
                      f"untouched, this unit is NOT safe, and the next run will re-copy it")
                for m in res["mismatches"][:6]:
                    print(f"       {m}")
    finally:
        _state.release_lock(lock)
        j.append("dest_verify_end", dest=dest_id, verified=verified, failed=failures)

    if failures:
        print(f"{failures} unit(s) FAILED verification at {dest_id}. The run is NOT a success.",
              file=sys.stderr)
    return 9 if failures else 0


def _selftest():
    """Detection first: every check is proven against a deliberately corrupted
    destination, because a verifier that cannot fail is worse than none."""
    import shutil
    import tempfile
    tmp = tempfile.mkdtemp(prefix="wsbk-verify-selftest-")
    fails = []
    try:
        s = os.path.join(tmp, "s")
        d = os.path.join(tmp, "d")
        os.makedirs(os.path.join(s, "sub"))
        os.makedirs(os.path.join(d, "sub"))
        for i in range(30):
            for root in (s, d):
                with open(os.path.join(root, "sub", f"f{i:02d}.txt"), "w") as f:
                    f.write(f"content-{i}\n")

        # 1. a faithful copy passes at every level
        for lvl in ("L1", "L2", "L3", "L4"):
            r = verify_unit(s, d, [], lvl)
            if not r["ok"]:
                fails.append(f"a faithful copy failed at {lvl}: {r['mismatches'][:2]}")

        # 2. a size- and mtime-preserving mutation: L2 must MISS it, L4 must CATCH it.
        #    (If L2 'caught' it, the test would be lying about what L2 proves.)
        victim = os.path.join(d, "sub", "f07.txt")
        st = os.stat(victim)
        orig = open(victim, "rb").read()
        with open(victim, "wb") as f:
            f.write(b"Z" * len(orig))
        os.utime(victim, (st.st_atime, st.st_mtime))
        if not verify_unit(s, d, [], "L2")["ok"]:
            fails.append("L2 claimed to detect an in-place mutation — it cannot, and the report "
                         "must not imply it can")
        r4 = verify_unit(s, d, [], "L4")
        if r4["ok"]:
            fails.append("L4 did NOT detect a size- and mtime-preserving mutation")
        if not r4["content_mismatch"]:
            fails.append("a content mismatch was not marked as one, so the next run would not "
                         "force a checksum re-copy and rsync's quick check would skip the file")
        with open(victim, "wb") as f:
            f.write(orig)
        os.utime(victim, (st.st_atime, st.st_mtime))

        # 3. a missing destination file must be caught by re-enumeration alone
        os.unlink(os.path.join(d, "sub", "f11.txt"))
        r = verify_unit(s, d, [], "L2")
        if r["ok"] or not any("MISSING" in m for m in r["mismatches"]):
            fails.append("a file missing at the destination was not detected")
        with open(os.path.join(d, "sub", "f11.txt"), "w") as f:
            f.write("content-11\n")

        # 4. a truncated file must be caught
        with open(os.path.join(d, "sub", "f03.txt"), "w") as f:
            f.write("con")
        r = verify_unit(s, d, [], "L2")
        if r["ok"]:
            fails.append("a truncated destination file was not detected")
        with open(os.path.join(d, "sub", "f03.txt"), "w") as f:
            f.write("content-3\n")

        # 5. an absent destination directory must fail, never pass vacuously
        r = verify_unit(s, os.path.join(tmp, "nope"), [], "L4")
        if r["ok"]:
            fails.append("an absent destination directory passed verification")

        # 6. L3 must declare a real sample, not silently become L4
        r = verify_unit(s, d, [], "L3")
        if not (0 < r["sample_rate"] < 1):
            fails.append(f"L3 on 30 files reported sample_rate={r['sample_rate']} — "
                         f"a full sample must not be sold as a sample")
        r4 = verify_unit(s, d, [], "L4")
        if r4["sample_rate"] != 1.0:
            fails.append("L4 did not report a complete sample")

        # 7. the sampler must be deterministic for one run and ROTATE across runs
        if sample_indices(30, 3) != sample_indices(30, 3):
            fails.append("the sampler is not deterministic")
        if len(sample_indices(1000, 0)) < 100:
            fails.append("the sampler does not scale to 10% on a large unit")
        offs = {sample_offset(100, f"run-{i}", "u", "dest") for i in range(8)}
        if len(offs) < 4:
            fails.append(f"the per-run offset barely moves ({offs}) — coverage never accumulates")
        union = set()
        for i in range(8):
            union |= set(sample_indices(100, sample_offset(100, f"run-{i}", "u", "dest")))
        if len(union) <= len(sample_indices(100, 0)):
            fails.append(f"8 runs still cover only {len(union)}/100 files")
        if any(99 not in sample_indices(100, o) for o in range(10)):
            fails.append("the last file is not always sampled (structural tail blind spot)")
        if len(sample_indices(100, 0)) < 10:
            fails.append("the sample fell below the declared 10%")

        # 8. copier debris must NOT be a failure, but a real extra file must be
        #    one when delete-at-destination is on (known-bad inputs, both ways)
        with open(os.path.join(d, "sub", ".f00.txt.xdt2Z6kA96"), "w") as f:
            f.write("orphaned by a killed copier")
        r = verify_unit(s, d, [], "L2")
        if not r["ok"]:
            fails.append(f"the copier's own temp file failed the unit: {r['mismatches'][:2]}")
        if not r["temp_artifacts"] or not r["notes"]:
            fails.append("copier debris was tolerated SILENTLY instead of being reported")
        with open(os.path.join(d, "sub", "stray.txt"), "w") as f:
            f.write("no longer in the source")
        if not verify_unit(s, d, [], "L2")["ok"]:
            fails.append("an extra destination file failed the unit although "
                         "delete-at-destination is off — every source deletion would wedge it")
        if verify_unit(s, d, [], "L2", delete_on=True)["ok"]:
            fails.append("with delete-at-destination ON, an extra destination file was accepted")
        os.unlink(os.path.join(d, "sub", "stray.txt"))
        os.unlink(os.path.join(d, "sub", ".f00.txt.xdt2Z6kA96"))

        # 9. symlinks are compared by target
        os.symlink("/nonexistent/target", os.path.join(s, "sub", "broken.lnk"))
        os.symlink("/nonexistent/target", os.path.join(d, "sub", "broken.lnk"))
        if not verify_unit(s, d, [], "L4")["ok"]:
            fails.append("a faithfully copied dangling symlink failed verification")
        os.unlink(os.path.join(d, "sub", "broken.lnk"))
        os.symlink("/somewhere/else", os.path.join(d, "sub", "broken.lnk"))
        r = verify_unit(s, d, [], "L4")
        if r["ok"] or not any("SYMLINK" in m for m in r["mismatches"]):
            fails.append("a retargeted symlink at the destination was not detected")
        os.unlink(os.path.join(s, "sub", "broken.lnk"))
        os.unlink(os.path.join(d, "sub", "broken.lnk"))

        # 10. the destination observation must be recorded and must react to loss
        before = verify_unit(s, d, [], "L2")["dest_fingerprint"]
        if not before or not before.get("tree_digest"):
            fails.append("no destination observation was recorded, so the next plan could not "
                         "notice the destination changing under it")
        os.unlink(os.path.join(d, "sub", "f21.txt"))
        after = verify_unit(s, d, [], "L2")["dest_fingerprint"]
        if _state.fingerprint_equal(before, after):
            fails.append("the destination observation did not react to a deleted file")
        with open(os.path.join(d, "sub", "f21.txt"), "w") as f:
            f.write("content-21\n")

        # 11. an xattr present at the source and missing at the destination must
        #     be caught — a data-fork checksum cannot see it
        target = os.path.join(s, "sub", "f00.txt")
        if subprocess.run(["/usr/bin/xattr", "-w", "com.test.fidelity", "V", target],
                          capture_output=True).returncode == 0:
            r = verify_unit(s, d, [], "L4")
            if r["ok"]:
                fails.append("extended-attribute loss at the destination passed L4")
            subprocess.run(["/usr/bin/xattr", "-w", "com.test.fidelity", "V",
                            os.path.join(d, "sub", "f00.txt")], capture_output=True)
            if not verify_unit(s, d, [], "L4")["ok"]:
                fails.append("a faithful xattr copy was reported as a mismatch")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("verify.py selftest: 11 checks — faithful copy at 4 levels, L2-misses/L4-catches an "
          "in-place mutation, missing file, truncation, absent destination, honest L3 sampling "
          "that rotates and reaches the tail, copier debris vs a real extra file both ways, "
          "symlink-by-target, destination observation, xattr loss")
    return 0


if __name__ == "__main__":
    sys.exit(main())
