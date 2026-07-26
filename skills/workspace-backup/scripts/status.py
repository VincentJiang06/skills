#!/usr/bin/env python3
"""status.py — the SINGLE renderer of ledger truth.

Every claim it prints is derived from the journal and the memo. It has no path
that infers, rounds up, or optimistically fills a missing value:

  * SAFE requires a JOURNALLED, PASSING verify event for that (unit,
    destination), not merely a memo entry. An entry with no such event — which
    the documented journal retention produces on its own, with no attacker —
    prints UNVERIFIED and is named as an anomaly.
  * the verify level printed is the level the JOURNAL says ran. The entry's own
    claim about itself is never a level source.
  * when destinations disagree, the unit-level claim is the WEAKEST of them.
  * the universe of units comes from the LATEST plan in the ledger, not from the
    current run only. Looking only at the current run made the documented
    status-only chain report zero units, zero secrets and zero excluded bytes —
    an empty universe that reads as an all-clear.

Filesystem-sourced strings (paths, volume names, marker free text) are escaped
and quoted with their source named, so a filename containing newlines or ANSI
escapes cannot forge a report line.

Headline order is fixed: destinations OK/skipped with staleness in DAYS first,
then unsafe units with reasons, then what was copied, then exclusions with their
reclaimed size, then the secret-file inventory with destination paths.

Usage:
  status.py --config C [--json]
  status.py --config C --record-rework --kind K --note "..."
  status.py --config C --rework-log
  status.py --selftest
"""
from __future__ import annotations

import json
import os
import sys
import time

# running any of these by hand must not leave __pycache__ inside the shipped
# package; the internal spawns pass -B for the same reason
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _state  # noqa: E402

esc = _state.escape_untrusted


def latest_by(events, name, keyfn):
    out = {}
    for e in sorted(events, key=lambda x: x.get("ts", 0)):
        if e.get("event") == name:
            out[keyfn(e)] = e
    return out


def collect(cfg):
    state = cfg["state_dir"]
    manifest, readable = _state.read_manifest(state)
    entries = manifest.get("entries", {})
    dirty = _state.dirty_map(state)
    all_events = _state.read_events(state)
    run_id = None
    cur = os.path.join(state, _state.CURRENT_RUN)
    if os.path.exists(cur):
        run_id = open(cur, encoding="utf-8").read().strip()
    run_events = [e for e in all_events if e.get("run_id") == run_id] if run_id else []

    # The universe is the LATEST plan anywhere in the ledger — a status-only
    # question asked after a fresh inventory must still enumerate the units.
    plan_done = None
    for e in sorted(all_events, key=lambda x: x.get("ts", 0)):
        if e.get("event") == "plan_done":
            plan_done = e
    plan_run = (plan_done or {}).get("run_id")
    plan_ts = float((plan_done or {}).get("ts") or 0)
    plan_age_days = (round((time.time() - plan_ts) / 86400.0, 3) if plan_done else None)
    plan_is_current = bool(plan_done) and plan_run == run_id

    dest_verdicts = latest_by(all_events, "dest_verdict", lambda e: e.get("dest"))
    verify_latest = latest_by(all_events, "unit_verify_result",
                              lambda e: (e.get("unit"), e.get("dest")))
    copy_latest = latest_by(all_events, "unit_copy_result",
                            lambda e: (e.get("unit"), e.get("dest")))
    copy_this_run = latest_by(run_events, "unit_copy_result",
                              lambda e: (e.get("unit"), e.get("dest")))
    skips = [e for e in run_events if e.get("event") == "unit_skip_memo"]

    anomalies = []
    for e in run_events:
        if e.get("event") == "dest_verdict":
            for c in (e.get("anomaly_codes") or []):
                anomalies.append({"code": c, "dest": e.get("dest"),
                                  "detail": f"guard verdict {e.get('verdict')}"})
        if e.get("event") == "torn_run_detected":
            anomalies.append({"code": "TORN_RUN", "dest": e.get("torn_run_id"),
                              "detail": (f"run {e.get('torn_run_id')}: {e.get('why')} "
                                         f"units: {e.get('units')}")})
        if e.get("event") == "unit_refused":
            anomalies.append({"code": e.get("why"), "unit": e.get("unit"),
                              "dest": e.get("dest"), "detail": e.get("detail")})
        if e.get("event") == "plan_target_refused":
            anomalies.append({"code": "PLAN_TARGET_REFUSED", "unit": e.get("unit"),
                              "dest": e.get("dest"), "detail": e.get("detail")})
        if e.get("event") in ("copier_temp_found", "copier_temp_removed"):
            anomalies.append({"code": "COPIER_TEMP_ARTIFACT", "unit": e.get("unit"),
                              "dest": e.get("dest"),
                              "detail": (f"{len(e.get('files') or [])} file(s) at the destination "
                                         f"look like an interrupted copier's debris and are "
                                         f"REPORTED, not deleted (destination deletion needs "
                                         f"delete_at_destination): "
                                         f"{[f.get('rel') for f in (e.get('files') or [])][:4]}")})
        if e.get("event") == "xattr_flag_unsupported":
            anomalies.append({"code": "XATTRS_NOT_PRESERVED", "dest": e.get("dest"),
                              "detail": (f"{e.get('binary')} rejected {e.get('flag')}, so this "
                                         f"run did NOT preserve extended attributes or resource "
                                         f"forks")})
        if e.get("event") == "space_override":
            anomalies.append({"code": "SPACE_VERDICT_OVERRIDDEN", "detail": e.get("why")})
    for (uid, did), e in verify_latest.items():
        if e.get("level_configured") and e.get("level_executed") \
                and e["level_configured"] != e["level_executed"] and not e.get("level_override"):
            anomalies.append({
                "code": "VERIFY_LEVEL_MISMATCH", "unit": uid, "dest": did,
                "detail": (f"the journal records level_configured={e['level_configured']} but "
                           f"level_executed={e['level_executed']}. The report always prints the "
                           f"level that ACTUALLY ran; this disagreement is itself the finding.")})
        if (e.get("temp_artifacts") or []):
            anomalies.append({
                "code": "COPIER_TEMP_ARTIFACT", "unit": uid, "dest": did,
                "detail": (f"{len(e['temp_artifacts'])} copier temp file(s) at the destination: "
                           f"{e['temp_artifacts'][:4]}")})

    # ---- destinations
    dests = {}
    for d in cfg.get("destinations", []):
        did = d["id"]
        ev = dest_verdicts.get(did)
        keys = [k for k in entries if k.startswith(did + "::")]
        stamps = [entries[k].get("committed_at") or 0 for k in keys]
        newest = max(stamps, default=0)
        oldest = min(stamps, default=0)
        dests[did] = {
            "id": did, "path": d["path"],
            "state": (ev or {}).get("verdict", "UNKNOWN"),
            "state_as_of_run": (ev or {}).get("run_id"),
            "portable": bool(d.get("portable")),
            "same_physical_disk_as_source": bool(d.get("same_physical_disk_as_source")),
            "units_recorded_safe": len(keys),
            "last_success": newest or None,
            "last_success_iso": (time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(newest))
                                 if newest else None),
            # the HEADLINE number is the WORST unit, not the best: a max over the
            # entries reported '0.0 days' while most of the destination rotted
            "stale_days": (round((time.time() - oldest) / 86400.0, 1) if oldest else None),
            "newest_verified_days": (round((time.time() - newest) / 86400.0, 1) if newest else None),
            "drifted_units": [],
        }

    # ---- units
    plan_units = (plan_done or {}).get("units") or []
    planned_ids = {pu["id"] for pu in plan_units}
    units = []
    for pu in plan_units:
        uid = pu["id"]
        routes = pu.get("routes") or {}
        per_dest, failing, safe_dests = {}, False, 0
        for did, r in routes.items():
            key = _state.manifest_key(did, uid)
            ent = entries.get(key)
            v = verify_latest.get((uid, did))
            journal_ok = bool(v is not None and v.get("ok"))
            if v is not None and not v.get("ok"):
                failing = True
            if ent and v is None:
                anomalies.append({
                    "code": "ORPHANED_MEMO_ENTRY", "unit": uid, "dest": did,
                    "detail": ("the memo carries an entry for this unit but no journal event "
                               "records a verify that produced it (pruned journal, restored "
                               "state directory, or a hand-written entry). It is reported "
                               "UNVERIFIED — an entry is not evidence of its own truth.")})
            is_dirty = key in dirty
            # A plan made AFTER the last passing verify, which saw the source or
            # the destination move, outranks that verify: the destination no
            # longer holds what was verified. A plan made BEFORE it does not —
            # that is the ordinary copy -> verify sequence of a healthy run.
            verify_ts = float((v or {}).get("ts") or 0)
            superseded = bool(r.get("changed") or r.get("dest_drift")) and plan_ts > verify_ts
            committed = bool(ent) and journal_ok and not is_dirty and not superseded
            if committed:
                safe_dests += 1
            configured = r.get("verify_level")
            executed = (v or {}).get("level_executed")
            if executed and configured and \
                    _state.level_rank(executed) < _state.level_rank(configured):
                anomalies.append({
                    "code": "VERIFY_LEVEL_DOWNGRADE", "unit": uid, "dest": did,
                    "detail": (f"the last verify of this unit ran {executed} while its class "
                               f"requires {configured}. The recorded claim is the cheaper one, "
                               f"whether or not the downgrade was deliberate.")})
            per_dest[did] = {
                "dest_path": r.get("dest_path"),
                "committed": committed,
                "memo_entry_present": bool(ent),
                "journal_verify_ok": (v.get("ok") if v is not None else None),
                "dirty": is_dirty,
                "dirty_reason": (dirty.get(key) or {}).get("reason"),
                # ONLY the journal may say what level ran
                "verify_level_executed": (v or {}).get("level_executed"),
                "verify_level_claimed_by_entry": (ent or {}).get("verify_level"),
                "sample_rate": (v or {}).get("sample_rate"),
                "copier": ((copy_latest.get((uid, did)) or {}).get("copier")
                           or (ent or {}).get("copier") or r.get("copier")),
                "last_verified_ok": (v.get("ok") if v is not None else None),
                "mismatches": (v or {}).get("mismatches") or [],
                "notes": (v or {}).get("notes") or [],
                "dest_drift": r.get("dest_drift"),
                "dest_observed_days_ago": r.get("dest_observed_days_ago"),
                "superseded_by_a_newer_plan": superseded,
                "extra_files": len((v or {}).get("extra_files") or []),
            }
        levels = [p["verify_level_executed"] for p in per_dest.values() if p["committed"]]
        lvl = _state.weakest_level(levels)
        rates = [p["sample_rate"] for p in per_dest.values()
                 if p["committed"] and p["sample_rate"] is not None]
        routed = bool(routes)
        safe = bool(routed) and safe_dests == len(routes) and not failing
        units.append({
            "id": uid, "class": pu.get("class"), "bytes": pu.get("bytes"),
            "changed_this_run": pu.get("changed"),
            "recheck_required": pu.get("recheck_required"),
            "routed": routed,
            "safe": safe,
            "verify_level_executed": lvl,
            # every destination must have earned it, not just the first one
            "checksum_verified": bool(levels) and all(x in ("L3", "L4") for x in levels),
            "complete_checksum": bool(levels) and all(x == "L4" for x in levels),
            "sample_rate": (min(rates) if rates else None),
            "per_dest": per_dest,
            "skipped_by_memo": any(s.get("unit") == uid for s in skips),
        })
    # units the ledger knows about but the latest plan does not mention at all
    orphan_entries = sorted({k.split("::", 1)[1] for k in entries
                             if "::" in k and k.split("::", 1)[1] not in planned_ids})
    for uid in orphan_entries:
        anomalies.append({
            "code": "UNIT_NOT_IN_LATEST_PLAN", "unit": uid,
            "detail": ("the memo has an entry for this unit but the latest plan does not route "
                       "it anywhere — it is no longer being backed up, whatever the entry says.")})

    # drift for destinations that were not written this run
    for did, dd in dests.items():
        if dd["state"] == "CLEAR":
            continue
        for pu in plan_units:
            ent = entries.get(_state.manifest_key(did, pu["id"]))
            if not ent or not _state.fingerprint_equal(pu.get("fingerprint"),
                                                       (ent or {}).get("fingerprint")):
                dd["drifted_units"].append(pu["id"])

    copy_failures = [e for e in copy_this_run.values() if not e.get("ok")]
    verify_failures = [e for e in verify_latest.values()
                       if e.get("run_id") == run_id and not e.get("ok")]
    ran_something = bool(copy_this_run) or bool([e for e in verify_latest.values()
                                                 if e.get("run_id") == run_id])
    run_success = None
    if ran_something:
        run_success = not (copy_failures or verify_failures)

    # a secret is "at a second location" only where its UNIT is currently safe —
    # the same test the rest of the report uses, not a weaker one
    committed_now = {(u["id"], did): p["committed"]
                     for u in units for did, p in u["per_dest"].items()}
    secrets = []
    for s in ((plan_done or {}).get("secret_files") or []):
        unit = s.get("unit")
        confirmed = {}
        for did, p in (s.get("dest_paths") or {}).items():
            if committed_now.get((unit, did)):
                confirmed[did] = p
        # A destination that is OFFLINE this run has no route, so the plan says
        # nothing about it — but the drive in the drawer is still carrying the
        # secret. Report it from the ledger, or the report goes quiet about
        # credentials exactly when the drive is out of the user's sight.
        elsewhere = {}
        for d in cfg.get("destinations", []):
            did = d["id"]
            if did in confirmed or did in (s.get("dest_paths") or {}):
                continue
            ent = entries.get(_state.manifest_key(did, unit)) if unit else None
            v = verify_latest.get((unit, did)) if unit else None
            if ent and v is not None and v.get("ok"):
                elsewhere[did] = os.path.join(d["path"], s.get("source_rel") or "")
        secrets.append({"source_rel": s.get("source_rel"),
                        "unit": unit,
                        "dest_path": s.get("dest_path"),
                        "dest_paths": s.get("dest_paths", {}),
                        "verified_at": confirmed,
                        "still_at_unrouted_destinations": elsewhere})

    return {
        "schema_version": _state.SCHEMA_VERSION,
        "run_id": run_id,
        "plan_run_id": plan_run,
        "plan_is_current": plan_is_current,
        "plan_age_days": plan_age_days,
        "state_readable": readable,
        "state_dir": cfg["state_dir"],
        "source_roots": cfg.get("source_roots", []),
        "total_units": (plan_done or {}).get("units_total", len(plan_units)),
        "changed_units": (plan_done or {}).get("units_changed", 0),
        "destinations": dests,
        "units": units,
        "secret_files": secrets,
        "excluded_total_bytes": (plan_done or {}).get("excluded_total_bytes", 0),
        "excluded_dir_count": (plan_done or {}).get("excluded_dir_count", 0),
        "excluded_units": (plan_done or {}).get("excluded_units", []),
        "excluded_dirs": (plan_done or {}).get("excluded_dirs", []),
        "needs_answer": (plan_done or {}).get("needs_answer", []),
        "uncovered": (plan_done or {}).get("uncovered", []),
        "anomalies": anomalies,
        "run_success": run_success,
        "ever_recorded": bool(entries),
        "ever_planned": bool(plan_done),
    }


def render(s):
    L = []
    W = L.append
    W(f"WORKSPACE BACKUP — status at {time.strftime('%Y-%m-%d %H:%M:%S')}"
      + (f" (run {esc(s['run_id'])})" if s["run_id"] else ""))
    if not s["ever_planned"]:
        W("NO PLAN HAS EVER BEEN MADE for this config, so I cannot tell you what is safe. "
          "Run inventory.py then plan.py first.")
    elif not s["plan_is_current"]:
        W(f"PLAN IS NOT FROM THIS RUN — the figures below describe plan {esc(s['plan_run_id'])}, "
          f"{s['plan_age_days']} day(s) old. Re-run inventory.py + plan.py for a fresh "
          f"observation of source AND destination.")
    if s["run_success"] is False:
        W("RUN FAILED — at least one unit did not copy or did not verify this run. Details below.")
    elif s["run_success"] is True:
        W("RUN OK — every unit attempted this run copied and verified.")
    total = len(s["destinations"])
    ok = len([d for d in s["destinations"].values() if d["state"] == "CLEAR"])
    W(f"DESTINATIONS: {ok} of {total} OK, {total - ok} of {total} skipped")
    for did, d in s["destinations"].items():
        tag = {"CLEAR": "OK", "OFFLINE": "OFFLINE"}.get(d["state"], d["state"])
        stale = (f"oldest unit verified {d['stale_days']} days ago, newest "
                 f"{d['newest_verified_days']} days ago ({d['last_success_iso']})"
                 if d["last_success"] else "NEVER synced — no unit has ever been verified here")
        extra = ""
        if d["state"] == "OFFLINE":
            extra = (f"; {len(d['drifted_units'])} unit(s) have drifted since its last "
                     f"successful sync")
        note = ""
        if d["same_physical_disk_as_source"]:
            note = ("  [same physical disk as the source — protects against accidental deletion "
                    "and bad refactors, NOT against disk failure]")
        if d["portable"]:
            note += "  [portable: this drive can be lent, lost, or plugged into another machine]"
        W(f"  [{tag}] {did}  {esc(d['path'])}  {stale}{extra}{note}")

    if not s["ever_recorded"]:
        W("")
        W("NEVER RECORDED — no backup has ever been committed for these destinations. "
          "Nothing here is safe yet.")
    if s["state_readable"] is False:
        W("")
        W("STATE UNREADABLE — the memo could not be parsed, so NOTHING is known to be safe. "
          "The next run is a full copy. That costs an evening; the alternative would have been "
          "a false claim of safety.")

    routed = [u for u in s["units"] if u["routed"]]
    unsafe = [u for u in routed if not u["safe"]]
    W("")
    W(f"NOT SAFE / UNVERIFIED ({len(unsafe)} of {len(routed)} backed-up units)")
    if not unsafe:
        W("  (none)")
    for u in unsafe:
        reasons = []
        for did, p in u["per_dest"].items():
            if p["last_verified_ok"] is False:
                reasons.append(f"{did}: VERIFY FAILED — " + "; ".join(p["mismatches"][:3]))
            elif p["dirty"]:
                reasons.append(f"{did}: DIRTY — {p['dirty_reason']}; the next run re-copies it")
            elif p["memo_entry_present"] and p["journal_verify_ok"] is None:
                reasons.append(f"{did}: UNVERIFIED — a memo entry exists but NO journal event "
                               f"records the verify that produced it")
            elif p["superseded_by_a_newer_plan"]:
                reasons.append(f"{did}: STALE — the last plan saw it change after the last "
                               f"passing verify, so what was verified is not what is there now")
            elif not p["committed"]:
                reasons.append(f"{did}: UNVERIFIED (no verify event has ever passed for it)")
            if p["dest_drift"]:
                reasons.append(f"{did}: destination drifted — {p['dest_drift']}")
        W(f"  {esc(u['id'])}  Class {u['class']}  " + " | ".join(esc(r) for r in reasons))

    W("")
    W(f"UNITS ({s['changed_units']} of {s['total_units']} changed at the last plan)")
    for u in routed:
        for did, p in u["per_dest"].items():
            # a level that has been superseded, failed, or was never journalled
            # is NOT a claim this report is allowed to repeat
            lvl = (p["verify_level_executed"] or "not verified") if p["committed"] \
                else "not verified"
            claim = {
                "L1": "L1 re-stat (destination present and non-empty — NOT checksum evidence)",
                "L2": ("L2 file count + byte total (detects truncation and missing files, "
                       "NOT in-place content corruption)"),
                "L3": None,
                "L4": "L4 full SHA-256 of every non-excluded file",
                "not verified": ("nothing — no passing verify currently describes what is at "
                                 "this destination"),
            }.get(lvl, f"{lvl}")
            if lvl == "L3":
                rate = p["sample_rate"]
                claim = ("L3 — every non-excluded file was hashed this run (the unit is smaller "
                         "than the sample floor, so the sample was complete)"
                         if rate is not None and rate >= 1.0 else
                         (f"L3 sampled SHA-256 — {rate * 100:.0f}% of non-excluded files this "
                          f"run, rotating across runs so coverage accumulates; NOT a claim of "
                          f"byte-identity" if rate is not None else "L3 sampled SHA-256"))
            W(f"  {esc(u['id'])} -> {did}  Class {u['class']}  "
              f"{_state.human_bytes(u['bytes'])}  copier={esc(p['copier'])}  "
              f"{'SAFE' if p['committed'] else 'UNVERIFIED'}  "
              f"verified: {claim}"
              + ("  [skipped this run: source fingerprint and destination re-check both matched]"
                 if u["skipped_by_memo"] else ""))
            for n in p["notes"][:2]:
                W(f"      note: {esc(n)}")

    if s["needs_answer"]:
        W("")
        W(f"NOT CLASSIFIED ({len(s['needs_answer'])}) — measured properties were incomplete, so "
          f"these units are routed NOWHERE and are NOT backed up. They need an answer:")
        for n in s["needs_answer"]:
            W(f"  {esc(n.get('id'))} — {esc(n.get('reason'))}")

    W("")
    W(f"EXCLUSIONS — {s['excluded_dir_count']} directories/units excluded, "
      f"{_state.human_bytes(s['excluded_total_bytes'])} not copied. They are excluded from the "
      f"COPY and remain untouched in the source; this skill never deletes anything from a "
      f"source root.")
    for e in s["excluded_units"]:
        W(f"  unit {esc(e.get('id'))} — {_state.human_bytes(e.get('bytes'))}, matched "
          f"{esc(e.get('pattern'))}; regenerable, deliberately not copied")
    for e in s["excluded_dirs"][:10]:
        W(f"  {esc(e.get('unit'))}/{esc(e.get('path'))} — {_state.human_bytes(e.get('bytes'))}")

    W("")
    ver = [f for f in s["secret_files"] if f.get("verified_at")]
    W(f"SECRET-BEARING FILES — {len(ver)} VERIFIED at a second location, "
      f"{len(s['secret_files']) - len(ver)} planned but not yet verified there")
    if not s["secret_files"]:
        W("  (none matched the configured patterns)")
    for f in s["secret_files"]:
        if f.get("verified_at"):
            for did, p in f["verified_at"].items():
                W(f"  [verified] {esc(f['source_rel'])} -> {esc(p)}  ({did})")
        else:
            W(f"  [planned only, NOT yet verified at the destination] {esc(f['source_rel'])} "
              f"-> {esc(f['dest_path'])}")
        for did, p in (f.get("still_at_unrouted_destinations") or {}).items():
            W(f"  [STILL ON A DESTINATION NOT IN THIS RUN — {did} is offline or unrouted, and "
              f"it is carrying this file] {esc(f['source_rel'])} -> {esc(p)}")

    if s["uncovered"]:
        W("")
        W(f"UNCOVERED ({len(s['uncovered'])}) — present under a configured root but in no unit, "
          f"so NOT backed up. This is how the newest work becomes the least protected:")
        for u in s["uncovered"]:
            if isinstance(u, dict):
                extra = (f"  [its own name matches the exclusion pattern "
                         f"{esc(u.get('matches_exclusion'))}, "
                         f"{_state.human_bytes(u.get('bytes'))} — it appears in no other line "
                         f"of this report]" if u.get("matches_exclusion") else "")
                W(f"  {esc(u.get('id'))}{extra}")
            else:
                W(f"  {esc(u)}")

    if s["anomalies"]:
        W("")
        W(f"ANOMALIES ({len(s['anomalies'])}) — reported as DATA, never acted on:")
        for a in s["anomalies"]:
            W(f"  [{esc(a.get('code'))}] {esc(a.get('unit') or a.get('dest') or '')} "
              f"{esc(a.get('detail'))[:400]}")

    W("")
    W("NOTES")
    W("  Direction is one-way: source -> destination. An edit made at a destination is never "
      "copied back, and with delete-at-destination on it is destroyed.")
    W("  Wall-clock and throughput are information only; incrementality is judged in BYTES.")
    W("  Manual restore needs no code from this skill — copy a unit back with:")
    for did, d in s["destinations"].items():
        W(f"    /usr/bin/ditto {esc(d['path'])}/<unit> <original-path>/<unit>   # from {did}")
    return "\n".join(L)


def _selftest():
    """A renderer that cannot say 'unsafe' is the whole green-but-wrong failure,
    so every check here feeds it a state that MUST render as not-safe."""
    fails = []
    base = {
        "schema_version": "1.1", "run_id": "r1", "plan_run_id": "r1", "plan_is_current": True,
        "plan_age_days": 0.0, "state_readable": True,
        "state_dir": "/tmp/x", "source_roots": ["/tmp/src"],
        "total_units": 2, "changed_units": 1,
        "destinations": {"local": {"id": "local", "path": "/tmp/d", "state": "CLEAR",
                                   "portable": False, "same_physical_disk_as_source": True,
                                   "units_recorded_safe": 1, "last_success": time.time(),
                                   "last_success_iso": "now", "stale_days": 0.0,
                                   "newest_verified_days": 0.0, "drifted_units": []}},
        "units": [], "secret_files": [], "excluded_total_bytes": 0, "excluded_dir_count": 0,
        "excluded_units": [], "excluded_dirs": [], "needs_answer": [],
        "uncovered": [], "anomalies": [], "run_success": True, "ever_recorded": True,
        "ever_planned": True,
    }

    def unit(safe, lvl, rate=None, committed=True, okv=True, entry=True, dirty=False):
        return {"id": "src/u", "class": "A", "bytes": 10, "changed_this_run": True,
                "recheck_required": False, "routed": True, "safe": safe,
                "verify_level_executed": lvl,
                "checksum_verified": lvl in ("L3", "L4"), "complete_checksum": lvl == "L4",
                "sample_rate": rate, "skipped_by_memo": False,
                "per_dest": {"local": {"dest_path": "/tmp/d/src/u", "committed": committed,
                                       "memo_entry_present": entry,
                                       "journal_verify_ok": okv, "dirty": dirty,
                                       "dirty_reason": "CHECKSUM MISMATCH main.py" if dirty else None,
                                       "verify_level_executed": lvl,
                                       "verify_level_claimed_by_entry": "L4",
                                       "sample_rate": rate,
                                       "copier": "openrsync", "last_verified_ok": okv,
                                       "mismatches": [], "notes": [], "dest_drift": None,
                                       "dest_observed_days_ago": 0.0,
                                       "superseded_by_a_newer_plan": False, "extra_files": 0}}}

    # 1. an L1 re-stat must never be rendered as checksum evidence
    txt = render({**base, "units": [unit(True, "L1")]})
    if "NOT checksum evidence" not in txt:
        fails.append("an L1 unit was not marked as non-checksum evidence")
    # 2. an L3 sample must print its rate and disclaim byte-identity
    txt = render({**base, "units": [unit(True, "L3", 0.1)]})
    if "10%" not in txt or "NOT a claim of byte-identity" not in txt:
        fails.append("an L3 unit did not declare its sampling rate / probabilistic nature")
    # 3. an uncommitted unit must render UNVERIFIED and appear in the not-safe list
    txt = render({**base, "units": [unit(False, None, committed=False, okv=None, entry=False)]})
    if "UNVERIFIED" not in txt or "NOT SAFE / UNVERIFIED (1 of 1" not in txt:
        fails.append("an uncommitted unit did not render as unverified/not-safe")
    # 3b. a memo entry with NO journal verify event must render UNVERIFIED and
    #     say why (known-bad input: the orphaned state the retention policy makes)
    txt = render({**base, "units": [unit(False, None, committed=False, okv=None, entry=True)]})
    if "NO journal event" not in txt or "NOT SAFE / UNVERIFIED (1 of 1" not in txt:
        fails.append("a memo entry with no journal verify event did not render as unverified "
                     "with its reason named")
    # 3c. a DIRTY unit must be not-safe and must say the next run repairs it
    txt = render({**base, "units": [unit(False, "L4", committed=False, okv=True, dirty=True)]})
    if "DIRTY" not in txt or "re-copies" not in txt:
        fails.append("a unit marked dirty by a failed verify did not render as such")
    # 3d. a failed RUN must be stated in the headline, not left to inference
    txt = render({**base, "run_success": False, "units": [unit(True, "L4")]})
    if "RUN FAILED" not in txt.splitlines()[1]:
        fails.append("a failed run is not stated in the headline")
    # 3e. a report built on a plan from an EARLIER run must say so
    txt = render({**base, "plan_is_current": False, "plan_run_id": "r0", "plan_age_days": 3.2})
    if "NOT FROM THIS RUN" not in txt:
        fails.append("a stale plan was presented as current state")
    txt = render({**base, "ever_planned": False})
    if "cannot tell you what is safe" not in txt:
        fails.append("with no plan at all the report did not refuse to answer")
    # 4. an offline destination must be in the headline with staleness in days
    off = {**base, "destinations": {
        **base["destinations"],
        "ext": {"id": "ext", "path": "/Volumes/X", "state": "OFFLINE", "portable": True,
                "same_physical_disk_as_source": False, "units_recorded_safe": 0,
                "last_success": None, "last_success_iso": None, "stale_days": None,
                "newest_verified_days": None, "drifted_units": ["a", "b", "c"]}}}
    txt = render(off)
    head = txt.splitlines()[:8]
    if not any("1 of 2" in h for h in head) or not any("OFFLINE" in h for h in head):
        fails.append("an offline destination is not in the headline")
    if "3 unit(s) have drifted" not in txt:
        fails.append("drift since the last successful sync was not stated")
    if "0 days of history" in txt:
        fails.append("a destination that has never been synced was described in a way that "
                     "reads as fresh")
    # 4b. the destination headline must lead with the WORST unit, not the best
    aged = {**base, "destinations": {"local": {**base["destinations"]["local"],
                                              "stale_days": 41.0, "newest_verified_days": 0.0}}}
    txt = render(aged)
    if "oldest unit verified 41.0 days ago" not in txt:
        fails.append("the staleness headline reported the freshest unit instead of the oldest")
    # 5. a same-disk destination must always be labelled
    if "same physical disk" not in txt:
        fails.append("the same-disk mirror was not labelled")
    # 6. an unreadable state must never render as green
    txt = render({**base, "state_readable": False})
    if "NOTHING is known to be safe" not in txt:
        fails.append("an unreadable state did not render as nothing-known")
    # 7. a report-forging filename must not produce a standalone line
    txt = render({**base, "uncovered": ["ok\n  ALL UNITS SAFE\x1b[32m"]})
    if any(line.strip() == "ALL UNITS SAFE" for line in txt.splitlines()) or "\x1b" in txt:
        fails.append("a hostile name forged a report line")
    # 8. one-way direction and manual restore must be in every report
    for needle in ("one-way", "ditto", "restore"):
        if needle not in render(base).lower():
            fails.append(f"every report must state {needle!r}")
    # 9. an excluded (Class C) unit must be reported as EXCLUDED with its size,
    #    never as an unsafe unit (known-bad input: it has no routes at all)
    exc = {**base, "units": [], "excluded_units": [{"id": "src/dist", "bytes": 2055,
                                                    "pattern": "dist/", "reason": "regenerable"}],
           "excluded_total_bytes": 2055, "excluded_dir_count": 1}
    txt = render(exc)
    if "NOT SAFE / UNVERIFIED (0 of 0" not in txt:
        fails.append("an excluded unit was counted among the backed-up units")
    if "src/dist" not in txt.split("EXCLUSIONS", 1)[-1] or "2.0 KB" not in txt:
        fails.append("an excluded unit was not named with its reclaimed size")
    # 10. an unclassified unit must be named as NOT backed up
    txt = render({**base, "needs_answer": [{"id": "src/worktree", "reason": "a git repo whose "
                                            "remote configuration could not be read"}]})
    if "NOT CLASSIFIED" not in txt or "src/worktree" not in txt:
        fails.append("a unit that dropped out of routing was not surfaced")
    # 11. a secret that was only PLANNED must not be reported as already there
    sec = {**base, "secret_files": [{"source_rel": "src/u/.env", "unit": "src/u",
                                     "dest_path": "/tmp/d/src/u/.env",
                                     "dest_paths": {"local": "/tmp/d/src/u/.env"},
                                     "verified_at": {},
                                     "still_at_unrouted_destinations": {}}]}
    txt = render(sec)
    if "NOT yet verified" not in txt:
        fails.append("a secret file that was only planned was reported as already at a second "
                     "location")
    sec2 = {**sec, "secret_files": [{**sec["secret_files"][0],
                                     "verified_at": {"local": "/tmp/d/src/u/.env"}}]}
    if "[verified]" not in render(sec2):
        fails.append("a verified secret copy was not distinguishable from a planned one")
    # a secret sitting on a drive that is OFFLINE this run must still be named
    sec3 = {**sec, "secret_files": [{**sec["secret_files"][0],
                                     "still_at_unrouted_destinations":
                                         {"ext": "/Volumes/X/src/u/.env"}}]}
    if "STILL ON A DESTINATION NOT IN THIS RUN" not in render(sec3):
        fails.append("the report went quiet about a secret on an unplugged drive — the direction "
                     "that matters most for the portable-destination acknowledgement")
    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("status.py selftest: 17 checks — L1 not sold as checksum, L3 declares its rate, "
          "uncommitted/orphaned-entry/dirty all render UNVERIFIED with reasons, run failure and "
          "stale plan in the headline, offline in the headline with drift, oldest-unit "
          "staleness, same-disk label, unreadable state, filename cannot forge a line, excluded "
          "and unclassified units in their own sections, planned-vs-verified secrets, one-way + "
          "restore always present")
    return 0


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    if "--config" not in args:
        print(__doc__, file=sys.stderr)
        return 2
    cfg = _state.load_config(args[args.index("--config") + 1])
    state = _state.ensure_state_dir(cfg["state_dir"])

    if "--record-rework" in args:
        run_id = _state.get_current_run(state)
        j = _state.Journal(state, run_id)
        kind = args[args.index("--kind") + 1] if "--kind" in args else "user_correction"
        note = args[args.index("--note") + 1] if "--note" in args else ""
        j.append("rework", kind=kind, note=note)
        print(f"recorded rework signal: kind={kind}")
        return 0
    if "--rework-log" in args:
        evs = [e for e in _state.read_events(state) if e.get("event") == "rework"]
        if not evs:
            print("no rework signals recorded yet (the collection point exists and is empty)")
        for e in evs:
            print(f"{e.get('ts_iso')}  {e.get('kind')}  {_state.escape_untrusted(e.get('note'))}")
        return 0

    s = collect(cfg)
    if "--json" in args:
        print(json.dumps(s, indent=2, ensure_ascii=False))
    else:
        print(render(s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
