# Benchmark: `vince-skill-guidance` (Stage 1 — audit / score / spec)

*Date: 2026-06-04. Lens: heavyweight/industrial (class A) skills only. Paths relative to `/Users/vince/playground/skill-developer/`.*

## 1. What it does

`vince-skill-guidance` is Stage 1 of Vince's pipeline: it ingests a target SKILL.md or skill repo (a "blank idea" stub is first-class input), reads it against the local `develop-principle` KB, scores it on a **7-pillar readiness rubric**, picks an **altitude** (lite vs full), mines 1–2 comparable real skills, and emits a **machine-readable `handoff-spec.json`** that `vince-skill-engineer` (Stage 2) builds from. It plans and evaluates — it never builds — and runs autonomously, recording uncertainty in `blocking_unknowns` rather than stopping to ask (`vinceSKILLcreate/vince-skill-guidance/SKILL.md:14-20`).

## 2. Industrial-grade features it has

- **A schema-enforced handoff contract.** `assets/handoff-spec.schema.json` is a JSON-Schema 2020-12 doc with `additionalProperties:false` throughout, a pinned `schema_version` const, exactly-7-entry `scorecard` (`minItems/maxItems:7`, schema:39-40), and an enum-locked vocabulary for status/verdict/priority/pillar. Most striking: `adversarial_checklist` requires `minItems:1` and forces every entry to contain `→` via `"pattern": "→"` (schema:91-99) — the schema mechanically rejects a checklist that doesn't state *expected output per hazard*.
- **A deterministic structural scorer.** `scripts/score_skill.mjs` emits JSON facts (frontmatter parse, dir inventory, `description_has_use_when`/`_donot` regexes, line count, per-pillar `present/partial/absent` hints, a `maturity_hint`) — explicitly "evidence seeds, not verdicts" (`scripts/score_skill.mjs:1-5,99-101`). It exits non-zero when no SKILL.md exists, which the protocol uses as a hard refuse-gate (`SKILL.md:65-68`).
- **A defined rubric with a scoring formula and cap rules.** `rules/scorecard.md:14-22` defines `readiness = Σscores / (2 × non-N/A pillars)`, verdict bands (≥0.85 industrial / 0.55–0.84 candidate / <0.55 draft), and a **required-pillar-absent cap** that pins verdict to `draft` regardless of ratio. N/A pillars drop from the denominator so lite skills aren't punished for lacking lifecycle ops.
- **An explicit altitude model.** `rules/altitude.md` maps stakes × maturity × surface to lite/full, with a required-pillars table per altitude (altitude.md:46-54) and a "dangerous-capability wins ties" override (altitude.md:21,28-30). This encodes "industrial ≠ always-heavy."
- **Intent/maturity + comparables rules.** `rules/intent-and-maturity.md` defines stub/draft/mature and the "blank idea is valid input, no-SKILL.md is a refuse" boundary; `rules/comparables.md` is a light "资料搜集" step that fetches real skills from a registry and extracts *structure, never content* (comparables.md:58-61).
- **Self-evals.** `evals/run_all.mjs` is a deterministic green/red harness asserting the schema's checklist constraints and that `score_skill.mjs` accepts a "Use this whenever…" trigger (run_all.mjs:44-82); `evals/evals.json` holds 3 behavioral cases (mature / stub / other-domain).

## 3. Best-in-class external counterparts (class A)

- **`anthropics-skills/skills/skill-creator/`** — the canonical *empirical* evaluator. It runs with-skill vs. baseline subagents in the same turn, grades assertions (`agents/grader.md`), does an analyst variance pass for non-discriminating/flaky evals, supports blind A/B comparison (`agents/comparator.md`), and **auto-optimizes the description** on a 60/40 train/held-out split, 3 runs per query, selecting `best_description` by test score to avoid overfitting (`scripts/improve_description.py`, `scripts/run_loop.py`; SKILL.md:337-404).
- **`trailofbits-skills/plugins/workflow-skill-design/`** — a structural rubric without scoring: 20 enumerated anti-patterns with one-line fixes (AP-1…AP-20), a Success-Criteria checklist, and a paired `agents/workflow-skill-reviewer.md` that runs a fixed 6-phase audit and emits an **A–F grade** with a structured findings table.
- **`trailofbits-skills/plugins/skill-improver/`** — the closed-loop iterator: a fix→review cycle driven by a stop-hook that only terminates on an explicit `<skill-improvement-complete>` marker (SKILL.md:111-139).
- **`trailofbits-skills/plugins/spec-to-code-compliance/`** — the gold standard for **evidence-traceable spec auditing**: extraction→alignment→classification→reporting as separated phases, a typed Spec-IR/Code-IR/Alignment-IR, per-mapping confidence scores (0–1), and anti-hallucination rules (quote exact text/line or mark UNDOCUMENTED).
- **Requirements elicitation:** `addyosmani-agent-skills/skills/interview-me/` (one-question-at-a-time, each with an attached guess + confidence number, to ~95% before any plan), `.../idea-refine/` (divergent→convergent, "Not Doing" list, AskUserQuestion), `.../spec-driven-development/` (6-area gated spec with Always/Ask-first/Never boundaries), and `trailofbits .../ask-questions-if-underspecified/` (min-question multiple-choice with a `defaults` fast-path).
- **`superpowers/skills/writing-skills/`** — includes `testing-skills-with-subagents.md`: the discipline of red-teaming a skill with fresh subagents before trusting it.

## 4. Head-to-head

**Stronger than all counterparts:**
- **Machine-readable spec with an enforced schema.** No counterpart emits a typed, schema-validated handoff. skill-creator and interview-me/idea-refine produce prose markdown (`docs/ideas/*.md`, a spec doc); spec-driven-development hands over a markdown template; the workflow-skill-reviewer emits a markdown grade table. vince-guidance's `handoff-spec.schema.json` is the only artifact another *program* (`vince-skill-engineer`) can consume cold — this is the pipeline's load-bearing advantage.
- **The `→`-pattern adversarial-checklist contract.** Forcing each edge to carry its expected output (schema:91-99, `rules/spec-format.md:30-52`) is a green-but-wrong defense none of the others encode mechanically.
- **Altitude / right-rigor model.** No counterpart formalizes "don't force a 30-line utility through full ceremony." workflow-skill-design's "degrees-of-freedom" principle is the nearest idea but is per-step prose, not a verdict-affecting dial.

**On par:**
- **Structural auditing.** Its `score_skill.mjs` + 7-pillar rubric ≈ the workflow-skill-reviewer's 6-phase checklist and skill-improver's severity tiers. vince-guidance has the cleaner *formula* (numeric ratio + cap rule); trailofbits has a richer *catalog* (20 named anti-patterns with before/after fixes) that vince's `design` pillar gestures at but doesn't enumerate.

**Weaker:**
- **No empirical / behavioral evaluation.** This is the headline gap. skill-creator *runs the skill* (with-skill vs baseline, graded assertions, variance analysis) and *measures the description's trigger rate* on a held-out split. vince-guidance's scorecard is entirely **static structural inference** — it reads files and judges, but never executes the target or counts a real trigger/pass rate. Its own `metrics` pillar demands "activation precision / pass^k" of *its targets* while the auditor itself measures none.
- **Requirements elicitation is intentionally absent.** Because it runs autonomously (`SKILL.md:18-20`), it cannot do what interview-me/idea-refine/ask-questions do best: extract latent intent from a human via one-at-a-time questions with confidence tracking. For a thin stub, "best reading → `blocking_unknowns`" is strictly weaker than a 95%-confidence interview. This is a deliberate trade (pipeline autonomy) but a real capability gap vs best-in-class elicitation.
- **No confidence scores or evidence-IR.** spec-to-code-compliance attaches 0–1 confidence to every mapping and separates extraction from judgment. vince-guidance's `evidence` is a single free-text string per pillar with no confidence field and no anti-hallucination contract — a green-but-wrong scorecard entry (right status, wrong evidence) is not structurally caught the way the checklist's `→` is.

## 5. Gaps & concrete recommendations

1. **Add a behavioral trigger-eval, even minimal.** Port skill-creator's idea (`scripts/run_eval.py` / `improve_description.py`): generate ~10–20 should/should-not-trigger queries for the *target* and record a real activation rate into the spec's `metrics`. Today the auditor preaches activation precision it never measures.
2. **Add a confidence field per scorecard entry** (`0–1`, à la spec-to-code-compliance). Low-confidence pillars become explicit `blocking_unknowns` instead of silently-asserted scores — closing the "green-but-wrong evidence" hole the `→` contract already closes for the checklist.
3. **Enumerate a design anti-pattern catalog.** The `design` pillar (`rules/scorecard.md:29`) cites `prompted_architecture` but leans on the KB; inlining a short AP table (borrow trailofbits' AP-1…AP-20 IDs) would make `design` gaps as concrete as the adversarial checklist already is.
4. **Offer an optional interactive elicitation pre-pass for stubs.** When maturity is `stub` *and* a human is present, allow a bounded interview-me-style pass (3–5 questions, confidence-gated) before emitting the spec; keep the autonomous path as default for pipeline runs. This imports the one capability the addyosmani Define-phase skills clearly beat it on.
5. **Schema-validate in CI, not just parse.** `rules/spec-format.md:67-69` only `JSON.parse`s the emitted spec; `evals/run_all.mjs` checks the schema's shape but never validates an *emitted spec* against it. Add an ajv (or equivalent) assertion so a real handoff is proven schema-conformant before Stage 2 consumes it.

## 6. Verdict

For the niche it actually occupies — **autonomous, schema-emitting skill auditing inside a pipeline** — `vince-skill-guidance` is industrial-grade and arguably best-in-class: nobody else ships a typed, schema-enforced handoff with a verdict formula, altitude model, and an expected-output-per-hazard adversarial contract. Its one structural shortfall vs the very best (anthropics skill-creator) is that it scores skills *statically* and never *runs* them — adding a thin behavioral trigger-eval and per-pillar confidence would close the gap to definitively best-in-class.
