# vince-skill series vs. the best public skills — benchmark synthesis

Date: 2026-06-04. Corpus: the 8 reference repos in [`learning_from_the_best/`](../../learning_from_the_best/)
(217k-star `superpowers`, official `anthropics/skills`, `addyosmani`, `vercel`, `kepano`, `trailofbits`,
the `agentskills` spec, the `composio` aggregator). Subject: the 4-stage pipeline in `vinceSKILLcreate/`.

Per-stage deep-dives (read these for the evidence):
- [00 — Anatomy of an excellent industrial skill](00-anatomy-of-excellent-skills.md) (the shared rubric)
- [vince-skill-conductor](vince-skill-conductor.md) · [vince-skill-guidance](vince-skill-guidance.md) · [vince-skill-engineer](vince-skill-engineer.md) · [vince-skill-zipper](vince-skill-zipper.md)

---

## TL;DR

Your pipeline is **genuinely industrial-grade, and in its core mechanic it is *ahead* of every public skill we studied** — including Anthropic's own. The field orchestrates skill-work by *methodology* (superpowers), *measurement* (skill-creator), or *taste* (kepano). You orchestrate by **machine-readable contracts + deterministic proof at every handoff** (JSON schemas, runnable gate predicates, a lossless diff, a min(re-audit, battery) anti-inflation rule). Nobody else ships that.

The thesis you stated — *the conductor is for mass-producing heavyweight skills, and the short/flexible ones are out of scope because they can't be industrialized* — **is correct, and the corpus proves why** (below). The one capability you're missing is the one thing the field's best does that you don't: **empirically running the built skill to measure triggering/behavior**, instead of reasoning about it statically. That single gap recurs in 3 of your 4 stages and is the highest-leverage thing to add.

---

## Your thesis, tested: the two classes of "excellent skill"

The corpus splits cleanly, exactly as you predicted:

| | (A) HEAVYWEIGHT / INDUSTRIAL — *your target* | (B) SHORT / FLEXIBLE / ELEGANT — *out of scope* |
|---|---|---|
| **Examples** | `skill-creator`, `pptx`/`xlsx` (XSD validators), `mcp-builder`, `canvas-design`, `webapp-testing` | `brainstorming`, `obsidian-markdown`, `frontend-design` (42 lines), most `kepano` skills |
| **Quality comes from** | A reproducible *apparatus*: scripts, schemas, evals, validators, gates | *Taste / judgment / restraint* — responsiveness to a human, domain immersion |
| **Has a checkable output contract?** | Yes (schema / string-comparable / XSD) | No — quality is "museum-grade", "unforgettable" |
| **Mass-producible by a pipeline?** | **Yes** | **No** |

**Why (B) resists industrialization** (the 3 sharpest reasons, from [00](00-anatomy-of-excellent-skills.md)):
1. **No checkable output contract** — a deterministic loop has nothing to optimize against; `skill-creator` itself says don't force assertions onto subjective skills.
2. **Dialogue/immersion, not a pipeline** — e.g. `brainstorming` branches per human answer; the value *is* the responsiveness any fixed process flattens.
3. **Excellence is restraint a generator over-builds** — `frontend-design` does more *by omission*; your pipeline's instinct to add scaffolding is value for (A) but actively dilutes (B).

→ **Benchmarking only against class (A) is the right call.** And the single class-(A) skill to study hardest is **[`skill-creator`](../../learning_from_the_best/anthropics-skills/skills/skill-creator/)** — it is the only public skill that is *itself an end-to-end skill-production pipeline*, i.e. your conductor's twin. (Note: heavyweight ≠ long SKILL.md — `web-artifacts-builder` is 73 lines, `mcp-builder`'s is 236 over ~2,500 lines of `reference/`. Industrial = the apparatus *behind* the file.)

---

## Per-stage scorecard

| Stage | What it is | Where it **leads** the field | Verdict |
|---|---|---|---|
| **conductor** | Thin orchestrator: guidance→engineer→zipper→final-audit, bounded gate loops | Machine-readable run-log schema + runnable gate predicates + `min(re_audit, battery)` anti-inflation final acceptance with an **independent** fresh-subagent battery. No counterpart has a blocking, auditable gate contract. | Industrial-grade; ahead on mechanism. Blemish: 2 stale paths (real bug). |
| **guidance** | Audits/scores a skill, emits a typed handoff-spec | Only skill in the corpus that emits a **program-consumable** spec (`additionalProperties:false`, verdict formula, altitude model, adversarial checklist that mechanically rejects edges without an expected output). | Best-in-class for its niche. Gap: scores **statically**, never runs the target. |
| **engineer** | Builds + tests a skill from the spec (red→green→refactor) | Spec-driven **scaffold generator** (skill-creator has none) + a verification harness that forces the mechanism into `scripts/` and *imports* it, demanding a real `FAIL` red-log. The Office skills ship **zero** tests for their own scripts — you're stronger here. | Industrial-grade; ahead on scaffolding + self-testing. Gap: no empirical *trigger* run. |
| **zipper** | Lossless restructure for tokens + progressive disclosure + trigger accuracy | **Lossless diff + token-delta proof** (`diff_lossless.py`, `measure_tokens.py`). A corpus-wide grep confirms **nothing else pairs lossless-classification with token measurement.** | Industrial-grade; uniquely ahead. Gaps: Retrigger is static; missing the no-summarize-workflow rule. |

All four stages' bundled evals were **executed by the agents this session and pass GREEN**.

---

## The shared gaps (ranked — same theme keeps surfacing)

**P0 — Empirical evaluation (the one real capability gap; hits guidance + engineer + zipper).**
Your whole pipeline reasons about skills *statically*: it scores files, validates schemas, runs the engineer's *own* scaffolder — but it never spawns the built skill via `claude -p` to measure **trigger-rate and behavior against a baseline**, which is exactly what [`skill-creator`](../../learning_from_the_best/anthropics-skills/skills/skill-creator/) does (`scripts/run_eval.py`, `run_loop.py`, `improve_description.py` — with a train/test split and mean±stddev variance). This is the line between *structurally* industrial (you) and *empirically* industrial (them). Port it once as a shared `trigger_eval` and wire it into guidance's metrics pillar, the engineer's `trigger` unit, and the zipper's Retrigger op.

**P1 — The "description must not summarize the workflow" rule.**
superpowers `writing-skills`' single most load-bearing finding: a description that summarizes *how* makes Claude follow the summary and **skip the body**; it must say *when* only. This rule is **absent** from the zipper's `description-quality.md` — and several vince-skill descriptions (the zipper's own included) violate it. Cheap, high-leverage. Add it as an 8th scorecard item.

**P2 — Hygiene: stale paths (a verified bug).**
[conductor.md](vince-skill-conductor.md) found real doc-rot, masked by an eval fallback so it stays green:
- `vince-skill-conductor/SKILL.md:36` & `rules/pipeline-loop.md:154` → point at `../chore-develop-vince-skill-zipper/vince-skill-zipper/…`; the skill is actually at `../vince-skill-zipper/`.
- `vince-skill-conductor/SKILL.md:38` & `vince-skill-guidance/SKILL.md:27` → `Backing KB: ../develop-principle` is an off-by-one; the real KB is `../../develop-principle`.
Fix the references **and** add a guidance eval that greps sibling/KB paths and asserts each resolves (trailofbits `workflow-skill-design`'s anti-pattern catalog literally names this — adopting its checklist as a pre-ship gate would have caught it).

**Per-stage extras** (detail in each file): guidance → per-pillar 0–1 confidence + validate the *emitted* spec with ajv (not just `JSON.parse`); engineer → bundle a frontmatter linter (`quick_validate.py`) + persist a regression set; zipper → real tokenizer (the `--tokenizer` flag is unimplemented; current count is a ±5% proxy) + a reference-*chain* guard.

---

## What to do next (suggested order)

1. **Fix the stale paths** (5 min, real bug) + add the path-resolution eval check. *I can do this now.*
2. **Add the no-summarize-workflow description rule** to the zipper + scorecard, and fix the offending descriptions. *Cheap, high-leverage.*
3. **Build the shared empirical `trigger_eval`** by porting skill-creator's loop, then wire it into all three stages. *The real upgrade — turns "structurally industrial" into "empirically industrial."*
4. Adopt trailofbits `workflow-skill-design`'s anti-pattern checklist as a conductor pre-ship gate.

The headline: you've out-engineered the field on *contracts and proof*. Close the *empirical-evaluation* gap and the pipeline is industrial on both axes.
