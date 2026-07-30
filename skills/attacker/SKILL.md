---
name: attacker
description: >-
  Attack any target (skill, design, argument, code, KB) with a FRESH independent attacker
  rotating five lenses; coverage-first strike, then PROVE-OR-FLAG adjudication (findings vs
  flags); never fixes. A different-vendor attacker buys stronger independence. Use-when:
  "red-team/break this", "$attacker". Do-NOT: fix or edit the target.
metadata:
  version: 0.7.0
  model_agnostic: true
---

# attacker

Fork a fresh mind, point it at the target through one lens, collect everything it notices, and
let an independent adjudicator decide what survives the proof bar. The mechanism is trivial on
purpose — the power is in **what the fresh mind is handed** (§The mechanism, §The five lenses).

Never a fix, never an edit to the target, never a passing test suite. The defect this targets is
the **false-positive result**: a green suite / a self-consistent design on top of a broken thing,
because the check was made from the *same mental model* as the thing (correlated error). The only
cure is **engineered independence** — it is the entire value proposition, and every other choice
here exists to protect it.

## Model-agnostic (design constraint zero, non-negotiable)

Runs on any model; any model can BE the attacker. Three rules hold it:
1. **Portable wording.** Lens prompts and the rubric are Markdown + separators, no XML-semantic
   tags (all major CN vendors push Markdown; every model parses it — Claude is slightly
   sub-optimal, accepted). Every tool/output schema uses the six-vendor intersection — object root,
   all `required`, no `minLength`/`minItems`, English snake_case (`schemas/output.json`).
2. **Different-model = stronger independence, a first-class path.** Same-family self-attack is
   `instance`-tier only — self-preference bias is a *model-level* effect, so its blind spots stay
   invisible. FORK therefore **prefers an attacker model different from the target/author's**,
   buying `model`-tier by construction. **Measured, not asserted:** PBT-Bench (2605.15229) —
   hardest defects are *model-specific*, **no single model covers all**, so a one-model battery has
   a structurally uncoverable residue (KB `WEB-VerifierEng`/E12). Bound from the same line
   (MAS-ProVe): an independent judge is not generally *more capable* — different-vendor buys
   **different blind spots**, not more strength.
3. **No long-context / strong-instruction assumption.** Design for a 128K-safe window (nominal
   windows overstate; use ~half of nominal). Lens prompts are rubric/checklist-shaped (weak
   instruction-followers need explicit criteria). Reasoning-line models keep their `<think>`
   (never compressed).

## The mechanism — five steps + a seed gate (cannot be simpler)

Load `lenses/<lens>.md` for the chosen lens(es). Run each lens in its OWN fresh context.

0. **SEED (anti-false-negative gate).** Before dispatch, plant ≥1 known seed defect (or attach a
   known-dirty control target). A lens run that misses its seed is **void** — not counted toward
   the stop condition. This is the defense PROVE-OR-FLAG can't give: PROVE-OR-FLAG filters false
   *positives*; SEED catches a blind attacker being read as "target clean." Seed carries a
   structured fingerprint (location + claim keywords); hit/miss is decided by deterministic
   match + human fallback, never by an uncalibrated judge. Seed recipes per target type:
   `references/seed-recipes.md`.
1. **FORK.** Dispatch a fresh attacker with zero build history (never saw impl / tests / author
   framing). Prefer a *different model* than the target's author (§Model-agnostic rule 2). This
   step cannot be skipped — skip it and the whole component is worth zero.
2. **AIM.** Hand it exactly one lens + the target + (if philosophy-grounded) its shadow-principles
   / falsifiable-questions as an attack map. **The map is a floor, not a ceiling**: ≥30% of each
   lens's budget must attack *off-map*, and "the shadow-principle is itself boilerplate / dodges
   the real risk" is its own finding class. The map is extracted by **deterministic script**
   (`scripts/extract_shadow_map.py`; the six-piece fields are lint-enforced, so grep gets them
   exactly), never by an LLM — that would re-open the map-tampering surface the script closes.
   Fields it cannot parse surface as `needs_human`, never silently dropped.
3. **STRIKE.** Attack the target's observable behavior / claims / internal coherence, through
   this one lens only.
4. **PROVE-OR-FLAG (classify, don't delete).** The striker reports EVERY anomaly it noticed —
   self-screening only proposes the label (finding vs flag + severity), it never drops an item:
   deletion authority belongs solely to the adjudicating judge (frontier models obey "only report
   proven/severe" literally and silently under-report, so discovery is coverage-first by
   construction). A finding needs `reproduction = {steps, expected, observed}`; a thought-experiment
   counts only if an **independent, non-author rerunner** can rerun it. The rubric
   (`references/prove-or-flag.md`) is itself an evaluator, so it carries ≥14 golden samples inline
   and is accepted on four axes including an **exploit test** (agreement ≠ anti-gaming).
   **Judge topology:** the attacker model self-labels; final adjudication is
   by a judge that is **different-vendor from the target's author** (closes model-level
   self-preference, not just author-level A31). Judge golden samples carry a `model_baseline` stamp
   and re-verify on model change.
5. **RANK & STOP.** Rank findings by severity (P1/P2/P3). Stop on a **pre-registered budget /
   marginal** condition — never "N clean rounds" (the battery is asymptotic). If budget is below
   the target's risk-tier floor, force-label the output `battery_grade: smoke-only`.

For breadth, run several lenses as a fan-out (one fresh context each), then a **synthesis pass
(R+1)**: one more fresh mind reads the union of all findings+flags and hunts *interaction* defects
(e.g. a gamed metric propped up by a stale citation = Gaming×Evidence) — what no single isolated
lens can see.

## Fix-audit rotation (mandatory when the target carries last round's fixes)

Round N produced fixes ⇒ round N+1 re-aims the five lenses at the **fix diff**, from a context that
did **not** write those fixes (a fixer auditing its own fix is the independence collapse this skill
exists to prevent). A battery whose last round contained fixes but no fix-audit is **not
converged** — say so in `coverage_gaps.notes`. **Not a sixth lens:** it changes the *object*, not
the failure class, so the A41 anti-bloat clause is respected, not amended. Earns its slot: the KB's
R17 battery round 2 landed **4 P1s, all inside round 1's own repairs**.

Four axes + how to obtain the diff and prior findings: `references/fix-audit.md`.

## The five lenses (the minimal spanning set; each is a philosophy pillar)

| Lens | Asks | Pillar | file |
|---|---|---|---|
| **Coherence** | Does the target contradict itself? (cross-arithmetic, tension arbitration, definition drift) | P0 / consistency | `lenses/coherence.md` |
| **Gaming** | Can a lazy/cheating actor satisfy it literally while defeating its spirit? | A31 / T12 anti-gaming | `lenses/gaming.md` |
| **Evidence** ⚡ | Are the claims true, current, honestly sourced? (carries web search) | P4 / P5 | `lenses/evidence.md` |
| **Reality** | Does it break on contact with a real target / real implementation? | P6 deploy-is-knowing | `lenses/reality.md` |
| **Foundation** | Is the core premise right, and will it rot? (attack the axioms + the evolution mechanism) | axioms / A41 | `lenses/foundation.md` |

Adding a sixth lens is forbidden unless it cannot fold into one of these five (anti-bloat, A41
reflexive) — fix-audit is a re-aiming *mode* of these five, not a sixth entry in this table. Each
lens prompt has a token cap (`references/prove-or-flag.md` §budgets).

## Contract (externalized — a stranger picks it up and runs)

**Input** `{ target, lenses[], budget, required_tier, attacker_models[]?, shadow_map?, prior_round? }`
- `target` anything (skill / design / argument / codebase / this KB itself) · `lenses[]` subset of
  the five (default all; quick check = Coherence + Gaming) · `budget` E9 rounds / tokens / marginal
  threshold.
- `required_tier`: `instance | model | human` — at A33 high stakes the conductor MUST require
  `model` and supply a different-vendor attacker in `attacker_models[]` (rule 2 above).
- `shadow_map?`: auto-extracted by script when the target is philosophy-grounded.
- `prior_round?`: `{ fix_diff, prior_findings }` ⇒ fix-audit is mandatory; fixes happened but no
  baseline ⇒ record `fix_audit: no-baseline` in notes (never fake the audit).

**Output** `{ findings[], flags[], stop_reason, coverage_gaps }` (schema: `schemas/output.json`)
- `findings[]`: each `{ lens, location, claim, reproduction, severity, independence_tier }` — the
  only class that counts as a result. `flags[]`: unproven suspicions, kept honestly separate and
  never dressed up as findings. `stop_reason`: which E9 condition fired.
- `coverage_gaps`: lenses not run + independence tier not reached + `battery_grade` + `notes` —
  **the honest confession of what was NOT covered** (feeds the repairer's decision to keep
  attacking). `notes` MUST state fix-audit status: `run` / `not-applicable` / `no-baseline` /
  `skipped`.

## Harness requirements (what the host must provide)

Four minimal capabilities, supplied by the host / conductor (not the attacker) on a bare API model:
- **fork**: spawn a fresh isolated context (a subagent, or a separate API session with clean prompt).
- **search**: web access for the Evidence lens (without it, Evidence degrades to internal-only —
  say so in coverage_gaps).
- **execute**: run the reproduction for PROVE (code/CLI, or a rerunner for argument targets).
- **ledger**: tamper-evident record of findings (hash-chain / git commit) written **by the
  conductor before the owner receives them** (stops silent deletion of a P1). Standalone use with
  no conductor: a human operator commits the findings to git — degrade gracefully, note it. It is
  also what makes fix-audit possible: **no prior-round record, no fix-audit**.

## What it deliberately does NOT do (this is the "light")

- Does NOT fix anything (records breakages only; repair is a separate role/skill).
- Does NOT carry a fixed test suite or scaffolding subdirectories (the lenses ARE the apparatus).
- Does NOT invent attack surface when the target already confesses it — but never stops at the
  map (off-map budget is mandatory).
- Does NOT claim battery-equivalence when only `instance`-tier independence was reached (single
  operator / single model) — `coverage_gaps` records the gap instead of pretending.
- Full apparatus: 1 SKILL.md + 5 lens prompts + 1 rubric (+golden samples) + 2 reference notes
  (seed recipes, fix-audit) + 1 extract script + 1 output schema. No `rules/`, no per-target
  scaffolding; total under a third of the previous attacker's weight.

## Honest coverage note (this skill's own coverage_gaps)

Every round that shaped this skill was `instance`-tier (one Fable family attacking its own KB).
Per T11 the **model-level blind spot is systematically invisible** to all of them, and PBT-Bench
puts a number under it (hardest-defect coverage is model-specific; no single model covers all) —
the residue is *measured to exist*, not merely feared. So "converged" here means "converged against
same-family attack," not "validated across models." The pre-registered acceptance test is therefore
**one run with a different-vendor attacker** (GPT / Gemini / DeepSeek / Kimi) against a real target,
using SEED hit-rate as a capability probe (measuring the weak-attacker-finds-less risk, not just
independence). Until that run exists, this skill is proven to *find things*, not proven
*model-portable in the field*.
