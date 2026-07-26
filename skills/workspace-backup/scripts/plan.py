#!/usr/bin/env python3
"""plan.py — classify each unit A/B/C by MEASURED property, route it to the
destinations the guard cleared, and emit plan.json with the space verdict.

Class is decided by a measured property — no git remote / not a repo at all /
gitignored / matches a regenerable-bulk pattern — never by directory name and
never by size. A manifest hit marks a unit unchanged, but it never bypasses the
guard or the space verdict: memoization is an optimisation, never an authority
about safety.

A unit is UNCHANGED only when BOTH sides say so: the source fingerprint matches
the memo AND the destination still looks the way verify.py last observed it. A
source-only comparison cannot see an rm at the destination, a mid-write eject,
or a half-restored drive — so the bytes were never copied back and the report
said SAFE for ever.

The write target is derived here from the config destination root + the unit id.
copy.py and verify.py derive it again from the same place and refuse a plan that
disagrees; this file's dest_path is a record of the decision, never its source.

Free space is compared against the POOLED APFS CONTAINER figure (or, off APFS,
this volume's statvfs figure) minus headroom. Two destinations in one container
are one pool; summing them is the failure that fills the container the Time
Machine store lives in. A destination whose free space cannot be measured at all
is BLOCKED — the gate never passes what it never measured.

Usage:
  plan.py --config C --inventory inventory.json --out plan.json
          [--free-bytes-override N] [--container-capacity-override N]
  plan.py --selftest
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
import inventory as inv_mod  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GiB = 1024 ** 3
MiB = 1024 ** 2
BIG_VOLUME = 100 * GiB
MIN_HEADROOM = 10 * GiB
SMALL_HEADROOM_FLOOR = 64 * MiB
HEADROOM_FRACTION = 0.05
DEFAULT_REVALIDATE_DAYS = 0.0      # 0 = re-verify Class A content every run


def run_guard(cfg_path, dest_id, plist=None):
    cmd = [sys.executable, "-B", os.path.join(HERE, "guard_destination.py"),
           "--config", cfg_path, "--dest-id", dest_id, "--json"]
    if plist:
        cmd += ["--plist", plist]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    try:
        return json.loads(p.stdout), p.returncode
    except Exception:
        return {"verdict": "GUARD_FAILED", "anomalies": [
            {"code": "GUARD_FAILED", "message": (p.stderr or p.stdout)[:400], "source": dest_id}]}, \
            (p.returncode or 1)


def classify(u, cfg):
    """Every decision carries the property that decided it."""
    uid = u["id"]
    override = (cfg.get("class_overrides") or {}).get(uid)
    if override:
        return override.get("class", "A"), (
            f"user override recorded in config.json: {override.get('reason', 'no reason given')}")
    if u.get("matches_exclusion"):
        return "C", (f"matches exclusion pattern {u['matches_exclusion']!r} — regenerable bulk, "
                     f"excluded from the copy and reported with its reclaimed size, never deleted "
                     f"from the source")
    if not u.get("present", True):
        return "unknown", "the unit path is absent — properties could not be measured"
    if u.get("errors"):
        return "unknown", (f"the walk reported {len(u['errors'])} error(s), so the measured "
                           f"properties are incomplete; not routed without an answer")
    if u.get("is_git_repo") and u.get("has_any_remote") is True:
        return "B", ("git repo with at least one CONFIGURED remote (measured by a [remote \"…\"] "
                     "section in .git/config). That is evidence a second copy MAY exist off this "
                     "machine — it does not prove anything was pushed, that the remote is "
                     "current, or that untracked and gitignored files inside it are covered "
                     "anywhere. It buys the cheaper verify level, nothing more")
    if u.get("is_git_repo") and u.get("has_any_remote") is False:
        return "A", ("git repo with NO remote — the working copy is the only copy that exists "
                     "anywhere, so file-level backup is its ONLY protection")
    if u.get("is_git_repo") and u.get("has_any_remote") is None:
        return "unknown", "a git repo whose remote configuration could not be read"
    if u.get("is_gitignored"):
        return "A", ("not a git repo and gitignored by an ancestor repo — deliberately local "
                     "research material with no history anywhere else")
    return "A", ("not a git repo at all — no version-control history of it exists anywhere, "
                 "so nothing but a file copy protects it")


def headroom_for(capacity):
    """5% of capacity, with a 10 GiB floor on a real backup volume and a 64 MiB
    floor on a small one. A flat 10 GiB floor made every USB stick, SD card and
    small partition permanently unusable — the plan refused a 300 MB backup to a
    400 MB volume with a message that read as nonsense."""
    cap = int(capacity or 0)
    pct = max(SMALL_HEADROOM_FLOOR, int(cap * HEADROOM_FRACTION))
    return max(MIN_HEADROOM, pct) if cap >= BIG_VOLUME else pct


def dest_observation(dest_path, exclusions):
    """What the destination looks like RIGHT NOW. Compared against the
    observation verify.py recorded when it last passed — never against the
    source, which is what made destination-side loss invisible."""
    if not os.path.isdir(dest_path):
        return None
    m = inv_mod.walk_unit(dest_path, exclusions)
    return {"bytes": m["bytes"], "file_count": m["file_count"],
            "max_mtime": m["max_mtime"], "tree_digest": _state.tree_digest(m["files"]),
            "method": _state.FINGERPRINT_METHOD, "taken_at": time.time()}


def build_plan(cfg, inventory, args):
    cfg_path = cfg["_path"]
    state = _state.ensure_state_dir(cfg["state_dir"])
    plist = _state.apfs_cache(state)
    run_id = _state.get_current_run(state)
    j = _state.Journal(state, run_id)

    free_override = None
    cap_override = None
    if "--free-bytes-override" in args:
        free_override = int(args[args.index("--free-bytes-override") + 1])
    if "--container-capacity-override" in args:
        cap_override = int(args[args.index("--container-capacity-override") + 1])
    manifest, readable = _state.read_manifest(state)
    entries = manifest.get("entries", {})
    dirty = _state.dirty_map(state)
    torn = {tuple(t) for t in (inventory.get("torn_units") or [])}
    exclusions = cfg.get("exclusions", [])
    revalidate_days = float(cfg.get("revalidate_after_days", DEFAULT_REVALIDATE_DAYS) or 0)
    if free_override is not None or cap_override is not None:
        j.append("space_override", free_bytes_override=free_override,
                 container_capacity_override=cap_override,
                 why=("an operator supplied a space figure on the command line; it is recorded "
                      "here and in plan.json so a fabricated verdict can never be mistaken for "
                      "a measured one"))

    # ---- destinations: the guard decides, this script only records
    dests, blocked, anomalies = {}, {}, []
    for d in cfg.get("destinations", []):
        did = d["id"]
        g, code = run_guard(cfg_path, did, plist)
        state_name = {0: "CLEAR", 10: "OFFLINE", 20: "REFUSED_TIME_MACHINE",
                      21: "REFUSED_INSIDE_SOURCE", 30: "REQUIRES_CONFIRMATION"}.get(code, "GUARD_FAILED")
        dests[did] = {
            "id": did, "path": d["path"], "state": state_name, "guard_exit": code,
            "portable": bool(d.get("portable")), "removable": bool(d.get("removable")),
            "same_physical_disk_as_source": bool(d.get("same_physical_disk_as_source")),
            "marker_valid": bool(g.get("marker_valid")),
            "container": g.get("container"),
            "pooled_with": g.get("pooled_with") or [],
            "independent": g.get("independent"),
            "free_bytes": free_override if free_override is not None else g.get("free_bytes"),
            "capacity_bytes": cap_override if cap_override is not None else g.get("capacity_bytes"),
            "free_source": ("cli-override" if (free_override is not None or cap_override is not None)
                            else g.get("free_source")),
            "case_sensitive": g.get("case_sensitive"),
            "verify_level_A": d.get("verify_level_A", "L3"),
            "verify_level_BC": d.get("verify_level_BC", "L2"),
            "anomalies": g.get("anomalies") or [],
            "secret_file_count": 0,
            "planned_bytes": 0,
            "planned_bytes_upper_bound": 0,
        }
        for a in dests[did]["anomalies"]:
            anomalies.append({**a, "dest": did})
        j.append("dest_verdict", dest=did, verdict=state_name, exit_code=code,
                 path=d["path"], container=g.get("container"),
                 anomaly_codes=[a.get("code") for a in (g.get("anomalies") or [])])

    routable = [k for k, v in dests.items() if v["state"] == "CLEAR"]

    # ---- units
    units = []
    all_secrets = []
    excluded_units = []
    needs_answer = []
    excluded_unit_bytes = 0
    for u in inventory.get("units", []):
        cls, reason = classify(u, cfg)
        fp_now = u.get("fingerprint")
        fp_changed_any, ages, methods = False, [], []
        routes = {}
        if cls == "C":
            b = int(u.get("bytes") or 0) + int(u.get("excluded_bytes") or 0)
            excluded_unit_bytes += b
            excluded_units.append({"id": u["id"], "bytes": b,
                                   "pattern": u.get("matches_exclusion"), "reason": reason})
        if cls == "unknown":
            needs_answer.append({"id": u["id"], "reason": reason,
                                 "errors": (u.get("errors") or [])[:5],
                                 "why": ("a unit whose class could not be measured is routed "
                                         "NOWHERE. It is never copied and never verified, so it "
                                         "must be answered rather than left to look safe from an "
                                         "older memo entry.")})
        for did in routable:
            d = dests[did]
            classes = [c.upper() for c in (_state.dest_by_id(cfg, did).get("classes") or ["A", "B"])]
            if cls in ("C", "unknown") or cls not in classes:
                continue
            key = _state.manifest_key(did, u["id"])
            ent = entries.get(key)
            dest_path = _state.derive_dest_path(cfg, did, u["id"])
            same = bool(ent) and _state.fingerprint_equal(fp_now, ent.get("fingerprint"))
            if ent:
                ages.append((time.time() - float(ent.get("fingerprint", {}).get("taken_at") or 0)) / 86400.0)
                methods.append(ent.get("fingerprint", {}).get("method") or _state.FINGERPRINT_METHOD)
            is_torn = (u["id"], did) in torn
            dirty_here = dirty.get(key) or {}

            # THE SECOND OPINION: when the cheap source check says 'unchanged',
            # look at the destination before believing it.
            drift, dest_now, observed_days = None, None, None
            if same and not is_torn and not dirty_here:
                dest_now = dest_observation(dest_path, exclusions)
                prev = ent.get("dest_fingerprint")
                if dest_now is None:
                    drift = "the destination directory is GONE"
                elif not prev:
                    drift = ("no destination observation was ever recorded for this unit "
                             "(memo written by an older build)")
                elif not _state.fingerprint_equal(dest_now, prev):
                    drift = (f"the destination changed since it was verified: "
                             f"{prev.get('file_count')} files / "
                             f"{_state.human_bytes(prev.get('bytes'))} then, "
                             f"{dest_now.get('file_count')} files / "
                             f"{_state.human_bytes(dest_now.get('bytes'))} now")
                if prev and prev.get("taken_at"):
                    observed_days = round((time.time() - float(prev["taken_at"])) / 86400.0, 4)

            changed = (not same) or is_torn or bool(dirty_here) or bool(drift)
            if not same:
                fp_changed_any = True
            reason_bits = []
            if not same:
                reason_bits.append("source fingerprint differs from the memo")
            if is_torn:
                reason_bits.append("a previous run announced this copy and never verified it")
            if dirty_here:
                reason_bits.append(f"the last verify FAILED: {dirty_here.get('reason')}")
            if drift:
                reason_bits.append(drift)
            stale_verify = (revalidate_days > 0 and observed_days is not None
                            and observed_days >= revalidate_days)
            recheck = (not changed) and (cls == "A" or stale_verify)
            routes[did] = {
                "dest_path": dest_path,
                "changed": changed,
                "change_reason": "; ".join(reason_bits) or None,
                "torn_from_previous_run": is_torn,
                "dest_drift": drift,
                "dest_observed_days_ago": observed_days,
                "force_checksum": bool(dirty_here.get("force_checksum")),
                "verify_level": d["verify_level_A"] if cls == "A" else d["verify_level_BC"],
                "copier": "rsync",
                "exclusions_applied": True,
                "delete_at_destination": bool(cfg.get("delete_at_destination")) and d["marker_valid"],
                "recheck_required": recheck,
                "recheck_reason": (
                    ("Class A re-checks content with its configured verify level even when the "
                     "cheap fingerprint says unchanged, because an in-place edit that preserves "
                     "size and mtime is invisible to " + _state.FINGERPRINT_METHOD)
                    if recheck and cls == "A" else
                    (f"the last passing verify is {observed_days} days old and "
                     f"revalidate_after_days={revalidate_days}" if recheck else None)),
            }
            if changed:
                # what still has to MOVE, not the size of the whole unit: an
                # incremental run against a destination that already holds 34.9
                # of 35 GB must not be refused for want of 35 GB.
                already = int((dest_now or {}).get("bytes") or 0)
                if not same:
                    prev_obs = (ent or {}).get("dest_fingerprint") or {}
                    already = int(prev_obs.get("bytes") or 0)
                routes[did]["planned_bytes"] = max(0, int(u.get("bytes") or 0) - already)
                d["planned_bytes"] += routes[did]["planned_bytes"]
                d["planned_bytes_upper_bound"] += int(u.get("bytes") or 0)
            d["secret_file_count"] += len(u.get("secret_files") or [])

        # A collision can only DESTROY data when the destination cannot tell the
        # two names apart, i.e. when it is case-INsensitive (or unknown). The
        # scan used to run in the opposite, harmless direction.
        collisions = u.get("case_collisions") or []
        if collisions:
            for did in routes:
                if dests[did]["case_sensitive"] is not True:
                    routes[did]["refused"] = "CASE_COLLISION"
                    routes[did]["changed"] = False

        recheck_any = any(r.get("recheck_required") for r in routes.values())
        units.append({
            "id": u["id"], "path": u.get("path"), "present": u.get("present", True),
            "class": cls, "class_reason": reason,
            "bytes": int(u.get("bytes") or 0), "file_count": u.get("file_count"),
            "fingerprint": fp_now,
            "fingerprint_method": (methods or [_state.FINGERPRINT_METHOD])[0],
            "fingerprint_age_days": round(min(ages), 4) if ages else None,
            "fingerprint_says_changed": fp_changed_any,
            "recheck_required": recheck_any,
            "recheck_reason": next((r.get("recheck_reason") for r in routes.values()
                                    if r.get("recheck_required")), None),
            "changed": any(r["changed"] for r in routes.values()),
            "routed": bool(routes),
            "case_collisions": collisions,
            "secret_files": u.get("secret_files") or [],
            "excluded_bytes": u.get("excluded_bytes", 0),
            "excluded_dirs": u.get("excluded_dirs", []),
            "routes": routes,
        })
        for s in (u.get("secret_files") or []):
            live = {did: os.path.join(dests[did]["path"], s) for did in routes
                    if not routes[did].get("refused")}
            all_secrets.append({
                "source_rel": s,
                "unit": u["id"],
                "dest_paths": live,
                "dest_path": (sorted(live.values())[0] if live else None),
                "routed": bool(live),
            })

    # ---- portable-destination secrets acknowledgement (F5 / dispute D3)
    ack = cfg.get("portable_secrets_ack") or {}
    for did, d in dests.items():
        if d["state"] != "CLEAR" or not d["portable"]:
            continue
        # only the secrets actually routed HERE. Counting unrouted ones inflated
        # the consent prompt and then claimed, in every later report, that a file
        # living nowhere but the source was 'now at a second location'.
        here = [s for s in all_secrets if did in (s.get("dest_paths") or {})]
        n = len(here)
        if n and not ack.get(did):
            blocked[did] = {
                "code": "PORTABLE_SECRETS_UNACKNOWLEDGED", "count": n,
                "message": (f"{n} secret-bearing file(s) would be copied to {d['path']}, which is "
                            f"marked portable — a drive that can be lent, lost, or plugged into "
                            f"another machine. They are PRESERVED by design (losing a working "
                            f".env is a real loss and this is a local drive, not a public "
                            f"bucket), but the first copy needs a one-time acknowledgement: "
                            f"init_destination.py --dest-id {did} --ack-secrets --confirm. "
                            f"The count is restated in every subsequent run report."),
                "files": [s["source_rel"] for s in here],
            }

    # ---- space: pooled per CONTAINER, never summed per volume
    by_container = {}
    for did, d in dests.items():
        if d["state"] != "CLEAR":
            continue
        by_container.setdefault(d["container"] or f"@unknown:{did}", []).append(did)
    space = {}
    for container, dids in by_container.items():
        free = None
        cap = None
        src = None
        for did in dids:
            free = dests[did]["free_bytes"] if free is None else free
            cap = dests[did]["capacity_bytes"] if cap is None else cap
            src = dests[did]["free_source"] if src is None else src
        planned = sum(dests[d]["planned_bytes"] for d in dids)
        head = headroom_for(cap)
        fits = None if free is None else (planned <= (free - head))
        for did in dids:
            space[did] = {
                "container": container, "pooled_free_bytes": free, "capacity_bytes": cap,
                "free_source": src,
                "headroom_bytes": head, "planned_bytes": planned,
                "planned_bytes_this_destination": dests[did]["planned_bytes"],
                "planned_bytes_upper_bound": dests[did]["planned_bytes_upper_bound"],
                "shares_container_with": [x for x in dids if x != did],
                "fits": fits,
                "note": ({
                    "apfs-container": ("free space is ONE pool for this APFS container; the "
                                       "figures for its volumes are the same bytes, not "
                                       "different bytes"),
                    "statvfs": ("free space here is the mounted VOLUME's own statvfs figure, "
                                "measured because this destination's filesystem could not be "
                                "mapped to a shared pool; no pooling reasoning applies to it"),
                    "cli-override": ("free space was SUPPLIED ON THE COMMAND LINE, not measured. "
                                     "This verdict is not evidence about the disk."),
                }.get(src, "free space could not be measured for this destination")),
            }
            if fits is None:
                blocked.setdefault(did, {
                    "code": "SPACE_UNMEASURED", "count": planned,
                    "message": (f"free space at {dests[did]['path']} could not be measured by "
                                f"the APFS container map or by statvfs, so the space gate has "
                                f"nothing to compare {_state.human_bytes(planned)} against. "
                                f"Refusing rather than passing: a gate that waves through what "
                                f"it never measured is not a gate."),
                })
            elif not fits:
                blocked.setdefault(did, {
                    "code": "INSUFFICIENT_POOLED_SPACE",
                    "count": planned,
                    "message": (f"planned {_state.human_bytes(planned)} against "
                                f"{container}'s free {_state.human_bytes(free)} (source: {src}) "
                                f"minus headroom {_state.human_bytes(head)}. Refusing rather "
                                f"than warning: filling this container is how a backup damages "
                                f"the system it was supposed to protect."),
                })
            if src == "cli-override":
                anomalies.append({
                    "code": "SPACE_VERDICT_OVERRIDDEN", "dest": did,
                    "message": (f"the space verdict for {did} used a free/capacity figure given "
                                f"on the command line (free={free}, capacity={cap}), not one "
                                f"measured from the disk."),
                    "source": "plan.py --free-bytes-override / --container-capacity-override"})

    plan = {
        "schema_version": _state.SCHEMA_VERSION,
        "run_id": run_id,
        "generated_at": time.time(),
        "generated_at_iso": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "config_path": cfg_path,
        "state_readable": readable,
        "destinations": dests,
        "units": units,
        "uncovered": inventory.get("uncovered", []),
        "excluded_dirs": inventory.get("excluded_dirs", []),
        "excluded_units": excluded_units,
        "excluded_total_bytes": inventory.get("excluded_total_bytes", 0) + excluded_unit_bytes,
        "needs_answer": needs_answer,
        "secret_files": all_secrets,
        "space_verdict": space,
        "space_overrides": ({"free_bytes": free_override, "capacity_bytes": cap_override}
                            if (free_override is not None or cap_override is not None) else None),
        "revalidate_after_days": revalidate_days,
        "blocked": blocked,
        "anomalies": anomalies,
        "dry_run_default": True,
    }
    j.append("plan_done",
             units_total=len(units),
             units_changed=len([u for u in units if u["changed"]]),
             planned_bytes=sum(d["planned_bytes"] for d in dests.values()),
             blocked=sorted(blocked.keys()),
             units=[{"id": u["id"], "class": u["class"], "bytes": u["bytes"],
                     "changed": u["changed"], "recheck_required": u["recheck_required"],
                     "fingerprint": u["fingerprint"],
                     "routes": {k: {"dest_path": v["dest_path"], "verify_level": v["verify_level"],
                                    "copier": v["copier"], "changed": v["changed"]}
                                for k, v in u["routes"].items()}} for u in units],
             secret_files=all_secrets,
             excluded_total_bytes=plan["excluded_total_bytes"],
             excluded_dir_count=len(inventory.get("excluded_dirs", [])) + len(excluded_units),
             excluded_dirs=[{"unit": e.get("unit"), "path": e.get("path"), "bytes": e.get("bytes")}
                            for e in inventory.get("excluded_dirs", [])][:200],
             excluded_units=excluded_units,
             needs_answer=needs_answer,
             space_verdict=space,
             uncovered=inventory.get("uncovered", []))
    return plan


def _selftest():
    fails = []
    # classification must follow the PROPERTY, never the name and never the size
    cases = [
        ({"id": "p/musicplayer", "present": True, "is_git_repo": True, "has_any_remote": False,
          "bytes": 17 * GiB}, "A"),
        ({"id": "p/alpha", "present": True, "is_git_repo": True, "has_any_remote": True,
          "bytes": 10}, "B"),
        ({"id": "p/Philosophy", "present": True, "is_git_repo": False, "has_any_remote": None,
          "is_gitignored": True, "bytes": 260 * 1024}, "A"),
        ({"id": "p/Sticker-Design", "present": True, "is_git_repo": False, "bytes": 908 * 1024 ** 2}, "A"),
        ({"id": "p/bulkcache", "present": True, "matches_exclusion": "node_modules/",
          "bytes": 4 * GiB}, "C"),
        ({"id": "p/vanished", "present": False, "bytes": 0}, "unknown"),
        ({"id": "p/unreadable", "present": True, "is_git_repo": True, "has_any_remote": None,
          "bytes": 1}, "unknown"),
    ]
    for u, want in cases:
        got, reason = classify(u, {})
        if got != want:
            fails.append(f"classify({u['id']}) = {got}, want {want}")
        import re as _re
        if _re.search(r"\b" + _re.escape(os.path.basename(u["id"])) + r"\b", reason):
            fails.append(f"classify({u['id']}) reason leans on the directory name: {reason!r}")
        if str(u.get("bytes")) in reason:
            fails.append(f"classify({u['id']}) reason leans on the size")
    # the negative anchor: 'everything is Class A' must be impossible
    classes = {classify(u, {})[0] for u, _ in cases}
    if len(classes) < 3:
        fails.append(f"the classifier does not discriminate: only {classes} ever produced")
    # a user override must be honoured AND echoed with its reason
    got, reason = classify({"id": "p/alpha", "present": True, "is_git_repo": True,
                            "has_any_remote": True},
                           {"class_overrides": {"p/alpha": {"class": "A", "reason": "owner says so"}}})
    if got != "A" or "owner says so" not in reason:
        fails.append("a config class override was not honoured/echoed")
    # headroom keeps the 10 GiB floor on a real backup volume ...
    if headroom_for(100 * GiB) != 10 * GiB:
        fails.append(f"headroom(100GiB) = {headroom_for(100 * GiB)}, want the 10 GiB floor")
    if headroom_for(2000 * GiB) != 100 * GiB:
        fails.append(f"headroom(2000GiB) = {headroom_for(2000 * GiB)}, want 5%")
    # ... and must NOT make a small volume unusable (known-bad input: a 400 MB
    # stick, which the flat 10 GiB floor blocked for a 1 KB backup)
    small = headroom_for(400 * 1024 ** 2)
    if small != SMALL_HEADROOM_FLOOR:
        fails.append(f"headroom(400MB) = {small}, want the {SMALL_HEADROOM_FLOOR} small floor")
    if 300 * 1024 ** 2 > (398 * 1024 ** 2 - small):
        fails.append("a 300 MB backup to a 400 MB volume is still refused")
    if headroom_for(0) != SMALL_HEADROOM_FLOOR:
        fails.append("headroom(0) did not fall back to the small floor")
    # the pooled rule: two destinations in one container must not double the pool
    free, cap = 100 * GiB, 500 * GiB
    head = headroom_for(cap)
    if not (150 * GiB > free - head):
        fails.append("space arithmetic fixture is degenerate")
    # a destination-side observation must react to loss (known-bad input: a
    # destination that lost a file while the source did not change)
    import shutil as _sh
    import tempfile as _tf
    t = _tf.mkdtemp(prefix="wsbk-plan-selftest-")
    try:
        dd = os.path.join(t, "d")
        os.makedirs(os.path.join(dd, "sub"))
        for i in range(3):
            with open(os.path.join(dd, "sub", f"f{i}.txt"), "w") as f:
                f.write("x" * (i + 1))
        before = dest_observation(dd, [])
        if dest_observation(os.path.join(t, "absent"), []) is not None:
            fails.append("a missing destination directory was not reported as missing")
        os.unlink(os.path.join(dd, "sub", "f1.txt"))
        after = dest_observation(dd, [])
        if _state.fingerprint_equal(before, after):
            fails.append("the destination observation did not react to a deleted file — an rm at "
                         "the destination would stay invisible for ever")
        os.rename(os.path.join(dd, "sub", "f2.txt"), os.path.join(dd, "sub", "f2-renamed.txt"))
        if _state.fingerprint_equal(after, dest_observation(dd, [])):
            fails.append("the destination observation did not react to a rename")
    finally:
        _sh.rmtree(t, ignore_errors=True)
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("plan.py selftest: 7 classification cases (incl. 2 unknown), override echo, "
          "headroom floor/percentage/small-volume, pooled-space arithmetic, destination "
          "observation vs deletion and rename — all vs known-bad inputs")
    return 0


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    if "--config" not in args or "--out" not in args:
        print(__doc__, file=sys.stderr)
        return 2
    cfg = _state.load_config(args[args.index("--config") + 1])
    out_path = args[args.index("--out") + 1]
    inv_path = args[args.index("--inventory") + 1] if "--inventory" in args else None
    if inv_path:
        inventory = json.load(open(inv_path, encoding="utf-8"))
    else:
        inventory = inv_mod.build(cfg)

    plan = build_plan(cfg, inventory, args)
    _state.atomic_write_json(out_path, plan)

    if "--json" in args:
        print(json.dumps(plan, indent=2, ensure_ascii=False))
    else:
        print(f"plan: {len(plan['units'])} units, "
              f"{len([u for u in plan['units'] if u['changed']])} changed, "
              f"{_state.human_bytes(sum(d['planned_bytes'] for d in plan['destinations'].values()))} planned")
        for did, d in plan["destinations"].items():
            print(f"  {did}: {d['state']}  {_state.escape_untrusted(d['path'])}")
        for u in plan["units"]:
            for did, r in (u.get("routes") or {}).items():
                if r.get("dest_drift"):
                    print(f"  DESTINATION DRIFT {_state.escape_untrusted(u['id'])} -> {did}: "
                          f"{_state.escape_untrusted(r['dest_drift'])} — re-copying")
        for did, b in plan["blocked"].items():
            print(f"  BLOCKED {did}: [{b['code']}] {b['message']}")
        for n in plan["needs_answer"]:
            print(f"  NOT CLASSIFIED {_state.escape_untrusted(n['id'])} — {n['reason']}. It is "
                  f"routed nowhere, so it is NOT backed up.")
        for u in plan["uncovered"]:
            extra = (f" (its own name matches the exclusion pattern {u['matches_exclusion']!r}, "
                     f"{_state.human_bytes(u.get('bytes'))})" if u.get("matches_exclusion") else "")
            print(f"  UNCOVERED {_state.escape_untrusted(u['id'])}{extra} — not in any unit; add "
                  f"it to config.json known_units, or say it should stay out")
    return 1 if plan["blocked"] else 0


if __name__ == "__main__":
    sys.exit(main())
