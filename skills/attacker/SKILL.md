---
name: attacker
description: >-
  Attack any target (skill, design, argument, code, KB) with a FRESH, independent attacker
  rotating five lenses; records ONLY proven, reproducible breakages, never fixes.
  Model-agnostic — a different-vendor attacker buys stronger independence. Use-when:
  "red-team/break this", "$attacker". Do-NOT: fix or edit the target.
metadata:
  version: 0.5.0
  model_agnostic: true
---

# attacker

Fork a fresh mind, point it at the target through one lens, keep only what it can prove.
The mechanism is trivial on purpose. The power is not in the mechanism — it is in **what the
fresh mind is handed**: a fixed rotation of five lenses, and (when the target is
philosophy-grounded) the target's own shadow-principles as a pre-drawn map of where to strike.
The philosophy does the aiming; the attacker pulls the trigger and refuses to lie about what fell.

The deliverable is a set of **findings** (proven, reproducible breakages) plus **flags**
(unproven suspicions, kept separate). Never a fix, never an edit to the target, never a
passing test suite. The defect this targets is the **false-positive result**: a green suite /
a self-consistent design on top of a broken thing, because the check was made from the *same
mental model* as the thing (correlated error). The only cure is **engineered independence** —
so the attacker runs from a context that never saw the build, and, at high stakes, from a
*different model*. Independence is the entire value proposition; every other choice protects it.

## Model-agnostic (design constraint zero, non-negotiable)

Runs on any model, and any model can BE the attacker. Three rules make this hold:
1. **Portable wording.** Lens prompts and the rubric are Markdown + separators, no XML-semantic
   tags (all major CN vendors push Markdown; every model parses it — Claude is slightly
   sub-optimal, accepted). Any tool schema uses the six-vendor intersection (object root, all
   `required`, no `minLength`/`minItems`, English snake_case).
2. **Different-model = stronger independence, as a first-class path.** Same-family self-attack
   is `instance`-tier only; model-level blind spots stay invisible (self-preference bias is a
   *model-level* effect). So FORK **prefers an attacker model different from the target/author's
   model** — buying `model`-tier independence by construction, not as an afterthought.
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
2. **AIM.** Hand it exactly one lens + the target + (if the target is philosophy-grounded) its
   shadow-principles / falsifiable-questions as an attack map. **The map is a floor, not a
   ceiling**: at least 30% of each lens's budget must attack *off-map*, and "the shadow-principle
   itself is boilerplate / dodges the real risk" is itself a finding class. The map is extracted
   by **deterministic script** (`scripts/extract_shadow_map.py` — the six-piece fields are
   lint-enforced, so grep gets them exactly), never by an LLM (an LLM would re-open the
   map-tampering surface the script closes); the script only flags its own failures as
   `needs_human`.
3. **STRIKE.** Attack the target's observable behavior / claims / internal coherence, through
   this one lens only.
4. **PROVE-OR-FLAG.** A finding needs `reproduction = {steps, expected, observed}`; a
   thought-experiment counts only if an **independent, non-author rerunner** can rerun it. The
   rubric (`references/prove-or-flag.md`) is itself an evaluator, so it carries golden samples
   inline (§Golden samples, ≥12, incl. the hard case "a suspicion dressed as a thought
   experiment"). **Judge topology:** the attacker model self-screens; final adjudication is by a
   judge that is **different-vendor from the target's author** (closes model-level self-preference,
   not just author-level A31). Judge golden samples carry a `model_baseline` stamp and re-verify
   on model change.
5. **RANK & STOP.** Rank findings by severity (P1/P2/P3). Stop on a **pre-registered budget /
   marginal** condition — never "N clean rounds" (the battery is asymptotic). If budget is below
   the target's risk-tier floor, force-label the output `battery_grade: smoke-only`.

For breadth, run several lenses as a fan-out (one fresh context each), then a **synthesis pass
(R+1)**: one more fresh mind reads the union of all findings+flags and hunts *interaction* defects
(e.g. a gamed metric propped up by a stale citation = Gaming×Evidence) — the thing no single
isolated lens can see.

## The five lenses (the minimal spanning set; each is a philosophy pillar)

| Lens | Asks | Pillar | file |
|---|---|---|---|
| **Coherence** | Does the target contradict itself? (cross-arithmetic, tension arbitration, definition drift) | P0 / consistency | `lenses/coherence.md` |
| **Gaming** | Can a lazy/cheating actor satisfy it literally while defeating its spirit? | A31 / T12 anti-gaming | `lenses/gaming.md` |
| **Evidence** ⚡ | Are the claims true, current, honestly sourced? (carries web search) | P4 / P5 | `lenses/evidence.md` |
| **Reality** | Does it break on contact with a real target / real implementation? | P6 deploy-is-knowing | `lenses/reality.md` |
| **Foundation** | Is the core premise right, and will it rot? (attack the axioms + the evolution mechanism) | axioms / A41 | `lenses/foundation.md` |

Adding a sixth lens is forbidden unless it cannot fold into one of these five (anti-bloat, A41
reflexive). Each lens prompt has a token cap (`references/prove-or-flag.md` §budgets).

## Contract (externalized — a stranger picks it up and runs)

**Input** `{ target, lenses[], budget, required_tier, attacker_models[]?, shadow_map? }`
- `target`: anything (skill / design / argument / codebase / this KB itself).
- `lenses[]`: subset of the five (default all; quick check = Coherence + Gaming only).
- `budget`: E9 budget (rounds / tokens / marginal threshold).
- `required_tier`: `instance | model | human` — at A33 high stakes the conductor MUST require
  `model` and supply a different-vendor attacker (`attacker_models[]`).
- `shadow_map?`: auto-extracted by script when the target is philosophy-grounded.

**Output** `{ findings[], flags[], stop_reason, coverage_gaps }`
- `findings[]`: each `{ lens, location, claim, reproduction, severity, independence_tier }` — the
  only class that counts as a result.
- `flags[]`: unproven suspicions (kept honestly separate, never dressed up as findings).
- `stop_reason`: which E9 condition fired.
- `coverage_gaps`: lenses not run + independence tier not reached + `battery_grade` — **the
  honest confession of what was NOT covered** (feeds the repairer's decision to keep attacking).

Output schema is six-vendor-intersection JSON (`schemas/output.json`).

## Harness requirements (what the host must provide)

The mechanism assumes an agentic harness with four minimal capabilities. On a bare API model these
are supplied by the host / conductor, not by the attacker:
- **fork**: spawn a fresh isolated context (a subagent, or a separate API session with clean prompt).
- **search**: web access for the Evidence lens (without it, Evidence degrades to internal-only —
  say so in coverage_gaps).
- **execute**: run the reproduction for PROVE (code/CLI, or a rerunner for argument targets).
- **ledger**: tamper-evident record of findings (hash-chain / git commit) written **by the
  conductor before the owner receives them** (stops silent deletion of a P1). Standalone use with
  no conductor: a human operator commits the findings to git — degrade gracefully, note it.

## What it deliberately does NOT do (this is the "light")

- Does NOT fix anything (records breakages only; repair is a separate role/skill).
- Does NOT carry a fixed test suite or scaffolding subdirectories (the lenses ARE the apparatus).
- Does NOT invent attack surface when the target already confesses it — but never stops at the
  map (off-map budget is mandatory).
- Does NOT claim battery-equivalence when only `instance`-tier independence was reached (single
  operator / single model) — it records the gap instead of pretending.
- Full apparatus: 1 SKILL.md + 5 lens prompts + 1 rubric (+golden samples) + 1 seed-recipe note +
  1 extract script + 1 output schema. No `rules/`, no per-target scaffolding. Target: total under
  a third of the previous attacker's weight.

## Honest coverage note (this skill's own coverage_gaps)

Every round that shaped this skill was `instance`-tier (one Fable family attacking its own KB).
Per T11 the **model-level blind spot is systematically invisible** to all of them — so "converged"
here means "converged against same-family attack," not "validated across models." The skill's own
pre-registered acceptance test is therefore: **run it once with a different-vendor attacker**
(GPT / Gemini / DeepSeek / Kimi) against a real target, using the SEED hit-rate as a
capability probe (to measure the weak-attacker-finds-less risk, not just independence). Until that
run exists, this skill is proven to *find things*, not proven to be *model-portable in the field*.
