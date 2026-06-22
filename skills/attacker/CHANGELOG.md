# Changelog — attacker

All notable changes to the `attacker` skill. Semver.

## [0.1.4] — 2026-06-22

A **decisive independent battery** found a P0 release-gate bypass: the gate's recursion
guard was forgeable by an ambient environment variable, letting any caller fake an
"industrial" verdict without a green harness. v0.1.4 makes the release gate
**un-bypassable**, red-first (suite 36/36 → **37/37**).

### Fixed
- **Release gate made UN-BYPASSABLE — removed the forgeable env skip; the harness tests
  the gate logic in-process (A20, P0).** `scripts/check_release_gate.mjs` previously skipped
  its internal harness run when `process.env.ATTACKER_SKIP_RELEASE_HARNESS === "1"` (a recursion
  guard added in v0.1.3 so the harness could drive the gate's flag/battery logic). But that env
  was a **static, forgeable string**: any caller could `export ATTACKER_SKIP_RELEASE_HARNESS=1`
  and then `node scripts/check_release_gate.mjs --battery <hardened-ledger>` would print
  `RELEASE GATE: PASS (industrial)` exit 0 **even when `node evals/run_all.mjs` was genuinely RED**.
  A release verdict must not be forgeable by ambient environment. The fix **eliminates the bypass
  surface** rather than obfuscating it:
  - The gate's decision logic is now a **pure exported function** `evaluateReleaseGate({ harnessGreen,
    nonVacuity, batteryLedgerPath })` that **never spawns** — it takes the harness result as input
    and returns `{ ok, checks }`. A separate `runHarness()` actually spawns `node evals/run_all.mjs`.
    The CLI **always** calls `runHarness()` then `evaluateReleaseGate(...)`; **there is no env that
    can skip the real harness run.** The `ATTACKER_SKIP_RELEASE_HARNESS` check is **deleted**.
  - The recursion is broken **structurally**: `evals/run_all.mjs` no longer spawns
    `check_release_gate.mjs` at all. The old C30 release-gate sub-step + C31 + the new
    **C33_release_gate_unforgeable** import and call the pure `evaluateReleaseGate(...)` (and the
    extracted pure `parseBatteryArg(...)`) **in-process** with a stubbed/known harness result — no
    subprocess, so no `harness → gate → harness` recursion, and no forgeable env.
  - **Red-first:** C33 was written and captured FAILING before the fix (RED PHASE 5). With
    `ATTACKER_SKIP_RELEASE_HARNESS=1` set and a genuinely RED harness, the v0.1.3 gate forged a green
    harness sub-check and printed `RELEASE GATE: PASS (industrial)` exit 0. Post-fix the env is
    **inert**: the same command with the env set + a RED harness prints `RELEASE GATE: FAIL` exit 1;
    with a GREEN harness it PASSes industrial exit 0.
- All prior v0.1.3 behavior preserved: `--battery` with an omitted/flag-like value → `ERR` exit 2
  (never a silent industrial); missing/malformed ledger → FAIL; `--battery <valid hardened ledger>`
  (no env) → `RELEASE GATE: PASS (industrial)` exit 0; `check_battery_clean.mjs` still discriminates
  hardened vs copy-paste ledgers; `validate()` still imported (not inlined) by the harness.

## [0.1.3] — 2026-06-22

A round-3 independent **3-lens** adversarial battery found that the v0.1.2 fix still
left the roll-up-drop class open (a no-id record-shaped object was reclassified as the
roll-up and dropped), plus impossible k/n replay math and unhardened auxiliary scripts.
v0.1.3 closes the **whole** class and hardens every script, red-first (suite 26/26 → **36/36**).

### Fixed
- **Closed the roll-up-misclassification class DEFINITIVELY via POSITIVE roll-up detection
  (A17, P0, CRITICAL).** The invariant is now *a record can NEVER be silently dropped.* A `.jsonl`
  line is the roll-up summary ONLY when it carries (a) at least one roll-up key
  (`by_severity`/`budget_n`/`asr_at_n`/`unique_finding_count`) **OR** an explicit `type:"summary"`
  marker, **AND** (b) **none** of the record-only fields (`status`, `proven`, `repro`, `oracle`,
  `regression_key`, `attack_class`, `observed`, `expected`, `invariant`, `independence_attestation`).
  The `id` is no longer the discriminator (the previous id-first rule still mis-bucketed a no-id
  record-shaped object) — the presence of ANY record-only field makes a line a RECORD. The roll-up
  is parsed **exactly once**: more than one roll-up line is REJECTED. Every non-roll-up line is a
  RECORD that reaches the gate. This kills three remaining triggers of the same class:
  - **G1a (critical):** a record-shaped object with record-only fields, no/empty `id`, `type:"summary"`
    and a valid-looking summary payload was reclassified as the roll-up and dropped
    (`ok:true`/`confirmed_record_count:0` green false-negative). Now → record → REJECTED. (eval C23)
  - **G1b (major):** a JSONL line with duplicate `id` keys resolving to `""` (JSON.parse keeps the
    last) was dropped despite a serialized real id. Now → record → rejected for missing id. (eval C24)
  - **G1c (major):** two roll-up lines — the first was used and BOTH were filtered out, so a second
    conflicting roll-up vanished silently. Now → REJECT (graceful `ERR` + exit 2). (eval C25)
  - Plus a regression guard for the neither-bucket case (roll-up keys + a record-only field, no id →
    malformed record → gate). (eval C26)
- **k/n flaky-replay arithmetic + histogram key contract (A18, P0).**
  - **G2a:** `repro.replays_passed > repro.replays_total` (impossible >100%) was accepted → now
    REJECTED. (eval C27)
  - **G2b:** a negative / `NaN` / non-positive-integer `repro.replays_total` bypassed the whole k/n
    block (the old `replays_total > 0` guard skipped it) and passed as a clean deterministic finding →
    the block now triggers whenever `replays_total`/`replays_passed` is present and REJECTS a malformed
    denominator. (eval C28)
  - **G2c:** `summary.by_severity` with a key outside `{critical,major,minor}` (e.g. `blocker`) was
    accepted → now REJECTED (the validator authors the histogram contract). (eval C29)
- **Hardened the two auxiliary scripts to the validator's bar (A19, P0).**
  - **G3a:** `check_battery_clean.mjs` raw-stack-traced on missing/malformed/empty/directory input →
    now wrapped in try/catch: clean `ERR <msg>` to stderr + `process.exit(2)`, no stack trace. (eval C30)
  - **G3b:** `check_release_gate.mjs --battery` with the value omitted (flag last, or followed by
    another `--flag`) silently SKIPPED the hardened battery check and printed
    `RELEASE GATE: PASS (industrial)` exit 0 → now an `ERR` + nonzero exit, never a silent green
    industrial. (eval C31)
  - **G3c:** `check_battery_clean.mjs --need < 1` or non-numeric declared HARDENED on 0/NaN clean
    rounds → now an `ERR` + exit 2. (eval C32)

### Testing
- New fixtures + red-first eval cases **C23–C32** (CLI subprocess cases for the ingestion/aux-script
  edges), captured FAILING in `.skill-engineer/red/red.log` (**RED PHASE 4**, 27/36) before the fix;
  the 10 new `adversarial_checklist` edges are bound (now **32**) and all pass. Harness: 26/26 →
  **36/36**, exit 0. The harness gained generalized CLI-step support (drive any of the three scripts
  with explicit args) plus a recursion guard (`ATTACKER_SKIP_RELEASE_HARNESS`) so it can drive
  `check_release_gate`'s flag/battery logic without the gate re-running the harness recursively — a
  direct user `--battery <valid-ledger>` run still spawns and requires the green harness. Prior 24
  cases unchanged; `validate()` stays IMPORTED (not inlined); importing any module triggers no CLI;
  the aux scripts still discriminate hardened (exit 0) vs copy-paste (exit 1).

## [0.1.2] — 2026-06-22

A round-2 independent adversarial battery found that the v0.1.1 fix (FIX-1's
structural roll-up detection) reintroduced the same record-drop bug class through
new triggers. v0.1.2 closes the WHOLE class, red-first (suite 23/23 → **26/26**).

### Fixed
- **Hardened roll-up-line detection to close the record-drop class (A16, P0).** A
  `.jsonl` line is now the roll-up summary ONLY when it is unmistakably one — an explicit
  `{"type":"summary",…}` marker **AND** no non-empty `id`. The `id` check comes FIRST, so a
  record with an `id` is NEVER the roll-up. The fragile "no-id + has-doc-keys ⇒ roll-up"
  heuristic is gone, and any non-roll-up line is treated as a RECORD that reaches the gate
  (a malformed/no-id record is rejected there, never silently reclassified and dropped).
  This kills three round-2 triggers of the same class:
  - **new_bug[1]:** an empty/missing-`id` confirmed record carrying a `by_severity` field
    (no `type:"summary"`) was reclassified as the roll-up and silently dropped
    (`ok:true`, `confirmed_record_count:0` — green false-negative). It is now a record →
    reaches the gate → REJECTED for missing `id`. (eval C20)
  - **new_bug[2]:** a real record WITH an `id` that also carried `type:"summary"` was lost
    by a `type==="summary"` short-circuit ahead of the `id` check. The `id` check now wins
    first → kept and validated as a record. (eval C21)
- **Records-only `.jsonl` (no roll-up line) now validates (new_bug[3]).** When no roll-up
  line is supplied, the CLI synthesizes the fallback summary FROM the records via a shared
  `computeRollup()` (consistent by construction), so `by_severity` reconciliation only ever
  fires against a **user-supplied** summary, never a synthesized one. (Previously the
  all-zero synthetic histogram failed the v0.1.1 reconciliation once any confirmed record
  existed.) (eval C22)

### Testing
- New fixtures + red-first eval cases C20/C21/C22 (CLI subprocess cases), captured FAILING
  in `.skill-engineer/red/red.log` (RED PHASE 3) before the fix; 3 new `adversarial_checklist`
  edges bound (now 22). Harness: 23/23 → **26/26**, exit 0. Prior 23 cases unchanged;
  `validate()` stays IMPORTED (not inlined) by the harness and shares `computeRollup()` as the
  single dedup/histogram source of truth; FIX-2 graceful-error and the FIX-3 histogram-reconcile
  behaviors preserved.

## [0.1.1] — 2026-06-22

Fixes for 3 defects an independent adversarial battery found that the original
20/20 eval suite missed (fixed red-first; suite now 23/23).

### Fixed
- **BUG-1 (P0): `.jsonl` summary-key heuristic silently dropped a record.** The CLI
  detected the roll-up summary by "any record has a `summary` field" and filtered such
  records out of `records[]`. Because the attack-record schema allows additional
  properties, a record may legitimately carry its own top-level `summary` field — that
  record was then mistaken for the roll-up and dropped, so an INVALID confirmed record
  could vanish (`ok:true`, `confirmed_record_count:0` — green-but-wrong). Now the roll-up
  line is detected STRUCTURALLY (`isRollupSummaryLine`: an explicit `{"type":"summary",…}`
  marker, OR an object carrying doc-level roll-up keys (`budget_n`/`by_severity`/`asr_at_n`/
  `unique_finding_count`) AND no record `id`); every other line is a record and its own
  `summary` field never hijacks classification or drops it. (eval C17)
- **BUG-2 (major): malformed/missing input crashed with a raw stack trace.** CLI
  `readFileSync` + both `JSON.parse` paths (`.json` whole-file and per-`.jsonl`-line) are
  now wrapped in try/catch → a clean `ERR <message>` to stderr + `process.exit(2)`, never a
  raw Node stack trace. Honors the documented "graceful error, never a stack-trace crash"
  claim. (eval C18)
- **A15: roll-up `by_severity` histogram is now reconciled** against the deduped confirmed
  records (one severity per unique `regression_key`), like `unique_finding_count`: a present
  histogram that disagrees is REJECTED (a confirmed `major` with `by_severity.major:0` no
  longer passes green). An absent histogram stays allowed (not newly required). (eval C19)

### Testing
- New fixtures + red-first eval cases C17/C18/C19 (CLI subprocess cases for C17/C18 assert
  ingestion + graceful-error behavior `validate()` can't reach in-process); 3 new
  `adversarial_checklist` edges bound. Harness: 20/20 → **23/23**, exit 0. The deterministic
  core stays IMPORTED (not inlined) by the harness.

## [0.1.0] — 2026-06-22

First release. Adversarial-debugging skill: in a fresh, TDD-independent subagent,
attack a product's observable behavior and record ONLY proven, reproducible
breakages as machine-checkable attack records.

### Added
- `schemas/attack-record.schema.json` — draft-07 contract with the PROVE-OR-FLAG
  split (`records[]` proven vs `needs_judgment[]` unresolved) + roll-up
  (`ASR@n`, unique-finding count, severity histogram). Enums for
  `attack_class` / `surface_class` / `oracle` / `status` / severity.
- `scripts/validate_attack_records.mjs` — the deterministic §5 gate; **exports
  `validate()`** (imported, never re-implemented, by the harness). Enforces
  structure + reproducibility shape on every confirmed record: observed≠expected,
  non-empty repro + `minimized_input`, named oracle + non-empty invariant,
  `non_tautology_check`, `repro.replayed_ok:true`, `real_collaborator_at_seam:true`,
  `withheld ⊇ {implementation_source, tdd_suite}`, `regression_key` dedup, anti-vacuity,
  and roll-up consistency (`attempts_used <= budget_n`).
- `evals/run_all.mjs` — re-runnable harness importing `validate()`; one eval case
  per the 16 adversarial-checklist entries + the **non-vacuity self-test**
  (planted-bug fixture MUST be flagged; clean-control MUST yield zero findings).
- `evals/eval-cases.json` + `evals/fixtures/{planted_bug,clean_control}.*`.
- `scripts/check_battery_clean.mjs` — N-consecutive-clean battery ledger checker
  (anti copy-paste unique context per round, asymptotic loop-until-dry).
- `scripts/check_release_gate.mjs` — binds "industrial" to green run_all +
  non-vacuity (+ hardened battery when a ledger is supplied).
- `references/attack-process.md` (READ→DESIGN→EXECUTE→PROVE→RECORD + the
  fresh-context independence mechanism + target-adapter contract) and
  `references/oracle-menu.md` (ranked oracle taxonomy).
- `assets/payload-library.json` (the §3 taxonomy as data),
  `assets/fresh-reader-checklist.md` (required manual semantic gate, maker ≠ checker),
  `assets/attack-record.template.md` (handoff doc template).
- `agents/openai.yaml` (attacker + checker personas with explicit `withhold`),
  `SKILL.md` runbook, bilingual `README.md` / `README.en.md`.

### Resolved design defaults (from the research brief)
- Independence enforced via fresh-subagent + curated context bundle + prompt-level
  withholding contract, audited by `independence_attestation`.
- Target-type-agnostic via a small target-adapter contract (function/CLI/HTTP/
  live-app worked examples).
- Judge = a fresh same-model maker–checker subagent.
- Flaky targets: `proven` requires replays_passed/replays_total ≥ threshold
  (default 1.0); below → `needs_judgment.below_replay_threshold`.
- Severity = internal critical|major|minor first; CVSS optional.
- `attack-records.jsonl` + battery ledger live in the **target project's** `.loop/`.

### Deferred to v0.2 (explicitly out of scope for v0.1)
- Full CVSS-v4.0 calculator.
- Differential oracle against a prior version as a built-in.
- Multi-model external-judge orchestration.
- Runnable code target-adapters (function/CLI/HTTP/live-app) — v0.1 ships the
  contract + worked examples only.
