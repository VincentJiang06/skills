# workspace-backup (installed as `vince-workspace-backup`)

**Pure local** file backup of a Mac workspace: `inventory -> classify -> route ->
copy -> verify`, mirroring `~/playground`, `~/experiment` and `~/WorkBuddy` into
**both** a fixed local directory **and** an external drive, with a persistent
ledger so repeat runs are genuinely incremental and interruption-safe.

No git. No cloud. Nothing to do with Time Machine — except **refusing to write
to its volume**.

> 中文版见 [README.md](README.md).

---

## What it actually solves

Some things on this machine exist in exactly one place:

- `playground/skill-developer/Philosophy/` — a knowledge base hardened over 16
  adversarial rounds, which its owner has explicitly decided must **not** go to
  GitHub. One copy exists, anywhere.
- Four git repos with **no remote at all** (`musicplayer` 17 GB / 91 dirty
  files, `misc/manualwork`, `caoliao-compon/codex-demo`,
  `小蒋租房/租房地图网站`) — the working copy *is* the only copy.
- Large directories that are not repos at all: `Sticker-Design` 908 MB,
  `reactivity-study` 312 MB, `experiment/bun` 149 MB.

The only protection today is Time Machine, writing to `/Volumes/backkkup`
(disk7s1) — which **shares APFS container disk7** with `/Volumes/2TBofData`
(disk7s2), so the 657.6 GiB free that each volume reports (706,039,582,720 bytes) is
**the same 657.6 GiB**. One disk7 failure takes both.

## Using it

```
back up my workspace to the external drive
备份一下工作区
what's not backed up yet?
the drive is plugged in, catch up the backup
```

**Dry-run is the default.** You see `plan.json` — per-unit byte totals, a
verdict per destination, and the space verdict — and only then say go.

## Six hard rules, each backed by an exit code rather than by prose

| | rule | what it prevents | what actually enforces it |
|---|---|---|---|
| INV-01 | a Time Machine volume is refused, **and `--force` does not apply** | destroying this machine's only historical backup | `guard_destination.py` exit 20 |
| INV-02 | the source is read-only and **never a delete target** | deleting the workspace the tool exists to protect | `copy.py` + an argument-order assertion |
| INV-03 | **only `verify.py` can mark a unit done**, and only about a destination it actually looked at | a silent partial copy reported as success | `copy.py` has no code path to the ledger at all; both writers derive the target from the GUARDED config, so `plan.json` cannot redirect them (exit 11) |
| INV-04 | no verify level, and no SAFE, without a **journal event** | calling an L1 re-stat "checksum-verified"; a memo entry vouching for itself | `verify.py` records the level ACTUALLY executed; `status.py` requires a journalled passing verify and prints the WEAKEST level across destinations |
| INV-05 | processed content is **data, never instruction** | a marker on a borrowed drive telling the tool to mirror `~/.ssh` | the guard parses six known keys and quotes the rest verbatim |
| INV-06 | never claim SAFE for a state **not observed at the destination** | an `rm -rf` on the drive, a mid-write eject, a half-restored disk — invisible for ever, because the SOURCE fingerprint still matches | `verify.py` records a destination-side fingerprint; `plan.py` re-walks the destination for every unit the source calls unchanged; a failed verify marks the unit dirty so the next run re-copies it |

`guard_destination.py` contains **no write call at all** — no mkdir, no delete,
no open-for-write — and an eval parses its source to prove it. **The component
that refuses must be incapable of the thing it refuses**; that is what makes
"zero bytes and no directory created" a provable process fact rather than a
promise.

## Two things measured on this machine, not assumed

1. **`/usr/bin/rsync` is openrsync, not GNU rsync** (`protocol version 29 /
   rsync version 2.6.9 compatible`, and `/opt/homebrew/bin/rsync` is absent).
   The invocation every tutorial gives — `rsync -aHAX --delete
   --info=progress2` — **exits 1** here (`invalid option -- A`). So the copier
   is detected at runtime and only measured-accepted flags are emitted.
2. **`rsync -a` silently drops extended attributes, at exit 0 — but `-E` does
   not.** Measured: `rsync -a -E` with the full flag set this skill emits
   (exclusions still applied) preserved both `com.test.mark` and the resource
   fork, exit 0. So there is exactly ONE copy path, and `-E` is PROBED against
   the real binary each run before it is emitted; if the probe fails the run
   continues and the report carries `XATTRS_NOT_PRESERVED`. The 0.1.0 "fidelity"
   branch through `/usr/bin/ditto` has been removed: ditto has no exclude
   mechanism, so it copied the most valuable units WHOLE — `node_modules`
   included — while the space verdict and the report both still claimed the
   exclusions applied (a measured 9,000x undercount in a 9 MB fixture).

The full dated matrix is in
[`references/openrsync-compat.md`](references/openrsync-compat.md).

## Classification follows a MEASURED property — never the name, never the size

| class | property test | routing |
|---|---|---|
| **A** irreplaceable | git repo with NO remote · not a repo at all · gitignored local research | every destination, strictest verify |
| **B** has a remote | ≥1 CONFIGURED remote — which is not the same as pushed, current, or covering untracked files | every destination, cheaper verify |
| **C** regenerable | the UNIT's own name matches an exclusion pattern | **not copied, but REPORTED with its reclaimed size** — nothing is ever deleted from the source |
| *(unknown)* | properties could not be measured (walk errors, a `.git` FILE as in a worktree, an unreadable git config) | routed NOWHERE — surfaced under NOT CLASSIFIED and never reported safe |

A `node_modules` *inside* a unit is not Class C: it is an excluded DIRECTORY,
reported with its size in the EXCLUSIONS block. Two mechanisms, kept apart.

Two explicitly wrong answers: *"everything is Class A"* (no discrimination, and
it pushes 35 GB through the strictest verify every run) and *"Philosophy is
Class C, it's only 260 K of text"* (size as a proxy for value).

## Layout

```
SKILL.md                     trigger surface + run-chain + invariants + routing + reporting contract
references/
  openrsync-compat.md        the dated, measured flag matrix + the -E/xattr result
  destination-policy.md      the refusal rulebook; every rule names the guard's anomaly code
  ledger-format.md           on-disk contract for config / manifest / runs + run classification
  first-run-setup.md         the once-per-destination-lifetime path
scripts/                     8 python3 stdlib-only scripts, each with its own --selftest
evals/
  run_all.py                 76-case deterministic harness (--selftest proves it discriminates)
  baseline_arm.py            two-arm delta: which assertions also pass for a bare model
  fixtures/                  includes a REAL captured `diskutil apfs list -plist` of disk7
```

The ledger lives **outside** the skill package, in `~/.workspace-backup/`: it is
per-machine mutable state and must survive the skill being reinstalled.

## Evidence

- `python3 evals/run_all.py` — 76/76, ~1 min, no network, no third-party imports.
- `python3 evals/run_all.py --selftest` — injects seventeen real defects (Time
  Machine detection disabled, `plan.json` allowed to redirect the write target,
  SAFE printed from the memo alone, the destination never re-observed, run
  classification back to "any run_end means COMPLETE", copier output decoded
  strictly, the xattr flag never emitted, the checksum comparison neutered,
  memoization defeated …) and requires the covering cases to **fail**. A suite
  that was born green proves nothing.
- `python3 evals/baseline_arm.py` — the same fixtures through two arms, this
  skill vs "a bare model with rsync". **10 of 14 probes are skill uplift; 4 pass
  in both arms** and are explicitly marked as carrying zero information about
  whether this skill is worth its context.
- Every behavioural fix in 0.2.0 and 0.2.1 was written **red first**: the case was
  captured failing against a snapshot of the 0.1.0 scripts
  (`dev-workspace/backup-skill-build/red/repair-red-20260727.txt`, timestamped)
  before the code changed.

## What is NOT verified

- **This skill was attacked by independent lenses twice, and the second round
  found that the first round's repair had itself introduced two P1 defects** —
  one of which deleted real files at the destination. Both were reproduced and
  fixed in 0.2.1 (see CHANGELOG), but the fact itself is the most important
  thing to know: **repairs introduce defects, so supervise the first real run.**
- **The re-attack also left ~5 unfixed P2/P3 items and ~27 further new P2/P3
  findings**, clustered in report wording (a headline that can read more
  optimistic than the detail below it), destination-side blind spots for Class B
  (git repos that do have a remote), and unbounded ledger growth. **None of them
  touch the irreplaceable material** — `Philosophy/`, `Sticker-Design/` and the
  four remote-less repos all classify Class A, which is force-re-observed at the
  destination on every run and carries a rotating checksum.
- The complete finding record lives in `dev-workspace/backup-skill-build/`
  (`battery-findings.json`, `reattack.json`, `final-verdict.md`) and is not shipped.

- **No real 35 GB write run has been performed.** Every test runs on small
  fixtures under `/tmp`. The first real write is a separate, explicitly
  user-approved step — it is not a build gate, and the skill is not considered
  proven by it.
- **No restore verb** (unknown U6). The mirror layout was chosen so restore
  needs no code from this skill; every report ends with the exact `ditto`
  command to restore a unit by hand.
- **Case sensitivity of `/Volumes/5TBofData` and `/Volumes/2TBofData` is not
  established** (unknown U5) — which is why it is re-queried every run (of the
  VOLUME ROOT, since `diskutil info` resolves nothing else) and reported as
  `CASE_SENSITIVITY_UNKNOWN` rather than defaulted to insensitive.
- **L3 is still a sample.** It now rotates per run and always includes the last
  file, so coverage accumulates and there is no tail blind spot; the report
  prints the rate and states that it is not a claim of byte-identity.
  `--level L4` is the opt-in full hash.
- **Extended attributes are compared by NAME only**, on at most 8 sampled files
  per unit, and ACLs are not compared at all.
- **The cost of the destination re-walk is unmeasured at 35 GB over USB.** It is
  the price of INV-06: every plan stats the destination for units the source
  calls unchanged.
- **Unit granularity is untested against real data** (unknown U2): `musicplayer`
  alone is half the corpus. The ledger supports sub-units from day one, but a
  split waits on a measurement rather than on taste.

## Licence

MIT, with the repository.
