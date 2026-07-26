# Changelog — workspace-backup

All notable changes to this skill. Dates are the build date on the machine the
measurements were taken from.

## 0.2.1 — 2026-07-27 (conductor repair after the re-attack round)

Three fresh lenses re-attacked the 0.2.0 repair. They confirmed 39 of the
original findings genuinely fixed — including every way I could steer a write
out of the guarded destination, and the orphaned-memo SAFE claim — but they
found that **the repair itself had introduced two P1s**, one of which destroys
data. Both were reproduced by the conductor before being fixed, and both now
carry a mutant so they cannot come back quietly.

### Fixed — P1: the temp-artifact sweep deleted real destination files

0.2.0 fixed "an interrupted copier's debris wedges the unit forever" **twice**:
`verify.py` classifies the debris as `temp_artifacts` and does not fail the unit
(sufficient on its own), and `copy.py` additionally *deleted* anything matching
the temp pattern. That second fix was unnecessary and destructive.

`TEMP_ARTIFACT` is `^\.(.+)\.[A-Za-z0-9]{6,12}$`, which matches `.env.production`
and `.env.staging` exactly as readily as `.big.bin.xdt2Z6kA96`. The only guard
was "skip if that name still exists in the source" — so **deleting, or merely
renaming, a source file destroyed its destination copy on the next ordinary
run**, while `delete_at_destination` was `false` and the report printed
`RUN OK` / `SAFE`. Reproduced end to end: `.env.production` (containing a
password) and `.env.staging` both vanished from the mirror, the latter only
because it was renamed to `.env.stage`.

That inverts the promise the local mirror is sold on. No filename pattern can
separate a copier's debris from a user's dotfile, because the shapes genuinely
overlap — so the authority to remove anything at the destination stays where the
user put it: `delete_at_destination`. `sweep_copier_temp_files` now **reports and
never deletes**; the debris is named in `status` and left on disk, because a
bounded visible space leak is strictly better than an invisible deletion.
Guarded by eval `L4-29`, by a mutant, and by a structural check in `copy.py
--selftest` that fails if any deletion call reappears in the function body.
`L4-24` was rewritten to assert *more* than before (debris is reported, does not
wedge the unit, **and is still on disk**) rather than being weakened.

### Fixed — P1: a vanished source verified as SAFE

`verify.py` coerced a missing source directory to an *empty* source, compared
nothing to nothing, passed, and committed a memo entry — so a source root that
unmounted mid-run, or a project renamed while a long run was in flight, printed
`SAFE` over a destination holding nothing. A source that cannot be read is
unverifiable, never verified: it now fails with `SOURCE UNREADABLE`. Guarded by
eval `L4-30` and a mutant.

### Honest status

78/78 evals, 19 mutants all discriminating, 8/8 script selftests, and all four
pipeline gates re-run independently by the conductor. The re-attack also left
**5 still-broken P2/P3 items and ~27 further new P2/P3 findings** that are NOT
fixed here — see `README.md` § Known limitations. Verdict remains
**candidate**, not industrial: this is a first-run-supervised tool.

## 0.2.0 — 2026-07-27 (repair after the five-lens battery)

67 findings and 13 flags from five independent attack lenses. 14 were P1, and
they reduced to six root causes. Every behavioural fix below was written
red-first: the eval case was added, captured FAILING against a byte-identical
snapshot of the 0.1.0 scripts
(`dev-workspace/backup-skill-build/red/repair-red-20260727.txt`), and only then
fixed. Harness: **54 → 76 cases**, mutants **9 → 17**.

### Fixed — P1

- **plan.json was authority over where bytes land.** The guard cleared the
  CONFIG destination while `copy.py` and `verify.py` took their target from
  `plan.json`, and nothing compared the two — so a stale plan (the ordinary
  case: the destination path changed in `config.json`) wrote to, and could
  prune with `--delete`, a path the guard never saw. A hand-edited plan reached
  a Time Machine store at exit 0, and a plan whose `dest_path` was the SOURCE
  made `verify.py` agree with itself at L4 and commit "complete byte-identity"
  with zero bytes copied. Both writers now derive the target from the guarded
  config root + unit id and exit `11` on any disagreement. (`L4-15`, `L4-16`)
- **SAFE was printed from state alone.** `status.py` treated the existence of a
  memo entry as SAFE and fell back to the entry's SELF-CLAIMED verify level when
  no journal event existed — the exact state the documented journal retention
  produces on its own. SAFE now requires a journalled passing verify; an
  unsupported entry prints UNVERIFIED and is named `ORPHANED_MEMO_ENTRY`; the
  unit-level level is the WEAKEST across destinations, not the first.
  (`L4-17`, `L4-28`)
- **The documented status-only chain reported an empty universe.** `status.py`
  looked for the plan inside the CURRENT run only, so "what is not backed up
  yet?" after a fresh inventory printed 0 units, 0 secrets, 0 excluded bytes and
  `(none)` under NOT SAFE — a false all-clear. It now uses the latest plan in
  the ledger and says when that plan is not from this run; the documented chain
  is `inventory → plan → status`, because `plan.py` is the step that observes
  the destination. (`L4-18`)
- **Destination-side loss was undetectable and unrepairable.** `changed` came
  from the SOURCE fingerprint alone; nothing ever looked at the destination when
  the source was unchanged, so an `rm -rf` on the drive, a mid-write eject or a
  half-restored disk left Class B "safe" for ever and Class A permanently red
  with no code path that copied the bytes back. `verify.py` now records a
  destination-side fingerprint, `plan.py` re-walks the destination for every
  unchanged unit, a FAILED verify marks the unit dirty (with `--checksum` on the
  repair copy when the failure was content), and the fingerprint gained a
  `tree_digest` so a pure RENAME is no longer invisible. (`L4-19`, `L4-20`,
  `L4-21`)
- **TORN was inverted.** A run counted COMPLETE if ANY `run_end` existed, and
  `verify.py` writes one per destination including for a destination it skipped
  — so one benign line retro-certified an interrupted multi-destination run.
  Meanwhile every install and every declined dry run ended TORN, so the alarm
  was permanently on. Now: `EMPTY` / `ADMIN` / `TORN` / `COMPLETE`, where TORN
  means an announced copy that never reached a passing verify, and a torn pair
  RETIRES when a later run verifies it. (`L2-16`, `L4-22`, `L4-23`)
- **The first `--go` copy of any unit with a CJK or emoji filename crashed.**
  openrsync's `--itemize-changes` output is not valid UTF-8 for such names and
  `copy.py` decoded it strictly; the traceback killed the run and every later
  unit was never attempted. This user's workspace contains `小蒋租房` and
  `研究生`. Parsed as bytes now, with openrsync's `\#NNN` octal escapes decoded,
  so the byte accounting no longer silently drops those files either. (`L1-15`)
- **An interrupted copy wedged the unit for ever.** The orphaned
  `.NAME.XXXXXXXXXX` temp file was reported UNEXPECTED on every later run, so
  the unit was never committed and was re-copied in full each time — while
  SKILL.md forbids hand-writing the `rm`. `verify.py` now names copier debris
  instead of failing on it, and `copy.py` sweeps it (guarded: derived path only,
  valid marker only, and only where no source file of that name exists).
  (`L4-24`)
- **The ditto branch rested on a false premise.** `-E` IS accepted by this
  machine's openrsync and DOES preserve extended attributes and resource forks,
  with the full emitted flag set and exclusions intact — re-measured against a
  plain `-a` control. So the second copier is gone: it had no exclude mechanism,
  copied "fidelity" units WHOLE while every report claimed the exclusions
  applied (measured 9,000× space undercount in a 9 MB fixture), and exited 1 on
  any file with a `deny delete` ACL. One copy path now, the flag PROBED at
  runtime, and `verify.py` compares extended-attribute names on sampled files
  because no checksum can see that loss. (`L1-13`, `L1-16`)
- **A unit that dropped out of routing kept its old SAFE.** One
  permission-denied file, one file deleted by a running build mid-walk, or one
  `git worktree add` demotes a unit to `class=unknown`, which routes it nowhere.
  It is now surfaced under NOT CLASSIFIED and can never be reported safe.
  (`L4-28`)

### Fixed — P2

- **Time Machine over-refusal.** `.sparsebundle` / `.backupbundle` are the
  generic macOS disk-image format, and the ancestor scan reaches `~`, `/Users`
  and `/` — so one encrypted image in the home directory permanently disabled
  the local destination, with no override and a false message. Bundles are now
  evidence only when they CONTAIN a TM store, `*.previous` only when dated.
  `.com.apple.timemachine.donotpresent` is written when the user DECLINED Time
  Machine for that disk, i.e. it means the opposite of what the guard concluded;
  it is now reported, not refused. (`L1-03`, `L1-17`)
- **The space gate failed open.** Off APFS — HFS+, exFAT, NTFS, SMB — free
  space was unknown and `fits` was hard-coded true. Now `statvfs` is the
  measured fallback, the verdict names its `free_source`, an unmeasurable
  destination is BLOCKED, and `--free-bytes-override` leaves a
  `SPACE_VERDICT_OVERRIDDEN` trail. The 10 GiB headroom floor no longer makes
  small volumes unusable (5% with a 64 MiB floor below 100 GiB). (`L2-17`)
- **Case sensitivity was unmeasurable and guarded the safe direction.**
  `diskutil info` only resolves mount points, so both shipped destinations
  answered "unknown" for ever; and the collision pre-scan ran when the
  DESTINATION was case-sensitive, which is the direction where nothing can
  merge. Now queried on the volume root, run when the destination is
  case-INsensitive or unknown, and detected during `inventory.py`'s existing
  walk (no extra I/O).
- **A live 6-hour-old lock could be broken** because the age test
  short-circuited ahead of the liveness test — two copiers on one tree, both
  committing the memo. Liveness is checked first now.
- **L3 never accumulated coverage** (fixed stride, same tenth for ever) and
  structurally never reached the last files of a unit. The sample now rotates
  deterministically per run and always includes the tail.
- **Class C was reported as unsafe** on every run while its "reclaimed size"
  read 0 B; excluded units now appear in EXCLUSIONS with their size and are not
  counted among the backed-up units. (`L4-26`)
- **A new top-level project whose name matched an exclusion pattern**
  (`build/`, `target/`) appeared in NO artifact at all — not as a unit, not as
  UNCOVERED, not in the excluded bytes. It is now reported as UNCOVERED naming
  the pattern that hid it.
- **Dangling symlinks failed L3/L4 for ever** although rsync copied them
  faithfully; symlinks are compared by target now. **Extra destination files**
  (any source deletion, with `delete_at_destination` off) failed the unit for
  ever; they are reported, and are a failure only when delete is on.
- **A read-only destination crashed the run** with an unhandled
  `PermissionError` and skipped every remaining unit; it is a per-unit failure
  now. (`L4-25`)
- **A `--go` run that copied nothing printed nothing.** It prints a summary.
- **`--level` below the configured level was silent** — and the one anomaly
  designed to catch a level disagreement was explicitly suppressed when an
  override was used. `VERIFY_LEVEL_DOWNGRADE` is now derived from the recorded
  state, so it fires whether or not the downgrade was deliberate, and clears
  when a proper verify replaces it. (`L4-27`)
- **Secrets were over- and under-counted**: the portable-drive consent gate
  counted secrets in units routed nowhere, and every report said a secret was
  "NOW AT A SECOND LOCATION" after a dry run that wrote nothing. The report now
  separates `[verified]` from `planned only, NOT yet verified`.
- **Layer desync fixed**: the exit-code table now covers every script (0/1/2/3/
  4/5/6/7/8/9/10/11/20/21/30), "Class C" means one thing, the 659 GiB → 657.6
  GiB unit-conversion error is corrected in three files, the node_modules and
  secret-file anchors were re-measured (43 dirs / 5.42 GiB, 34 secret files —
  the old 23 / ~4 GB / 20 were wrong), and this changelog's own "748-char
  description" claim is now the measured 598.

### Changed

- Schema **1.0 → 1.1**: the fingerprint gains `tree_digest`, the memo gains
  `dest_fingerprint` and a `dirty` map. Entries written by 1.0 are treated as
  differing, so the first 0.2.0 run re-copies (near-zero bytes; rsync is
  file-incremental) and re-verifies once.
- `config.json` gains `revalidate_after_days` (default 0) and `xattr_check`
  (default true). `fidelity_units` is obsolete and ignored.
- The documented journal retention policy now requires keeping, per (unit,
  destination), the run holding its most recent PASSING verify — otherwise the
  policy manufactures `ORPHANED_MEMO_ENTRY` on its own.

### Known limitations after the repair

- Still no real 35 GB write run; all evidence remains fixture-scale.
- `verify.py` compares extended-attribute NAMES on at most 8 sampled files per
  unit, not their values, and not ACLs.
- The destination re-walk costs a stat pass over the destination on every plan
  for units the source calls unchanged. That is the price of INV-06; it has not
  been measured at 35 GB over USB.
- L3 rotation raises coverage over runs but is still a sample; `--level L4`
  remains the opt-in full hash.

## 0.1.0 — 2026-07-27

First build. Produced through the skill-creator-max pipeline
(compose spec → design structure → red-green build → compress → independent
attack); this entry covers the engineer stage.

### Added

- **`SKILL.md`** — trigger surface (598-char description, naming the Time
  Machine / git-push / cloud negatives explicitly) plus four body sections:
  `#run-chain`, `#invariants`, `#classification-and-routing`,
  `#reporting-contract`.
- **Eight `python3` stdlib-only scripts**, each carrying its own `--selftest`
  that is proven against known-bad input:
  - `_state.py` — the single implementation of lock, atomic replace, journal
    append, schema-version check, and memo read/commit.
  - `guard_destination.py` — the refusal layer. Contains **no write call at
    all**; an eval parses its source to prove it.
  - `inventory.py` — read-only source measurement, including the UNCOVERED list.
  - `plan.py` — A/B/C classification by measured property, routing, and the
    **pooled-per-APFS-container** space verdict.
  - `init_destination.py` — the only writer of a destination marker.
  - `copy.py` — runtime copier detection and flag emission; no code path to the
    memo.
  - `verify.py` — independent re-enumeration of the destination; the only
    component that can mark a unit safe.
  - `status.py` — the single renderer of ledger truth.
- **Four on-demand references** — `openrsync-compat.md` (the dated, measured
  flag matrix), `destination-policy.md` (the refusal rulebook, anomaly code by
  anomaly code), `ledger-format.md` (the on-disk contract and the TORN rules),
  `first-run-setup.md` (the once-per-destination path).
- **`evals/run_all.py`** — 54 cases across E-L0…E-L5, ~31 s, no network.
  `--selftest` sabotages the build in nine places and requires the covering
  cases to fail.
- **`evals/baseline_arm.py`** — the two-arm delta instrument (E11/A44).
- **`evals/fixtures/diskutil-apfs-disk7-20260727.plist`** — a REAL captured
  `diskutil apfs list -plist` from container disk7 (the container that actually
  holds `/Volumes/backkkup` and `/Volumes/2TBofData`). A synthetic plist does
  not satisfy the shared-container dimension.

### Measured on this machine (2026-07-27), not inherited

- `/usr/bin/rsync` is **openrsync** (`protocol version 29 / rsync version 2.6.9
  compatible`); `/opt/homebrew/bin/rsync` is absent. `-A`, `-X`, `--xattrs`,
  `--acls`, `-N` and every `--info=` value exit 1. `--delete` exits 1 unless
  combined with `-a`/`-r`/`--dirs`.
- `rsync -a` **silently drops extended attributes at exit 0**;
  `/usr/bin/ditto` preserves them.
- Container `disk7` pools `disk7s1` (`/Volumes/backkkup`, Time Machine) and
  `disk7s2` (`/Volumes/2TBofData`) into ONE 706 039 582 720-byte free pool.
  `/Volumes/5TBofData` is `disk5s1` on its own container.
- `/`, `~`, `/private/tmp` and `/Volumes` all report `st_dev` 16777231 — so
  comparing a candidate destination's `st_dev` against `/`'s cleanly detects a
  directory that merely wears a volume's name.

### Defects found during the build and fixed

- **A refusal suppressed every other finding.** The guard returned on the first
  Time Machine marker without ever parsing the destination marker, so a volume
  that was *both* a TM store *and* carried an instruction-bearing marker
  reported only the first problem. The marker is now parsed before any refusal
  returns, and both findings are reported. (Found by the E-L3 64 K pressure
  sentinel.)
- **Two harness cases did not discriminate.** The mutation selftest showed
  `L4-12` surviving a "commit the memo even when verification failed" mutant
  (`status.py`'s verify-event check masked it) and `L1-10` surviving a
  per-volume free-space mutant (the headroom floor dominated the fixture). Two
  new cases were added — `L4-14` (a failed verify must commit nothing, so the
  next run retries) and `L1-14` (pooling must change the *fit decision*, with
  two destinations in one container where each fits alone and both do not).
- **Delete-at-destination was decided from a stale plan.** It is now decided
  from a fresh guard re-check at copy time, so a marker written after planning
  is honoured and a marker removed after planning is not.
- **Five vacuous green cases.** The first red run "passed" five cases simply
  because there was nothing to check (0 scripts compiled, 0 commands
  enumerated). Each now asserts a non-zero denominator before it may pass.

### Known limitations, stated rather than hidden

- No real 35 GB write run has been performed; all evidence is fixture-scale.
- No restore verb in v1 (unknown U6); every report prints the manual `ditto`
  restore command instead.
- Case sensitivity of `/Volumes/5TBofData` and `/Volumes/2TBofData` is still
  unknown (U5) and is therefore re-queried on every run.
- L3 sampled verification is probabilistic; the sampling rate is printed and
  `--level L4` is the opt-in full hash.
- Unit granularity (`musicplayer` alone is half the corpus) waits on a
  measurement from run 1 rather than on taste (U2).
- The mutation selftest carries nine mutants. A larger mutant set would very
  likely find more harness gaps — two of the first nine already did.
