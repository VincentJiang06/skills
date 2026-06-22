# Changelog — attacker

All notable changes to the `attacker` skill. Semver.

## [0.3.0] — 2026-06-22

Three coherent features extend attacker from "attack a product, anywhere, with a budget"
to "attack a declared DOMAIN of a product OR an idea, grounded in rich context." RED-FIRST
(suite 53/53 → **72/72**, exit 0). `validate()` stays **imported** (run_all.mjs:27), not
inlined; importing any module runs no CLI; the release gate still PASSes (industrial); the
v0.2.1 out-of-band round-verdict exemption is preserved (in-band `__synthesized` still inert).

### Added — A. ATTACK-SCOPE CONTRACT (constrain WHICH domain/layer is attacked)
- **Summary roll-up:** `in_scope` (array of ≥1 non-empty RICH free-form descriptors, e.g.
  "UI rendering errors", "page navigation/logic transitions" — NOT a fixed enum) +
  `out_of_scope` (descriptor array, may be empty), both added to summary `required`. Flags:
  `--scope` / `--out-of-scope`.
- **Per record:** `attack_scope` (non-empty string — which `in_scope` domain this attack
  targeted), added to the attack_record `required`.
- **New doc-level bucket:** top-level `out_of_scope[]` — observations found OUTSIDE the
  declared scope: KEPT (not lost) but NOT counted as findings and NOT subject to the
  confirmed-record gate.
- **Validator enforcement:** every confirmed record MUST carry a non-empty `attack_scope`
  AND (on a user-supplied summary) it must be an EXACT match against `summary.in_scope`;
  missing/empty or not-in-set → REJECT. The semantic "is this attack really UI not backend"
  judgment stays with the fresh-reader. The synthesized fallback summary
  (`opts.summarySynthesized`) is EXEMPT from scope-tag membership enforcement, same out-of-band
  stance as round-verdict.

### Added — B. TARGET TYPE: `product` | `idea` (debate con-side)
- **Schema:** `target.type` enum `["product","idea"]` (required on every record's `target`);
  optional `target.statement` (idea text); product-only fields (version/model/checkpoint/
  system_prompt_hash) optional/null in idea mode.
- **Oracle enum extended** with the idea-mode oracles: `counterexample`, `contradiction`,
  `unmet_assumption`, `scope_violation`, `infeasibility`, `missing_case` (kept the product
  oracles `implicit|differential|metamorphic|control_vs_experiment|specified`).
  `references/oracle-menu.md` gains the idea-mode oracle ladder (§I1–§I6).
- **Validator — MODE-CONDITIONAL gate** (branches on `record.target.type`):
  - **product (UNCHANGED):** repro.command|steps + minimized_input + replayed_ok + a PRODUCT
    oracle + `real_collaborator_at_seam===true` + `non_tautology_check` + `withheld ⊇
    {implementation_source, tdd_suite}` + observed≠expected.
  - **idea (new):** `claim` + observed≠expected (expected = what the claim predicts, observed =
    the counter) + `repro.steps` (the reasoning chain) + `repro.minimized_input` (the minimal
    scenario) + `repro.replayed_ok===true` (a fresh reader re-ran the reasoning) + an IDEA
    oracle + `not_strawman===true` + `independence_attestation.derived_expected_from` +
    `derived_independently===true`. Idea mode does NOT require `withheld ⊇ {impl,tdd}` nor
    `real_collaborator_at_seam` (product-specific). Anti-vacuity still applies (a vague
    "I disagree" with observed==expected is NOT a finding).
  - regression_key dedup, severity, status, round-verdict, scope-tag, budget consistency apply
    to BOTH modes. The product gate is byte-for-byte unchanged; idea relaxations do NOT leak
    into product mode (regression-guarded by C57/C58).
- **round_verdict semantics carry over to idea mode:** `broke` = a proven flaw found; `clean`
  = couldn't break within budget (robust-so-far, NOT "proven true"); `inconclusive` = budget
  hit, no flaw found.

### Added — C. RICH CONTEXT INTAKE
- **SKILL.md Preflight step 0 (CONTEXT, before scope/mode/budget):** take a rich context
  bundle (target+type, claim/requirement, constraints, success criteria, what-counts-as-a-break,
  in/out-of-scope, prior rounds) and **ACTIVELY ENCOURAGE more — when context is thin/ambiguous,
  PROMPT the user for the missing specifics: the more precise the context, the sharper and
  better-scoped the attack; ask rather than guess.** Independence-safe (product still excludes
  impl/tests/framing; idea takes the claim + justification but critiques independently).
- **New `references/context-intake.md`:** the context checklist + WHY more context = sharper
  attacks + how it feeds DESIGN + the elicitation prompts to use when context is thin.
  Referenced from the SKILL.md Modules table.
- **Optional `summary.context_digest`** (string): NOT required (kept lean); when present the
  validator type-checks it (non-empty string).

### Testing
- **RED-FIRST** eval cases **C48–C66** + fixtures, captured FAILING in
  `.skill-engineer/red/red.log` (**RED PHASE 8**, 61/71) before the validator's v0.3.0
  blocks: SCOPE (C48 attack_scope ∉ in_scope → REJECT; C49 empty attack_scope → REJECT; C50
  ∈ in_scope → ACCEPT; C51 out_of_scope[] item accepted, not counted; C65 missing in_scope →
  REJECT); IDEA (C52 valid idea record → ACCEPT; C53 missing not_strawman → REJECT; C54
  missing replayed_ok → REJECT; C55 product oracle on an idea → REJECT; C56 missing
  derived_independently → REJECT; C59 idea WITHOUT withheld/seam → still ACCEPT; C60 vague
  "I disagree" → REJECT; C66 idea end-to-end via CLI → ACCEPT); MODE (C61 missing target.type
  → REJECT); CONTEXT (C62 non-string context_digest → REJECT; C63 absent → OK; C64 valid
  string → OK); REGRESSION GUARD (C57/C58 product mode still requires real_collaborator_at_seam
  / withheld⊇{impl,tdd}). Existing fixtures (planted_bug / clean_control / records_no_rollup /
  summary_key_collision_valid / record_with_type_summary) updated with `target.type:"product"`,
  `attack_scope`, and summary `in_scope`/`out_of_scope` — fixtures updated, checks NOT weakened.
  Suite 53/53 → **72/72**, exit 0; non-vacuity self-test stays green; SKILL.md folded
  description **1019 ≤ 1024** (adds an idea/debate trigger + the scope flags).

## [0.2.1] — 2026-06-22

An independent battery found a **P0**: the v0.2.0 round-verdict gate's exemption was
controlled by a **forgeable IN-BAND field**, so a caller could smuggle a false `clean`
verdict past the gate while a confirmed critical break existed. v0.2.1 moves the
exemption signal **out-of-band**, red-first (suite 48/48 → **53/53**, exit 0).

### Fixed
- **Round-verdict exemption moved OUT-OF-BAND; the in-band `__synthesized` field is no
  longer trusted (closes a forgeable `clean`-verdict bypass).** `validateRoundVerdict`
  skipped the v0.2.0 round-verdict consistency checks (and the new-required-field checks)
  when `summary.__synthesized === true`. That field was *meant* to mark the CLI's OWN
  synthesized records-only fallback summary (legitimately exempt, like `by_severity`
  reconciliation). But `__synthesized` was a **plain user-controllable field in the
  document** — there was no separation between "the CLI synthesized this stub" and "the
  user typed this field." So a forged `__synthesized:true` on a **user-supplied** summary
  smuggled a false `clean` (or a summary missing the v0.2.0 required fields) past the gate
  — **green-but-wrong on the documented `.json`/`.jsonl` path**. On a `.jsonl` with a
  confirmed **critical** break + a forged synthesized-clean roll-up line, the validator
  returned `ok:true` / `confirmed_record_count:1` → the loop reads `clean` and **silently
  abandons a proven critical defect**. The fix makes the exemption a property of **who
  called `validate`, never a field in the data**:
  - **`validate(doc, opts = {})`** with `opts.summarySynthesized` (default `false`). The
    round-verdict checks are exempt **only** when `opts.summarySynthesized === true` — never
    based on anything inside `doc`. (`validate()` stays **imported**, not inlined; existing
    1-arg callers keep working.)
  - The validator **no longer reads `summary.__synthesized`** at all; an in-band
    `__synthesized` has **zero effect** on whether the checks run.
  - **CLI ingestion:** sets `summarySynthesized = true` **only** when the CLI itself
    synthesizes a fallback summary because the input supplied **no** summary line, and calls
    `validate(doc, { summarySynthesized })`. On every path where a summary is **present** in
    the input (a `.json` whole-doc, or a `.jsonl` summary line) `summarySynthesized` stays
    `false`, so the round-verdict + required-field checks **always** run. The synthesized
    stub no longer writes an `__synthesized` field.
  - **Net invariant:** a user-supplied summary is **always** fully gated (round-verdict
    consistency + required v0.2.0 fields); **only** the CLI's internally-synthesized
    records-only fallback is exempt, and that exemption can **no longer be forged** from
    input. Record validation continues to run in **all** cases.

### Testing
- New **red-first** eval cases **C43–C47** + fixtures: (C43) `.json` forging
  `__synthesized:true` + `clean` verdict + a confirmed record → REJECT; (C44) `.json` forge
  + summary missing the v0.2.0 required fields → REJECT; (C45) `.jsonl` confirmed **critical**
  break + a forged synthesized-clean roll-up line → REJECT **and** `confirmed_record_count`
  stays 1 (the critical defect is not abandoned); (C46) a legitimate records-only `.jsonl`
  with **no** summary line → still ACCEPT (the real synthesized-fallback path, now via the
  out-of-band flag); (C47) a real `.jsonl` summary line **without** the forge but with a bad
  verdict → still REJECT. C43–C45 were captured **FAILING** in `.skill-engineer/red/red.log`
  (**RED PHASE 7**, 50/53) before the fix; C46/C47 guarded the exempt and always-gated paths.
  Harness: 48/48 → **53/53**, exit 0; the non-vacuity self-test stays green; the release gate
  still PASSes (industrial); importing any module triggers no CLI; SKILL.md description
  unchanged (1015 ≤ 1024). (`__synthesized` was never user-documented, so no SKILL.md change.)

## [0.2.0] — 2026-06-22

Loop-integration refinement: attacker becomes the loop's machine-readable
**STOP-CONDITION** and the attack effort is made **HARD-BOUNDED** with an inheritable
attack ledger. Built RED-FIRST (suite 37/37 → **48/48**, exit 0); the 7 new validator
invariants were captured FAILING in `.skill-engineer/red/red.log` (**RED PHASE 6**,
38/48) before implementation.

### Added
- **Round verdict — the loop's STOP-CONDITION.** A loop runs `A→B→C→attack`; each attack
  round now emits a machine-readable **`round_verdict`** (`broke` | `clean` | `inconclusive`)
  + **`stop_reason`** (`plan_complete` | `budget_exhausted`) on the summary roll-up the loop
  branches on: **`clean` ⇒ STOP** (done/converged), **`broke` ⇒ fix-round then re-attack**,
  **`inconclusive` ⇒ loop-owner-decides** (a budget cap hit with nothing found — a qualified
  stop, NOT proven correct). Honest caveat documented: `clean` ≠ proven correct; it is "no
  proven break within budget B."
- **Dual hard budget (attempts + token-consumption).** The round is hard-bounded by
  `--budget N` (attempts, `budget_n`/`attempts_used`) **plus** `--max-tokens T` (per-round
  token consumption, `max_tokens`/`tokens_used`) — **NOT wall-clock time** — stopping at
  whichever cap hits first, in **exhaust-budget mode** (one round reports ALL proven breaks
  for a batch fix, never stop-on-first).
- **Carry-forward attack ledger (`carried_from_round`).** A round>1 INHERITS its own prior
  attack ledger (surface map + attack tree + attempted-breaks + confirmed/fixed records by
  `regression_key`) and re-derives only NEW surface — it does NOT re-plan from scratch (token
  waste). `carried_from_round` declares which strictly-prior round it built on (null only at
  round 1). What is NEVER inherited: impl source / TDD suite / author framing (independence
  preserved exactly as round 1).

### Schema
- Extended the `summary` roll-up (`schemas/attack-record.schema.json`): added `round_verdict`,
  `stop_reason`, `max_tokens` (int ≥ 1), `tokens_used` (int ≥ 0), and `carried_from_round`
  (`integer | null`) — all added to `summary.required` (the per-record schema is unchanged;
  `additionalProperties` stays `true`).

### Validator (7 new consistency invariants — STRUCTURE/consistency, the validator's job)
Added to `scripts/validate_attack_records.mjs` (all prior checks intact; `validate()` stays
IMPORTED, not inlined). On a **user-supplied** summary (the `.jsonl` synthesized fallback is
EXEMPT, exactly as `by_severity` reconciliation is):
  1. `round_verdict === "broke"` ⟺ ≥1 confirmed/proven record (both directions: broke with
     empty records → reject; clean/inconclusive with a confirmed record → reject).
  2. `clean` ⟹ no confirmed records AND `stop_reason === "plan_complete"`.
  3. `inconclusive` ⟹ no confirmed records AND `stop_reason === "budget_exhausted"`.
  4. `tokens_used <= max_tokens` (the dual of `attempts_used <= budget_n`).
  5. `stop_reason === "budget_exhausted"` ⟹ a cap actually reached (`attempts_used >= budget_n`
     OR `tokens_used >= max_tokens`).
  6. `stop_reason === "plan_complete"` ⟹ caps not exceeded.
  7. `carried_from_round`: null at round 1; an integer `1 <= carried_from_round < round` at
     round > 1 (the carry-forward discipline — a later round can't cold-restart).
The new summary fields are required (and enum-checked) on a user-supplied summary.

### Testing
- New red-first eval cases **C34–C42** + updated fixtures (planted_bug / clean_control /
  summary_key_collision_valid carry sane v0.2.0 fields; the synthesized `.jsonl` fallback is
  tagged `__synthesized` and exempt so records-only `.jsonl` keeps validating). Covers:
  broke⟺records (both directions), clean-requires-plan_complete, inconclusive-requires-
  budget_exhausted, tokens_used>max_tokens, budget_exhausted-with-both-caps-under,
  carried_from_round null-at-round1 / required-&-strictly-prior at round>1, a missing
  required field, and a valid v0.2.0 happy-path doc. Harness: 37/37 → **48/48**, exit 0;
  the non-vacuity self-test stays green; importing any module triggers no CLI.

### Docs
- `SKILL.md` (Preflight budget knobs + carry-forward + a new "Round verdict" section, thin
  orchestrator kept, description ≤ 1024), `rules/loop-and-metrics.md` (the A→B→C→attack
  stop-condition pattern as `feedback_signal.check`, exhaust-budget mode, the carry-forward
  ledger inherited-vs-never-inherited list, the dual budget + the `clean ≠ proven correct`
  caveat), `references/attack-process.md` (DESIGN reuses the inherited ledger; EXECUTE stops
  on the dual budget; RECORD emits the verdict fields), bilingual `README.md` / `README.en.md`
  (loop diagram shows clean→STOP, dual budget, carry-forward).

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
