#!/usr/bin/env python3
"""guard_destination.py — the refusal layer.

This is the one component that says NO, and it is deliberately the one
component that CANNOT WRITE. There is no mkdir, no delete, no open-for-write
anywhere in this file, and an eval asserts that by parsing this source. The
component that refuses must be incapable of the thing it refuses — that is what
makes "zero bytes and no directory created" provable rather than promised.

Exit codes (the contract every caller branches on):
   0  CLEAR                     — safe to write here
  10  OFFLINE                   — absent, or a removable path that is not a
                                  mount point. A NORMAL outcome, not an error.
  20  REFUSED_TIME_MACHINE      — no override exists. --force does not apply.
  21  REFUSED_INSIDE_SOURCE     — the destination resolves inside a source root.
  30  REQUIRES_CONFIRMATION     — foreign machine, changed identity, or no
                                  marker yet (first-run setup).
   2  usage error

Usage:
  guard_destination.py --config C --dest-id ID [--json] [--force] [--plist P]
  guard_destination.py --container-map [--plist P] [--json]
  guard_destination.py --selftest
"""
from __future__ import annotations

import json
import os
import plistlib
import re
import subprocess
import sys

# running any of these by hand must not leave __pycache__ inside the shipped
# package; the internal spawns pass -B for the same reason
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _state  # noqa: E402

CLEAR, OFFLINE, TM, INSIDE_SOURCE, CONFIRM, USAGE = 0, 10, 20, 21, 30, 2

# A Time Machine store announces itself with any of these.
TM_MARKERS = ["backup_manifest.plist", "Backups.backupdb", ".Backup.backupdb"]

# A TM snapshot folder is DATED: /Volumes/backkkup carries 2026-07-27-011541.previous.
# A bare `foo.previous` is an ordinary versioned-file convention (nginx.conf.previous)
# and is not evidence of anything.
TM_PREVIOUS = re.compile(r"^\d{4}-\d{2}-\d{2}-\d{6}\.previous$")

# `.sparsebundle` is the GENERIC macOS sparse disk image format — any encrypted
# image made in Disk Utility. It is Time Machine evidence only when the bundle
# actually contains a Time Machine store. Refusing every disk image produced the
# over-refusal this policy names as its own failure mode: one image anywhere in
# the ancestor chain disabled the destination with no override and a false
# message ("this volume holds a Time Machine backup").
BUNDLE_SUFFIXES = [".sparsebundle", ".backupbundle"]
BUNDLE_TM_EVIDENCE = ["backup_manifest.plist", "Backups.backupdb",
                      "com.apple.TimeMachine.MachineID.plist"]

# macOS writes this when the user DECLINES "use this disk to back up with Time
# Machine?". It means the volume is explicitly NOT a TM store — the opposite of
# what this guard used to conclude from it. Reported as data, never a refusal.
TM_DECLINED_MARKER = ".com.apple.timemachine.donotpresent"

KNOWN_MARKER_KEYS = {"schema_version", "dest_id", "machine", "hostname",
                     "layout_version", "created_at"}
MARKER_NAME = ".workspace-backup-dest.json"

_ESC = {ord("\\"): "\\\\", ord("\n"): "\\n", ord("\r"): "\\r", ord("\t"): "\\t"}
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

_CACHE = {}


def esc(s):
    if s is None:
        return ""
    return _CTRL.sub(lambda m: "\\x%02x" % ord(m.group()), str(s).translate(_ESC))


# ------------------------------------------------------------- read-only fs

def existing_ancestor(path):
    p = os.path.abspath(path)
    while p != "/" and not os.path.exists(p):
        p = os.path.dirname(p)
    return p


def volume_root(path):
    """Walk up while st_dev is constant — the mount point of whatever volume
    this path lives on."""
    p = existing_ancestor(path)
    try:
        dev = os.stat(p).st_dev
    except OSError:
        return p
    for _ in range(64):
        parent = os.path.dirname(p)
        if parent == p:
            return p
        try:
            if os.stat(parent).st_dev != dev:
                return p
        except OSError:
            return p
        p = parent
    return p


def bundle_holds_tm(path):
    """A disk-image bundle is a directory. Look inside it — one listdir — for
    evidence that it is a Time Machine store rather than an ordinary image."""
    try:
        names = set(os.listdir(path))
    except OSError:
        return None
    for ev in BUNDLE_TM_EVIDENCE:
        if ev in names:
            return os.path.join(path, ev)
    return None


def scan_dir_for_tm(d):
    """Returns (tm_hits, notes). A note is something worth REPORTING and never
    worth refusing over."""
    hits, notes = [], []
    try:
        names = os.listdir(d)
    except OSError:
        return hits, notes
    for n in names:
        p = os.path.join(d, n)
        if n in TM_MARKERS:
            hits.append(p)
            continue
        if TM_PREVIOUS.match(n):
            hits.append(p)
            continue
        if any(n.endswith(s) for s in BUNDLE_SUFFIXES):
            inner = bundle_holds_tm(p)
            if inner:
                hits.append(inner)
            else:
                notes.append({
                    "code": "DISK_IMAGE_PRESENT",
                    "message": (f"{esc(p)} is a disk-image bundle with no Time Machine store "
                                f"inside it (no backup_manifest.plist / Backups.backupdb / "
                                f"com.apple.TimeMachine.MachineID.plist). Reported, not "
                                f"refused: an ordinary encrypted image is not a backup store."),
                    "source": esc(p)})
            continue
        if n == TM_DECLINED_MARKER:
            notes.append({
                "code": "TIME_MACHINE_DECLINED_MARKER",
                "message": (f"{esc(p)} is the marker macOS writes when Time Machine was "
                            f"DECLINED for this disk. It is evidence the volume is NOT a Time "
                            f"Machine store, so it is reported here and never treated as a "
                            f"refusal."),
                "source": esc(p)})
    return hits, notes


def tm_evidence(dest_path):
    """Scan the destination itself, every existing ancestor, and the volume
    root. A TM store's markers sit at the volume root while the configured
    destination is usually a subdirectory of it.

    Returns (hits, notes)."""
    seen, hits, notes = set(), [], []
    cands = []
    p = os.path.abspath(dest_path)
    vroot = volume_root(p)
    while True:
        cands.append(p)
        parent = os.path.dirname(p)
        if parent == p or len(cands) > 64:
            break
        p = parent
        if os.path.abspath(vroot) == os.path.abspath(p):
            cands.append(p)
            break
    for d in cands:
        if d in seen or not os.path.isdir(d):
            continue
        seen.add(d)
        h, n = scan_dir_for_tm(d)
        hits.extend(h)
        notes.extend(n)
    return hits, notes


def read_json_file(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f), None
    except FileNotFoundError:
        return None, "absent"
    except Exception as e:
        return None, f"unparseable: {e}"


def machine_uuid():
    if "uuid" in _CACHE:
        return _CACHE["uuid"]
    val = ""
    try:
        out = subprocess.run(["/usr/sbin/ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                             capture_output=True, text=True, timeout=10).stdout
        m = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', out)
        if m:
            val = m.group(1)
    except Exception:
        val = ""
    _CACHE["uuid"] = val
    return val


# ------------------------------------------------------- APFS container map

def load_apfs(plist_path=None):
    key = plist_path or "@live"
    if key in _CACHE:
        return _CACHE[key]
    data = None
    if plist_path:
        try:
            with open(plist_path, "rb") as f:
                data = plistlib.load(f)
        except Exception:
            data = None
    if data is None:
        try:
            out = subprocess.run(["/usr/sbin/diskutil", "apfs", "list", "-plist"],
                                 capture_output=True, timeout=30).stdout
            data = plistlib.loads(out)
        except Exception:
            data = {}
    _CACHE[key] = data
    return data


def container_map(plist_path=None):
    """Free space is a property of the CONTAINER, not the volume. Two volumes
    in one container report the SAME free bytes — summing them is the F4 bug
    (this machine: disk7s1 /Volumes/backkkup + disk7s2 /Volumes/2TBofData)."""
    data = load_apfs(plist_path)
    out = {}
    for c in (data or {}).get("Containers", []) or []:
        ref = c.get("ContainerReference")
        vols = c.get("Volumes", []) or []
        out[ref] = {
            "free_bytes": c.get("CapacityFree"),
            "capacity_bytes": c.get("CapacityCeiling"),
            "volumes": [v.get("DeviceIdentifier") for v in vols],
            "volume_names": [v.get("Name") for v in vols],
            "roles": {v.get("DeviceIdentifier"): (v.get("Roles") or []) for v in vols},
            "independent": len([v for v in vols if v.get("DeviceIdentifier")]) <= 1,
        }
    return out


def device_for_path(path):
    p = existing_ancestor(path)
    try:
        out = subprocess.run(["/bin/df", "-P", p], capture_output=True, text=True, timeout=20).stdout
        line = out.strip().splitlines()[-1]
        dev = line.split()[0]
        return dev[len("/dev/"):] if dev.startswith("/dev/") else dev
    except Exception:
        return None


def container_for_device(cmap, dev):
    if not dev:
        return None
    for ref, info in cmap.items():
        if dev in (info.get("volumes") or []):
            return ref
    return None


def case_sensitive(path):
    """Re-queried every run: a drive can be reformatted between runs (U5).

    `diskutil info` only resolves a MOUNT POINT, so it must be asked about the
    volume root, not about the configured subdirectory. Asking about
    `~/WorkspaceBackup` returned an error plist for both shipped destinations,
    which made this measurement silently answer 'unknown' for ever."""
    try:
        out = subprocess.run(["/usr/sbin/diskutil", "info", "-plist", volume_root(path)],
                             capture_output=True, timeout=20).stdout
        d = plistlib.loads(out)
        name = str(d.get("FilesystemName", "")) + " " + str(d.get("FilesystemUserVisibleName", ""))
        if "case-sensitive" in name.lower():
            return True
        if name.strip():
            return False
    except Exception:
        pass
    return None


def statvfs_space(path):
    """Free/capacity for ANY mounted filesystem — HFS+, exFAT, NTFS, SMB — where
    the APFS container map has nothing to say. Read-only."""
    try:
        st = os.statvfs(existing_ancestor(path))
        return st.f_bavail * st.f_frsize, st.f_blocks * st.f_frsize
    except OSError:
        return None, None


# ------------------------------------------------------------------- guard

def parse_marker(path, dest_id):
    """Read the destination marker as DATA. Returns (anomalies, marker_present,
    marker_valid, needs_confirm, known_fields). Called BEFORE any refusal
    returns, so that refusing one thing never suppresses the report of another —
    a Time Machine volume that ALSO carries an instruction-bearing marker must
    produce both findings, not just the first one."""
    anomalies = []
    marker_path = os.path.join(path, MARKER_NAME)
    marker, err = read_json_file(marker_path)
    needs_confirm = False
    known = {}
    if marker is None:
        if os.path.isdir(path):
            anomalies.append({
                "code": "MISSING_MARKER",
                "message": (f"no {MARKER_NAME} at {esc(path)} ({esc(err)}). Identity is the "
                            f"marker, not the path. Delete-at-destination is refused for a "
                            f"destination without a valid own marker."),
                "source": esc(marker_path)})
        return anomalies, False, False, False, known
    if not isinstance(marker, dict):
        anomalies.append({"code": "MARKER_NOT_AN_OBJECT",
                          "message": f"{esc(marker_path)} is not a JSON object",
                          "source": esc(marker_path)})
        return anomalies, True, False, True, known
    unknown = {k: v for k, v in marker.items() if k not in KNOWN_MARKER_KEYS}
    if unknown:
        anomalies.append({
            "code": "UNKNOWN_MARKER_KEYS",
            "message": (f"{esc(marker_path)} carries {len(unknown)} key(s) this build does "
                        f"not know. They are reported as DATA and never acted on — no "
                        f"instruction found on removable media can add a source root, "
                        f"redirect a destination, or enable deletion."),
            "source": esc(marker_path),
            "keys": sorted(unknown.keys()),
            "verbatim": {k: esc(v) for k, v in unknown.items()}})
    mid = marker.get("machine")
    mine = machine_uuid()
    if mid and mine and mid != mine:
        needs_confirm = True
        anomalies.append({
            "code": "FOREIGN_MACHINE",
            "message": (f"{esc(marker_path)} names machine {esc(mid)}; this machine is "
                        f"{esc(mine)} ({esc(marker.get('hostname'))} vs "
                        f"{esc(os.uname().nodename)}). Two machines writing one destination "
                        f"root corrupts both memos. Refused until you confirm in chat."),
            "source": esc(marker_path)})
    elif mid and not mine:
        anomalies.append({"code": "MACHINE_UUID_UNAVAILABLE",
                          "message": "could not read this machine's UUID; identity check is degraded",
                          "source": "ioreg"})
    if marker.get("dest_id") and marker.get("dest_id") != dest_id:
        needs_confirm = True
        anomalies.append({
            "code": "DEST_ID_MISMATCH",
            "message": (f"{esc(marker_path)} says dest_id={esc(marker.get('dest_id'))}, "
                        f"config says {esc(dest_id)}. A path change is exactly what an "
                        f"accident or an attacker looks like; confirm the resolved path."),
            "source": esc(marker_path)})
    known = {k: esc(v) for k, v in marker.items() if k in KNOWN_MARKER_KEYS}
    return anomalies, True, (not needs_confirm and not err), needs_confirm, known


def evaluate(cfg, dest, forced, plist_path=None):
    anomalies = []
    path = os.path.abspath(dest["path"])
    roots = [os.path.abspath(r) for r in cfg.get("source_roots", [])]
    res = {
        "dest_id": dest.get("id"), "path": path, "verdict": None,
        "anomalies": anomalies,
        "source_roots_in_effect": roots,
        "portable": bool(dest.get("portable")),
        "removable": bool(dest.get("removable")),
        "same_physical_disk_as_source": bool(dest.get("same_physical_disk_as_source")),
        "force_requested": bool(forced),
    }

    # Read the marker FIRST, so a refusal below never swallows what else is here.
    marker_anoms, marker_present, marker_valid, marker_confirm, known_fields = \
        parse_marker(path, dest.get("id"))
    res["marker_present"] = marker_present
    res["marker_valid"] = False
    if known_fields:
        res["marker"] = known_fields

    # -- 1. copy bomb: the destination resolves inside a source root. No override.
    for r in roots:
        rp = os.path.realpath(r)
        dp = os.path.realpath(existing_ancestor(path))
        target = os.path.realpath(path)
        if target == rp or target.startswith(rp + os.sep) or dp == rp or dp.startswith(rp + os.sep):
            anomalies.append({
                "code": "DESTINATION_INSIDE_SOURCE",
                "message": (f"the destination {esc(path)} resolves inside the source root "
                            f"{esc(r)} — copying a tree into itself. Refused; --force does "
                            f"not apply to this."),
                "source": esc(r)})
            res["verdict"] = "REFUSED_INSIDE_SOURCE"
            return res, INSIDE_SOURCE

    # -- 2. Time Machine. This is the ONE refusal with no override anywhere.
    hits, tm_notes = tm_evidence(path)
    anomalies.extend(tm_notes)
    if hits:
        anomalies.append({
            "code": "TIME_MACHINE_STORE",
            "message": (f"refusing to write to {esc(path)}: this volume holds a Time Machine "
                        f"backup ({', '.join(esc(h) for h in hits[:4])}). A mirror here — "
                        f"especially with delete-at-destination — would prune this machine's "
                        f"only historical backup, and the loss stays invisible until a restore "
                        f"is attempted. This is the one refusal --force does NOT override; the "
                        f"flag is parsed only so this sentence can be printed."),
            "source": esc(path),
            "evidence": [esc(h) for h in hits],
            "force_was_requested": bool(forced),
            "force_applies": False})
        anomalies.extend(marker_anoms)
        res["verdict"] = "REFUSED_TIME_MACHINE"
        return res, TM

    # -- 3. mount identity. os.stat().st_dev, never os.path.exists.
    exists = os.path.isdir(path)
    boot_dev = None
    try:
        boot_dev = os.stat("/").st_dev
    except OSError:
        pass
    anc = existing_ancestor(path)
    try:
        anc_dev = os.stat(anc).st_dev
    except OSError:
        anc_dev = None
    res["st_dev"] = anc_dev
    res["boot_st_dev"] = boot_dev
    res["is_mount_point_volume"] = (anc_dev is not None and anc_dev != boot_dev)

    if dest.get("removable"):
        if not res["is_mount_point_volume"]:
            anomalies.append({
                "code": "NOT_A_MOUNT_POINT",
                "message": (f"{esc(path)} is not on a mounted volume — its nearest existing "
                            f"ancestor {esc(anc)} sits on the boot filesystem (st_dev "
                            f"{anc_dev} == /'s {boot_dev}). A directory wearing a volume's "
                            f"name is OFFLINE, not a destination: creating a tree here would "
                            f"put the copy on the internal SSD while you believed it was on "
                            f"the external drive. Zero directories created, zero bytes written."),
                "source": esc(anc)})
            anomalies.extend(marker_anoms)
            res["verdict"] = "OFFLINE"
            return res, OFFLINE
        if not exists:
            anomalies.append({
                "code": "DESTINATION_ROOT_ABSENT",
                "message": f"the volume is mounted but {esc(path)} does not exist yet — first-run setup.",
                "source": esc(path)})
            res["verdict"] = "REQUIRES_CONFIRMATION"
            return res, CONFIRM
    else:
        if not exists:
            anomalies.append({
                "code": "NEEDS_INIT",
                "message": (f"{esc(path)} does not exist. Setup never guesses a destination: "
                            f"run init_destination.py --dest-id {esc(dest.get('id'))} --confirm "
                            f"after you have confirmed this exact path."),
                "source": esc(path)})
            anomalies.extend(marker_anoms)
            res["verdict"] = "REQUIRES_CONFIRMATION"
            return res, CONFIRM

    # -- 4. the marker (already parsed above, as DATA)
    anomalies.extend(marker_anoms)
    res["marker_valid"] = marker_valid
    needs_confirm = marker_confirm

    # -- 5. container truth (never per-volume df arithmetic) + case sensitivity
    cmap = container_map(plist_path)
    dev = device_for_path(path)
    ref = container_for_device(cmap, dev)
    res["device"] = dev
    res["container"] = ref
    res["free_source"] = None
    if ref and ref in cmap:
        info = cmap[ref]
        res["free_bytes"] = info["free_bytes"]
        res["capacity_bytes"] = info["capacity_bytes"]
        res["free_source"] = "apfs-container"
        res["pooled_with"] = [v for v in (info["volumes"] or []) if v != dev]
        res["independent"] = info["independent"]
        if not info["independent"]:
            names = ", ".join(f"{esc(v)} ({esc(n)})" for v, n in
                              zip(info["volumes"] or [], info["volume_names"] or []))
            has_tm_role = any("Backup" in r for r in (info.get("roles") or {}).values())
            anomalies.append({
                "code": "SHARED_APFS_CONTAINER",
                "message": (f"{esc(dev)} shares APFS container {esc(ref)} with {names}. Their "
                            f"free space is ONE pool of "
                            f"{_state.human_bytes(info['free_bytes'])}, not one pool each — "
                            f"writing to either shrinks the other, and these are not "
                            f"independent copies."
                            + (" One of them carries a Time Machine role: a large write here "
                               "shrinks that store's headroom." if has_tm_role else "")),
                "source": esc(ref)})
    if res.get("free_bytes") is None:
        free, cap = statvfs_space(path)
        if free is not None:
            res["free_bytes"] = free
            res["capacity_bytes"] = cap
            res["free_source"] = "statvfs"
            res["independent"] = True
            res["pooled_with"] = []
            anomalies.append({
                "code": "SPACE_FROM_STATVFS",
                "message": (f"{esc(path)} is not on an APFS container this build can map "
                            f"(HFS+, exFAT, NTFS, SMB, or diskutil unavailable). Free space was "
                            f"measured with statvfs on the mounted volume instead: "
                            f"{_state.human_bytes(free)} free of {_state.human_bytes(cap)}. It "
                            f"is a per-VOLUME figure, so the pooled-container reasoning does "
                            f"not apply here and the plan says so."),
                "source": esc(path)})
        else:
            anomalies.append({
                "code": "SPACE_UNMEASURED",
                "message": (f"free space at {esc(path)} could not be measured by either the "
                            f"APFS container map or statvfs. The space gate cannot pass a "
                            f"destination it never measured."),
                "source": esc(path)})
    res["case_sensitive"] = case_sensitive(path)
    if res["case_sensitive"] is None:
        anomalies.append({
            "code": "CASE_SENSITIVITY_UNKNOWN",
            "message": (f"the filesystem of {esc(path)}'s volume ({esc(volume_root(path))}) did "
                        f"not report a name, so its case sensitivity is UNKNOWN rather than "
                        f"insensitive. plan.py treats unknown as the losing direction and runs "
                        f"the collision pre-scan anyway."),
            "source": esc(volume_root(path))})
    elif res["case_sensitive"] and not dest.get("case_collision_ack"):
        anomalies.append({
            "code": "CASE_SENSITIVE_DESTINATION",
            "message": (f"{esc(path)} is on a case-SENSITIVE filesystem. Copying INTO a "
                        f"case-sensitive destination cannot merge two files; the losing "
                        f"direction is a case-sensitive SOURCE copied here, and the collision "
                        f"pre-scan runs against the source either way."),
            "source": esc(path)})

    if needs_confirm:
        res["verdict"] = "REQUIRES_CONFIRMATION"
        return res, CONFIRM
    res["verdict"] = "CLEAR"
    return res, CLEAR


# --------------------------------------------------------------- selftest

def _selftest():
    """Known-bad inputs, each of which MUST be refused. A guard that clears a
    sabotaged fixture proves nothing.

    The fixtures are SHIPPED READ-ONLY under evals/fixtures/ rather than created
    here, because this file may not contain a single write call — that structural
    property is itself the guarantee behind "zero bytes and no directory created",
    and a selftest that mkdir'd its own fixtures would destroy it."""
    fixtures = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            "evals", "fixtures")
    fails = []

    def cfg_for(d, roots):
        return {"source_roots": roots, "destinations": [d]}

    elsewhere = ["/usr/share"]

    # 1. a Time Machine marker must refuse, with AND without --force
    d = {"id": "tm", "path": os.path.join(fixtures, "tmvol")}
    for forced in (False, True):
        r, code = evaluate(cfg_for(d, elsewhere), d, forced)
        if code != TM:
            fails.append(f"backup_manifest.plist with force={forced} returned {code}, want {TM}")
        if forced and r["anomalies"][0].get("force_applies") is not False:
            fails.append("the refusal did not state that --force does not apply")

    # 2. a DATED *.previous snapshot folder must refuse
    d2 = {"id": "tm2", "path": os.path.join(fixtures, "tmvol-previous")}
    _, code = evaluate(cfg_for(d2, elsewhere), d2, True)
    if code != TM:
        fails.append(f"a dated .previous snapshot folder returned {code}, want {TM}")

    # 2b. the same code must NOT refuse over an ordinary disk image or an
    #     ordinary versioned file (known-bad input for OVER-refusal)
    d2b = {"id": "img", "path": os.path.join(fixtures, "ordinary-bundle")}
    r2b, code = evaluate(cfg_for(d2b, elsewhere), d2b, False)
    codes2b = [a["code"] for a in r2b["anomalies"]]
    if code == TM:
        fails.append(f"an ordinary .sparsebundle disk image was refused as a Time Machine "
                     f"store: {codes2b}")
    if "DISK_IMAGE_PRESENT" not in codes2b:
        fails.append(f"the disk image was not reported as data: {codes2b}")
    if "TIME_MACHINE_DECLINED_MARKER" not in codes2b:
        fails.append(f"{TM_DECLINED_MARKER} — which means Time Machine was DECLINED for this "
                     f"disk — was not surfaced with its real meaning: {codes2b}")
    # ... but a bundle that really holds a TM store must still refuse
    d2c = {"id": "tmbundle", "path": os.path.join(fixtures, "tm-bundle")}
    _, code = evaluate(cfg_for(d2c, elsewhere), d2c, True)
    if code != TM:
        fails.append(f"a .sparsebundle CONTAINING a Time Machine store returned {code}, want {TM}")

    # 3. a destination inside a source root must refuse
    d3 = {"id": "bomb", "path": os.path.join(fixtures, "clean-dest")}
    _, code = evaluate(cfg_for(d3, [fixtures]), d3, True)
    if code != INSIDE_SOURCE:
        fails.append(f"copy bomb returned {code}, want {INSIDE_SOURCE}")

    # 4. a removable path on the boot filesystem must be OFFLINE, never CLEAR,
    #    and must still not exist afterwards
    ghost = os.path.join(fixtures, "clean-dest", "NOT-A-MOUNT")
    d4 = {"id": "ext", "path": ghost, "removable": True}
    _, code = evaluate(cfg_for(d4, elsewhere), d4, False)
    if code != OFFLINE:
        fails.append(f"a removable path on the boot filesystem returned {code}, want {OFFLINE}")
    if os.path.exists(ghost):
        fails.append("the guard created the destination directory — it must be incapable of that")

    # 5. an ordinary clean destination must NOT be refused (no over-refusal),
    #    and its free space must actually be MEASURED, from a named source
    d5 = {"id": "ok", "path": os.path.join(fixtures, "clean-dest")}
    r5, code = evaluate(cfg_for(d5, elsewhere), d5, False)
    if code != CLEAR:
        fails.append(f"a clean destination returned {code} ({r5['verdict']}), want CLEAR — "
                     f"the guard over-refuses: {[a['code'] for a in r5['anomalies']]}")
    if not r5.get("free_bytes") or r5.get("free_source") not in ("apfs-container", "statvfs"):
        fails.append(f"free space was not measured for a clean destination: "
                     f"free={r5.get('free_bytes')} source={r5.get('free_source')}")
    if r5.get("case_sensitive") is None:
        fails.append("case sensitivity was left unknown for a destination on the boot volume — "
                     "diskutil must be asked about the VOLUME ROOT, not about a subdirectory")

    # 6. a marker's unknown key must be surfaced verbatim and never acted on,
    #    and a foreign machine UUID must require confirmation
    d6 = {"id": "ext-5tb", "path": os.path.join(fixtures, "marker-injected")}
    r6, code = evaluate(cfg_for(d6, elsewhere), d6, False)
    codes = [a["code"] for a in r6["anomalies"]]
    if "UNKNOWN_MARKER_KEYS" not in codes:
        fails.append("an unknown marker key was not surfaced as an anomaly")
    if "FOREIGN_MACHINE" not in codes:
        fails.append("a foreign machine UUID did not require confirmation")
    if code != CONFIRM:
        fails.append(f"an injected foreign marker returned {code}, want {CONFIRM}")
    if ".ssh" in json.dumps(r6["source_roots_in_effect"]):
        fails.append("the marker's instruction was adopted into the source roots")
    if not any(".ssh" in json.dumps(a.get("verbatim", {})) for a in r6["anomalies"]):
        fails.append("the injected note was not reported verbatim as data")

    # 7. container arithmetic must be pooled, never summed
    cm = {"disk9": {"free_bytes": 100, "capacity_bytes": 200,
                    "volumes": ["disk9s1", "disk9s2"], "volume_names": ["a", "b"],
                    "roles": {}, "independent": False}}
    if container_for_device(cm, "disk9s2") != "disk9":
        fails.append("container_for_device failed to map a volume to its container")
    if container_for_device(cm, "disk4s1") is not None:
        fails.append("container_for_device invented a container for an unknown device")

    # 8. the real captured plist must yield ONE pooled figure for disk7
    real = os.path.join(fixtures, "diskutil-apfs-disk7-20260727.plist")
    if os.path.exists(real):
        cm2 = container_map(real)
        c7 = cm2.get("disk7") or {}
        if sorted(c7.get("volumes") or []) != ["disk7s1", "disk7s2"]:
            fails.append(f"captured plist: disk7 volumes = {c7.get('volumes')}")
        if c7.get("independent") is not False:
            fails.append("captured plist: disk7 was reported independent despite two volumes")
    else:
        fails.append("the captured real diskutil plist fixture is missing")

    if fails:
        for f in fails:
            print("SELFTEST FAIL: " + f)
        return 1
    print("guard_destination.py selftest: 11 checks (7 refusals incl. a TM-bearing bundle, "
          "3 non-over-refusals incl. an ordinary disk image and the DECLINED marker, measured "
          "free space + case sensitivity, 1 pooled-container), each against a known-bad input, "
          "zero writes performed")
    return 0


def main():
    args = sys.argv[1:]
    if "--selftest" in args:
        return _selftest()
    plist_path = args[args.index("--plist") + 1] if "--plist" in args else None
    as_json = "--json" in args

    if "--container-map" in args:
        out = {"containers": container_map(plist_path)}
        print(json.dumps(out, indent=2))
        return 0

    if "--config" not in args or "--dest-id" not in args:
        print(__doc__, file=sys.stderr)
        return USAGE
    cfg_path = args[args.index("--config") + 1]
    dest_id = args[args.index("--dest-id") + 1]
    forced = "--force" in args
    try:
        cfg = _state.load_config(cfg_path)
    except Exception as e:
        print(f"cannot read config: {e}", file=sys.stderr)
        return USAGE
    dest = _state.dest_by_id(cfg, dest_id)
    if dest is None:
        print(f"no destination with id {dest_id!r} in {cfg_path}", file=sys.stderr)
        return USAGE

    res, code = evaluate(cfg, dest, forced, plist_path)
    res["exit_code"] = code
    if as_json:
        print(json.dumps(res, indent=2, ensure_ascii=False))
    else:
        print(f"{dest_id}: {res['verdict']}  ({res['path']})")
        for a in res["anomalies"]:
            print(f"  [{a['code']}] {a['message']}")
    return code


if __name__ == "__main__":
    sys.exit(main())
