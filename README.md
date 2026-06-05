# Industrial-Grade Agent Skills

![Industrial-Grade Agent Skills](assets/cover.png)

> Agent skills for Claude Code that ship with contracts, validators, and eval suites — and get broken by an independent judge before release, not just self-reported green.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · **English** · [简体中文](README.zh.md)

Most agent skills are a prompt and a hope. These are built like software: each one has a deterministic
validator, a red-green eval loop, and an independent fresh-agent battery that *tries to break it*. Small,
sharply-scoped, bilingual (EN / 中文; several Chinese-first). Adapt them, make them your own.

## Quickstart

```bash
cp -R skills/fact-check ~/.claude/skills/    # one skill (or skills/* for all)
```

Then just ask — Claude Code auto-triggers from your request — or call `/<skill-name>` explicitly:

```
> is it true that the Eiffel Tower gets taller in summer?     # → fact-check
```

Project-scoped? Copy into `<your-repo>/.claude/skills/` instead.

## Why these are different

Five principles, learned the hard way building every skill here.

### 1. Proof, not vibes
A skill you can't verify is a skill you can't trust. Each one ships a **deterministic validator**
(`check_review.py`, `check_answer.mjs`, `fact_lint.mjs`, …) and an eval suite, built test-first.
Benchmarked against 8 of the top public skill repos, this collection leads on machine-readable contracts and
deterministic proof.

### 2. The closed loop lies
A skill's own tests go green while it's still wrong — *green-but-wrong by default*. So every skill faces an
**independent fresh-agent battery, blind to its build rules**. It caught real bugs the self-tests missed in
*every* skill (5 in the humanizer, twice in company-background, four rounds in fact-check). The humanizer goes
further: success is scored by a blind judge, never by "count the patterns I deleted."

### 3. Accuracy over speed
Crude buckets and fixed enums mislabel every edge case — *"分三派还不如不分."* Skills classify from **rich
per-item descriptors + judgment at runtime**, not a hard taxonomy. The single deliberate exception is
`fact-check` (speed-first by design) — and even it is never confident-and-wrong.

### 4. Sharp scope, no creep
"More features = better" is a trap; extra machinery is friction, not value. Each skill does **one job well**.
course-study deliberately dropped quizzing, spaced-repetition, and Anki export to stay a clean revision tool.
Thin `SKILL.md`, progressive disclosure, low always-loaded cost.

### 5. Every claim has a receipt
Models fabricate to fill gaps. Here, source-traceability is **machine-checked** (backing JSON maps every
`claim` to its `evidence`), "consensus" is never dressed up as "measurement," thin inputs **degrade honestly**
(资料不足) instead of inventing, and the build **never fakes a pass** — it stops at an honest "candidate"
rather than claiming "industrial."

## Built by a pipeline, not by hand

Most skill collections are hand-written. **Every skill here is produced by a four-stage pipeline — and the
repo ships that pipeline too.** This is the part I'm proudest of.

![The skill-building pipeline: idea → ① guidance → ② engineer → ③ zipper, wrapped by ④ conductor's re-audit loop, out to a certified shipped skill](assets/pipeline.png)

Each arrow is a **machine-readable contract** — one stage's typed artifact is the next stage's input. That
buys four things a hand-written `SKILL.md` can't:

- **Proof at every stage** — deterministic evals, lossless-diff + token-delta, and a `trigger_eval` that
  *runs* the skill against a baseline, not "looks good to me."
- **No self-graded inflation** — the conductor accepts on `min(re-audit, independent-battery)`, loops back to
  the gap-owning stage, and **stops honestly** (`stopped_unmet`) when it can't clear the bar instead of faking a pass.
- **Ahead of the field** — benchmarked against 8 of the top public skill repos, it leads on machine-readable
  contracts + deterministic proof; nothing else there emits a program-consumable handoff spec.
- **Self-building, self-validating** — that same pipeline built every skill in this repo, on top of a
  self-checked KB, [`develop-principle/`](develop-principle/).

Run the whole loop with **[skill-conductor](skills/skill-conductor/)**, or drive any stage yourself.

## Reference

Each skill: **what it does** + **why it's good**.

### Product skills

- **[album-review](skills/album-review/)** — One 10,000–15,000-字 Chinese 乐评 from a primary credit + album name, across every musical dimension. *Edge:* deterministic 字-count + genre-adaptive validator; every fact traced to a source; classical separates work from performance with reference-recording comparison; obscure albums degrade honestly, never fabricated.
- **[hifi-review](skills/hifi-review/)** — Objective HiFi gear evaluation in two tracks: transducers (量感 + 风格 from FR-vs-target) and source gear (measured competence + system matching). *Edge:* rig-aware FR analysis (711 ≠ 5128) with a peak/dip pass; a "consensus ≠ measurement" no-inflation gate; a media roster judged dynamically, not bucketed.
- **[course-study](skills/course-study/)** — Course materials (slides, a topic list, or a course name) → complete-coverage, Feynman-explained, exam-ready notes. *Edge:* completeness is enforced (coverage checklist → reconciliation); every concept gets a Feynman block (capsule → intuition → formal → worked example → misconception); deliberately lean.
- **[fact-check](skills/fact-check/)** — A fast, citation-backed answer to a factual question: triage → parallel search → early-exit → BLUF within ≤2 min (simple) / ≤5 min (complex). *Edge:* the one speed-first skill, but a "speed-safety" rule forbids guessed high-confidence answers; deterministic answer-contract validator.
- **[humanizer-academic](skills/humanizer-academic/)** — Rewrites academic prose (EN / ZH / mixed) to strip AI-writing signals while keeping scholarly register. *Edge:* removes signal on three layers (lexical + structural + statistical burstiness), not a word denylist; adds defined texture (stance, specificity, variance — never casual, never invented); detect-only instrument + independent blind judge.
- **[low-visibility-fix](skills/low-visibility-fix/)** — Audits field mobile UI (low light, glare, gloves) and hands back an implementer-ready fix-plan doc set; never edits the target. *Edge:* deterministic analyzer + bounded visual pass; scopeable to a single page for cheap re-runs; clean audit-vs-apply separation.
- **[mp-cli-sup](skills/mp-cli-sup/)** — Debugs a *live* WeChat Mini Program through the `vince-mp` CLI. *Edge:* one persistent session → instant reused-connection commands with stable element uids; camera-less scan; a real `doctor` (tsc + .js freshness); client↔backend error correlation by requestId.

### The skill-building pipeline

Skills that build skills — run the conductor for the whole loop, or any stage alone.

- **[skill-conductor](skills/skill-conductor/)** — Drives guidance → engineer → zipper end to end with quality-gate loops. *Edge:* anti-inflation final acceptance (`min(re-audit, battery)`); loops back to the gap-owning stage; never fakes a pass.
- **[skill-guidance](skills/skill-guidance/)** — Audits a skill/repo (scores, scopes, finds gaps) and emits a schema-validated handoff spec. *Edge:* a 7-pillar readiness scorecard grounded in the `develop-principle` KB; a machine-consumable contract.
- **[skill-engineer](skills/skill-engineer/)** — Builds and tests a skill from that spec, red-green-refactor. *Edge:* deterministic-script eval + mutation spot-checks + a `trigger_eval` that runs the skill via `claude -p` to measure real trigger-rate.
- **[skill-zipper](skills/skill-zipper/)** — Restructures an existing skill for token efficiency, reliability, and trigger accuracy. *Edge:* lossless-diff + token-delta proof; a "describe WHEN, not the workflow" rubric; refuses to churn an already-clean skill.

Methodology substrate: **[`develop-principle/`](develop-principle/)** — an agent-first KB for building industrial skills.

## Layout

```
skills/             # install-ready skills (one folder each, with its own README)
develop-principle/  # agent-first KB powering the pipeline
tools/vince-mp-cli/ # Node CLI that mp-cli-sup drives
experiments/        # research / A-B material, not install-ready
docs/               # internal design notes & skill analysis
```

## Acknowledgments

Methodology draws on the wider Agent Skills ecosystem — Anthropic's
[skills](https://github.com/anthropics/skills) (spec + `skill-creator`) and obra's
[superpowers](https://github.com/obra/superpowers).

## License

[MIT](LICENSE) © 2026 Vince Jiang. Use, adapt, and redistribute freely.
