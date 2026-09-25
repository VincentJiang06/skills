# skill-creator-max

> The whole skill-building pipeline in one skill — a thin conductor dispatches a **fresh subagent** per role, judges only the returned typed artifact, gates on it, and routes; every rule cites a `skill-philosophy` KB anchor.

**English** · [简体中文](README.md)

**What it does** — Folds the five skill-building functions — composer (decision spec) / guidance (structure contract) / engineer (red-green build) / zipper (lossless compression) / conductor — into **one** skill. The SKILL.md body is a **thin conductor**: it performs none of the functions itself; it **dispatches one fresh subagent per role, monitors the returned typed artifact, validates it against a deterministic gate, and routes the next move**. All of the conductor's power comes from artifacts, never from reading a subagent's process. **This IS the repo's skill-building pipeline now**: it replaces the retired four-skill architecture (skill-guidance / skill-engineer / skill-zipper / skill-conductor — removed from the repo).

**The architecture** —

- **Thin always-loaded body + five on-demand role-packs**: `roles/{composer,guidance,engineer,zipper,battery}.md` load only into the dispatched subagent's context, never into the conductor body (anti-bloat).
- **Five artifact JSON schemas**: SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord — all written to the six-vendor intersection, portable.
- **Deterministic L0 gate scripts** (`scripts/validate_*`): **structure-only** — passing a gate is never evidence the content is right (schema-valid ≠ true). Substance is bought by the battery.
- **O5 independent adversarial battery**: `roles/battery.md` is self-contained (distilled from the vince-attacker five lenses), no external skill needed; at high stakes, dispatch a **different-vendor attacker** for model-tier independence.
- **Runs fully standalone**: the `skill-philosophy` KB is design-time provenance kept **outside the repo** — NOT shipped, NOT read at runtime. The role-packs operationalize its rules and inline the anchors as citation labels, so no KB needs to be present to run the pipeline.

**Why it's good (the six pits it closes)** —

1. **Green-but-wrong validators** — gates are deliberately demoted to L0 structure-only; substantive evidence can only come from the independent battery + second-order spot-checks.
2. **The asymptotic battery mis-encoded as "N clean rounds"** — the stop condition is a pre-registered E9 budget/marginal gate, never a clean-round count.
3. **Single-operator self-report / forgeable gates** — gate control is out-of-band, and every gate verdict is saved as a complete decision object (Decision Record: evidence, rejected options, uncertainty, adjudicator).
4. **Bloat** — the conductor body stays thin; the heavy rules live in role-packs and enter only the subagent's context on demand.
5. **Orchestration friction + correlated authorship** — one skill removes the cross-skill handoffs; **fresh-subagent dispatch per role** decorrelates builder from grader by construction.
6. **Description / portability** — six-vendor-intersection schemas + description-length discipline + hard anti-triggers.

**v1.3.3 (repair round 3 of the 1.3.x line, authorized by the owner on 2026-09-25; only the two items that held the release back)** —
- **FA-1 fixed:** `validate_decision` checks a ceiling: `effective_verdict` may not exceed `min(re_audit, battery)`; equality is no longer required. The old equality check, once `clean` became reachable, forced a clean battery at instance tier, smoke-only or all-void up to `industrial` and rejected an honest `candidate`. Caps below the ceiling (tier short of the stakes, smoke-only, every run void) are the conductor's call, recorded with the reason; a gate PASS alone never means `industrial`. On all 35 real Decision Records the old and new verdicts are identical: 0 new false positives.
- **E11 artifact miss fixed in prose:** SKILL.md §7 adds an owner-facing register: an existing record is the owner's, so extend it in place, keep its format, leave a value it never recorded unknown, and never convert or replace it; tell the owner each rule in plain words, with an internal ID (K3, A51) only in brackets after. E11 has not been re-run to confirm it.
- SKILL.md 3,186 tok (cap 3,200); scripts 2,220 -> 2,236 lines.

**v1.3.2 (release record for the R20 wave; no behaviour change).** Effective verdict: `candidate`; pipeline: `stopped_unmet`; the repair budget is spent.
- **E11 two-arm test (3 cases, directional only):**
  - Fidelity: WITH won 2, tied 1, lost 0.
  - Artifact: WITH was better on only 1 of 3. The pre-registered bar was 2 of 3, so this criterion was not met.
  - Cost (tool-call proxy): about 2.7x, 0.9x and 2.2x.
  - Not a retirement case.
- **Battery:** instance tier; seeds 5/5; 3 P2 and 15 P3 confirmed. The three P2s were fixed in 1.3.1.
- **Fix-audit:** found 1 new P2. Now that `clean` is reachable, `validate_decision` caps the verdict only by the battery verdict. It ignores the independence tier, smoke-only grading and voided runs, so an instance-tier `clean` battery forces `industrial`. Until this is repaired, the conductor caps the verdict at `candidate` by hand and records why.
- **Independence is `instance` only.** On the owner's order, every role in this wave ran on Opus 5.5 high. That is a recorded deviation from the 2026-09-13 model policy (builders on fable, evaluators on opus).

**v1.3.1 (repair round 1 on the 1.3.0 battery; the three P2s only)** — a blank SkillSpec field is carried only by an unknowns/disputes entry with an explicit `field` key (it used to be a substring match over free text, so a discovery plan mentioning "trigger" counted); `red_before_green` is stated as self-reported, and "red predates green on the same cases" is checked by the conductor reading the red log at stage 3 and by the battery, not by the gate; the battery's `clean` now means "no adjudicated P1/P2" (P3s and flags are recorded, not blocking).

**New in v1.3.0 (aligned to philosophy KB v0.4.0 / R20, incremental)** —

- **`deterministic` is for skeleton checks only**: the verdict information must be in the string (existence / count / verbatim / structural isomorphism / hash, byte or numeric compare). A script exit code over an approximation of meaning (similarity, threshold, regex) is `llm_judge` with full calibration, or report-only evidence, unless it shows the A50 three items (separability witness, false positives on all real corpus, lineage). The label is the engineer's **proposal**; the conductor confirms it at the stage-3 gate and records it in the Decision Record.
- **Judgment ledger**: guidance registers each judgment of the built skill with its plane (D/L/H/D→L/L→D), executor and fallback; the schema property is optional, so older contracts stay valid; the conductor spot-checks it at stage 2.
- **Stop signatures (A51) + four-way routing (H4)**: at most 2 repair rounds per skill version (not reset by a new author, session or self-bumped version); a P0/P1 inside the previous fix, >50% growth, a third exception layer on one threshold, or a second copy of one root cause stops the loop and goes to the owner. Routing is escalate → re-plane → loopback → restart, first match wins; re-plane is an owner/gate ruling, never a way around the round cap. Iron laws 3/4 now hold outside `skill-developer/` too.
- **Battery fix-audit**: after a round with fixes, the next round aims the five lenses at the fix diff (distilled from vince-attacker 0.7.0; the attacker's text governs when it is the one dispatched).
- **E11 instrument checklist + three-branch acceptance**; the model policy now sets **effort explicitly** (evaluators at least high) and uses K1 tier labels correctly (Opus judging Fable = L-i+, not L-m); `model_baseline` = resolved model ID + effort + harness version.
- Also: the trust boundary covers relayed third-party text, subagent output, relayed authorizations and agent-self-written persistent text; memory writes are admitted by writer; the zipper needs bare-model evidence before deleting "default-known" text and never deletes the A42(iv) exempt zone; `(M3)` → `(K3)`. No L0 validator logic changed and no new mechanical gate was added.

**New in v1.2.0 (aligned to philosophy KB v0.3.0 / R17)** —

- **composer gains a step on what a spec can and cannot buy (C10)**: a core clause is
  load-bearing only if it carries an **adversarial precedent** (an input built to falsify it) —
  at least one per subjective success dimension, and every unacceptable failure names the input
  class that produces it; the **reverse flow** ("let an agent read the codebase and write the
  spec") is refused as the AUTHOR of the decision fields (repo-level executable-spec generation
  tops out at 20.2%; it stays legal as baseline/materials input); and **compliance tops out near
  89%, non-monotonically across versions** — a complete spec never buys a smaller verification
  budget.
- **engineer gains three verifier-engineering rules (E12) + a loop branch (A45)**: a 0%-pass
  wipeout indicts the harness first (prove a known-good input scores green and a degenerate output
  scores red before touching the skill); judge **one case per call** — batch scoring has a measured
  accuracy cost; **non-overlapping rubric items** are the first principle of false-positive control
  and agreement rates are blind to manipulability. If the BUILT skill is itself a **>1-round
  autonomous loop**, its Evidence Dossier must carry a **loop-charter** (runnable checks run red
  first · adjudication separated from the generator · on-disk state passing a cold restart · a
  structured stop condition with the cap inside it and both stop sides).
- **guidance gains three conditional branches (S12/S13/A48)**: **tool surface** — the interface is
  a hyperparameter (3–8pp, non-monotonic): >30 tools ⇒ evaluate on-demand loading, >=3–4 sentences
  + input examples per tool, merge related operations behind an `action` parameter, calibrate the
  visibility knobs with a model_baseline stamp; **action surface** — declare the rule layer and the
  enforcement layer separately (a command allowlist is a rule layer only), keep confirmation gates
  few and real (~93% approval rates make per-command prompting fatigue, not governance), and never
  let the governed widen its own authority; **memory surface** — write admission is Durable ∧
  Actionable ∧ Explicit, factual entries carry verification anchors that are re-run rather than
  believed, forgetting is an obligation (delete or tombstone), and external content is storable
  only as reference + provenance, never as a behavioral instruction.
- **The conductor gained exactly one conditional paragraph** routing those branches into existing
  gates — **gate order and the min() adjudication are unchanged**, and no semantic judgment was
  mechanized.

**Trigger discipline (important)** — This skill is **EXPENSIVE** (large token cost). It fires ONLY on an explicit user request to **author/build/create an agent skill** ("build me a skill", "create a new skill", "$skill-creator-max"), with hard anti-triggers against daily-memory-summary / journaling / any generic "create/make/summarize X". Trigger holdout eval: **0/12 false-fires**. If intent is ambiguous, it asks one question rather than betting the pipeline on a guess.

**When to use** — "build me a skill" · "create a new skill for X" · "package this repeated workflow so it triggers automatically" · "$skill-creator-max".

**When NOT to use** — Summarizing/writing daily memory or journaling (hard anti-trigger); any single stage on its own (auditing an existing skill, compressing only, running one attack round → the respective standalone skills); any generic create request that is not authoring an agent skill.

**Model-agnostic** — Role-packs are portable Markdown; all artifact schemas use six-vendor-intersection JSON; any model can run the whole pipeline. A different-vendor attacker at high-stakes acceptance buys stronger battery independence.

**What ships** — 1 `SKILL.md` (thin conductor) + 5 role-packs (`roles/`) + 5 artifact schemas (`schemas/`) + 7 deterministic gate scripts (`scripts/`, each with a `--selftest` discrimination proof) + 1 orchestration-anchors reference (`references/orchestration-anchors.md`).

**Install** — `cp -R skills/skill-creator-max ~/.claude/skills/skill-creator-max` (or via `npx skills add VincentJiang06/skills`).

**Live-test record (v1.0.0)** — The pipeline has now been exercised on two real builds: (1) it built a brand-new skill (`paper-writer`) end-to-end from nothing; (2) it rebuilt `humanizer-academic` to v4.0.0 through the pipeline. Both runs used **genuine per-role fresh-context independence** (a separate dispatched subagent per role — not one agent playing all roles), which closes the biggest coverage gap of the 0.1.0-draft era. The independent battery also earned its keep: it caught real defects that the builders' own green test suites missed (a paper-writer P1 integrity gap; the humanizer hemoglobin fact-invention).

**Honest residual** — the **cross-vendor (model-tier) battery has still not been run**: every battery round to date was instance-tier independence within the same model family. That is the one remaining independence gap. Self-rated strong-candidate / 1.0, with that caveat stated.

Full mechanism in [SKILL.md](SKILL.md).
