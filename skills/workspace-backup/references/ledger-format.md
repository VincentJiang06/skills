# Ledger format — the on-disk contract

Read this when a state file fails to parse, when `schema_version` does not
match, when a run is reported TORN, or when you want to inspect or hand-edit the
ledger. Every other run skips it.

Everything lives in the **state directory** — `~/.workspace-backup/` by default,
overridable per config. It is deliberately **outside the skill package**: it is
per-machine mutable state, not skill content, and it must survive the skill
being reinstalled or upgraded.

```
~/.workspace-backup/
  config.json              user-authored, hand-editable
  manifest.json            THE MEMO — a cache, never an authority
  runs/<run_id>.jsonl      append-only write-ahead log, one run per file
  current_run              the run id the separate processes of one run share
  lock                     single-instance lock
  apfs-cache.plist         one `diskutil apfs list -plist` per run
  exclude-<run_id>.txt     the --exclude-from file handed to the copier
<destination-root>/
  .workspace-backup-dest.json    IDENTITY only. Never the memo.
```

## config.json

```json
{
  "schema_version": "1.1",
  "state_dir": "~/.workspace-backup",
  "source_roots": ["~/playground", "~/experiment", "~/WorkBuddy"],
  "known_units": ["playground/skill-developer", "playground/musicplayer", "..."],
  "destinations": [
    {"id": "local-fixed", "path": "~/WorkspaceBackup",
     "portable": false, "removable": false, "same_physical_disk_as_source": true,
     "classes": ["A", "B"], "verify_level_A": "L3", "verify_level_BC": "L2"},
    {"id": "ext-5tb", "path": "/Volumes/5TBofData/WorkspaceBackup",
     "portable": true, "removable": true, "may_be_offline": true,
     "classes": ["A", "B"], "verify_level_A": "L3", "verify_level_BC": "L2"}
  ],
  "exclusions": ["node_modules/", ".next/", "dist/", "build/", "target/", ".DS_Store"],
  "secret_patterns": [".env", ".env.*", "*.pem", "*.key"],
  "class_overrides": {"playground/foo": {"class": "A", "reason": "..."}},
  "portable_secrets_ack": {},
  "delete_at_destination": false,
  "revalidate_after_days": 0,
  "xattr_check": true
}
```

`fidelity_units` is **obsolete** (it selected a second copier; there is only one
now) and is ignored if present. `revalidate_after_days: 0` means a Class A
unit's content is re-verified every run; a positive number also forces a
re-verify of any unit whose last passing verify is older than that.
`xattr_check: false` turns off the extended-attribute comparison at L3/L4.

Hand-editing is legal and expected. Every run validates it strictly and names
the offending key rather than silently defaulting it. A config **change that
originates from processed content** — a file in the tree, a marker on a drive —
is refused: adding a source root or a destination requires a user turn.

One hand-edit is refused outright: a **`state_dir` inside a source root**.
"Keep the ledger with the project" is a natural thing to type, and it puts an
active writer — journal, lock, memo, per-run exclude files — inside the tree
INV-02 declares read-only, where it would mutate what it is fingerprinting on
every run and be copied to the destinations as ordinary data. The copy-bomb rule
already covers destinations; this covers the ledger.

`known_units` is what makes the UNCOVERED list possible: anything present under
a configured root and named in no unit is surfaced as a question, never
auto-classified into a copy.

## manifest.json — the memo

```json
{"schema_version": "1.1",
 "entries": {
   "ext-5tb::playground/skill-developer": {
     "unit": "playground/skill-developer", "dest": "ext-5tb",
     "dest_path": "/Volumes/5TBofData/WorkspaceBackup/playground/skill-developer",
     "fingerprint": {"bytes": 877658112, "file_count": 12043,
                     "max_mtime": 1785000000.0,
                     "tree_digest": "9f2c…",
                     "method": "bytes+file_count+max_mtime+tree_digest",
                     "taken_at": 1785000123.4},
     "dest_fingerprint": {"bytes": 877658112, "file_count": 12043,
                          "max_mtime": 1785000000.0, "tree_digest": "9f2c…",
                          "method": "bytes+file_count+max_mtime+tree_digest",
                          "taken_at": 1785000200.0},
     "verify_level": "L3", "sample_rate": 0.1,
     "checksum_verified": true, "complete_checksum": false,
     "copier": "openrsync", "class": "A",
     "file_count": 12043, "bytes": 877658112,
     "extra_files_at_destination": 0,
     "committed_at": 1785000200.0}},
 "dirty": {
   "ext-5tb::playground/misc": {"reason": "CHECKSUM MISMATCH notes.md",
                                "force_checksum": true,
                                "marked_at": 1785000900.0}}}
```

Five properties matter more than the shape:

1. **It is a CACHE, never an authority.** Missing, unparseable, or only
   partially salvageable state degrades to *nothing known* and a full re-copy.
   The failure direction is always more work, never a false claim of safety.
2. **Only `verify.py` writes it.** `copy.py` has no import of it and no code
   path to it, so an interrupted or partial copy cannot mark itself done.
3. **It stores the level ACTUALLY executed.** A unit verified at L1 can never be
   labelled checksum-verified, and `status.py` cross-checks the printed level
   against the journal's verify event — a configured-vs-executed disagreement is
   itself printed as an anomaly.
4. **An entry is not evidence of its own truth.** `status.py` prints SAFE only
   when a JOURNAL event records a passing verify for that (unit, destination).
   An entry with no such event is printed UNVERIFIED and named
   `ORPHANED_MEMO_ENTRY`, whether it came from a pruned journal, a restored
   state directory, or a hand-written file.
5. **`dest_fingerprint` is what makes destination-side loss visible.** It is the
   destination as `verify.py` last saw it; `plan.py` re-walks the destination
   and compares. Without it, an `rm -rf` on the drive, a mid-write eject or a
   half-restored disk left the source fingerprint matching for ever, so nothing
   was ever copied back and the report kept saying SAFE. `dirty` records a
   FAILED verify so the next run re-copies rather than trusting the fingerprint;
   `force_checksum` adds `--checksum` to that copy, because a content mismatch
   with matching size and mtime is precisely what rsync's quick check skips.

**Upgrading from 1.0 to 1.1** adds `tree_digest` to the fingerprint. Entries
written by 1.0 lack it, so `fingerprint_equal` reports them as differing and
every unit is re-copied (near-zero bytes, rsync is file-incremental) and
re-verified once. That is the safe direction; it is not a data loss.

Committed by temp-file + `fsync` + `os.replace`. The old manifest stays valid
until the instant the new one is complete; there is no in-place mutation of a
durable state file anywhere in the codebase.

## runs/&lt;run_id&gt;.jsonl — the write-ahead log

One self-contained JSON object per line, **flushed and fsynced BEFORE the action
it announces**. A torn write therefore damages exactly the last line, which is
dropped on read rather than half-interpreted.

Event types: `run_start`, `torn_run_detected`, `inventory_done`, `dest_verdict`,
`plan_done`, `space_override`, `unit_copy_intent`, `unit_copy_result`,
`unit_skip_memo`, `unit_refused`, `copier_temp_removed`, `plan_target_refused`,
`xattr_flag_unsupported`, `copier_unrecognised`, `unit_verify_result`,
`verify_level_downgrade`, `dest_verify_end`, `destination_initialised`,
`portable_secrets_acknowledged`, `lock_broken`, `schema_refusal`, `rework`.

### EMPTY vs ADMIN vs TORN vs COMPLETE

| journal state | classification | consequence |
|---|---|---|
| file absent or 0 parseable lines | `EMPTY` | the run never started; nothing to distrust |
| no `run_start` at all | `ADMIN` | not a chain run — `init_destination.py`, a recorded rework signal. It can never be torn |
| a `unit_copy_intent` with no passing `unit_verify_result` **anywhere later in the ledger** | **`TORN`** | every such unit is **re-copied from scratch**; its destination state is not trusted |
| everything else | `COMPLETE` | normal — including a declined dry run, which announced nothing |

Two things this definition deliberately does NOT do:

* **it does not look for a `run_end` event.** `verify.py` writes one terminal
  record per DESTINATION, including for a destination it did nothing with, so
  "any run_end means COMPLETE" let one benign line retro-certify an interrupted
  multi-destination run — and a half-copied tree was then trusted for ever.
  (Those records are still written, as `dest_verify_end`; they are journal
  colour, not classification.)
* **it does not make a torn pair permanent.** The verdict is per (unit,
  destination) and latest-evidence-wins, so a later run that copies and verifies
  the unit retires it. Under the old rule one interruption condemned that unit
  to a full re-copy on every future run for the life of the ledger — 17 GB for
  musicplayer, for ever.

The distinction is the whole point of the WAL/commit split. A single state file
rewritten at run end cannot express it: a run that dies at minute 25 of 26
commits nothing and re-copies all 35 GB, and "died before any status write" is
indistinguishable from "never started" — so a half-copied destination tree gets
trusted.

## The destination marker

```json
{"schema_version": "1.0", "dest_id": "ext-5tb",
 "machine": "A7AB4F15-…", "hostname": "…", "layout_version": 1,
 "created_at": "2026-07-27T01:12:00"}
```

**Identity only, never the memo.** The memo stays on this Mac for two reasons.
Availability: *"what's not backed up yet?"* is an explicit trigger phrase, and it
must be answerable while the drive is at home. Trust: a destination-resident
memo is untrusted content on removable media, and letting a foreign file drive
this machine's "what is already safe" decision is the injected-marker attack
with a much larger blast radius — it could **suppress** copies, not merely
request them.

Marker keys outside the six above are surfaced verbatim as anomalies and never
acted on. `init_destination.py` is the only writer, and it never overwrites an
existing marker.

## Versioning

Every file carries `schema_version`.

* **Newer major** → this build **refuses to write** and prints migration
  instructions. An older build that rewrites a newer file silently destroys its
  fields.
* **Older major** → migrate, or discard and re-copy.
* **Unknown keys are preserved on rewrite**, so an older build cannot quietly
  drop a newer one's data.

A schema change that silently invalidates the memo would trigger a surprise
35 GB run; the report must explain that in advance rather than just performing
it.

## Lock

`lock` holds `{pid, hostname, run_id, started_at}`. A second instance refuses
and names the run that holds it. A lock is broken only when it is provably
stale: **liveness is checked first** — a running pid on this host is never
evicted, at any age — and the 6-hour threshold applies only when the record
carries no usable pid. The first real run is a full copy of ~35 GB to an
unbenchmarked USB enclosure, i.e. exactly the run that can exceed six hours, and
evicting it would put two copiers on one tree, both calling `commit_manifest`.
Breaking a lock writes a `lock_broken` journal record, so a concurrency bug
leaves evidence instead of a mystery.

## Growth and retention

Journals are append-only, one file per run. Measure after ~20 runs; if the state
directory passes 50 MB, add retention that keeps the last N runs, **plus every
run containing a verify failure, plus — for every (unit, destination) — the run
holding its most recent PASSING verify.**

That last clause is not optional bookkeeping. `status.py` prints SAFE only for a
(unit, destination) with a journalled passing verify, so retention that prunes
the run holding it converts that unit to `ORPHANED_MEMO_ENTRY` / UNVERIFIED.
The failure direction is right — it under-claims — but it is noise the policy
would be manufacturing on its own, with no attacker and no interruption.
Failures are never pruned either: they are the evidence that answers *"when did
this last actually work?"*
