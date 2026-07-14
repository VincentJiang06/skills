# attacker

> Attack any target with a **fresh, independent** attacker through five philosophy-derived lenses — record only proven, reproducible breakages, never fix, never edit the target.

**English** · [简体中文](README.md)

**What it does** — Given any target (a skill, a design, an argument, a codebase, a whole KB), dispatch a fresh attacker with zero build history through a **fixed rotation of five lenses**. Every successful attack (located, reproducible, `observed != expected`) becomes a machine-checkable **finding**; every unproven suspicion becomes a separate **flag**. The deliverable is a handoff document; it **never modifies the target**. Pairs with [loop-constructor](../loop-constructor/) into an attack→fix→re-attack loop.

**What changed in 0.5.0 (vs the old attacker)** — The old attacker was a heavy rig grown around WeChat-miniprogram / product debugging, with `rules/`, `agents/`, and multiple scripts. This is a ground-up **rewrite re-derived from the design philosophy**: the mechanism is made deliberately trivial (fork a fresh mind → hand it one lens → keep only what it can prove). The power is not in the mechanism — it is in **what the fresh mind is handed**. The whole apparatus is ~1/4 the weight of the old one.

**Why it's good** —

- **Five lenses = a minimal spanning set.** Each maps to a philosophy pillar and covers one orthogonal class of failure:
  | Lens | Asks | Pillar |
  |---|---|---|
  | **Coherence** | Does the target contradict itself? (cross-arithmetic, tension arbitration, definition drift) | P0 consistency |
  | **Gaming** | Can a lazy/cheating actor satisfy it literally while defeating its spirit? | A31 / T12 anti-gaming |
  | **Evidence** ⚡ | Are the claims true, current, honestly sourced? (carries web search) | P4 / P5 |
  | **Reality** | Does it break on contact with a real target / real implementation? | P6 deploy-is-knowing |
  | **Foundation** | Is the core premise right, and will it rot? (attack the axioms + the evolution mechanism) | axioms / A41 |
  A sixth lens is forbidden unless it cannot fold into these five (anti-bloat, A41 reflexive).

- **Engineered independence (the entire value).** The defect this targets is the **false-positive result** — a green test suite sitting on a broken thing, because the check and the checked came from the *same mental model* (correlated error). The only cure is to run the attacker from a context that **never saw the build** — and at high stakes, from a *different model*. This version promotes "use a different-vendor model as the attacker" to a first-class path: same-family self-attack is `instance`-tier only, and model-level blind spots are systematically invisible to it.

- **PROVE-OR-FLAG + SEED, a gate in both directions.** PROVE-OR-FLAG stops false positives: a finding needs `reproduction={steps,expected,observed}` that an **independent, non-author rerunner** can execute; otherwise it is a flag, never dressed up. SEED stops false negatives: plant a known seed defect each round — a run that misses its seed is **void**, excluded from the stop condition — so a blind attacker producing zero findings is not misread as "target clean."

- **Philosophy aims, a script extracts.** When the target is a philosophy-grounded KB, its rules carry lint-enforced shadow-principle / falsifiable-question fields — a pre-drawn attack map. The map is extracted by a **deterministic script** (`scripts/extract_shadow_map.py`), **never by an LLM** (an LLM extractor would re-open the map-tampering surface). But **the map is a floor, not a ceiling**: ≥30% of each lens's budget must attack off-map, and "the shadow-principle is itself boilerplate that dodges the real risk" is its own finding class.

- **Honest stopping and a coverage confession.** The stop condition is a **pre-registered budget / marginal** gate (E9), never "N clean rounds" (the battery is asymptotic). The output's `coverage_gaps` states plainly which lenses were not run, which independence tier was reached, and whether `battery_grade` was only `smoke-only`.

**When to use** — "attack this / try to break it" · "red-team this idea/design/plan" · "find what the tests miss" · "audit this philosophy/KB against itself." Invoke explicitly with `$attacker`, or use it as the "attack round" node in a loop-constructor loop.

**When NOT to use** — Writing/maintaining a project's own unit tests, "write a failing test first" → **test-driven-development** (attacker *distrusts* that suite; it attacks the running thing); fixing the bugs it finds → a separate repair round (attacker only records, never edits); designing the whole loop → **loop-constructor** (attacker is just one node).

**Model-agnostic (design constraint zero, non-negotiable)** — Lens prompts and the rubric are Markdown + separators, no XML-semantic tags (all major CN vendors push Markdown, and every model parses it); any tool schema uses the **six-vendor intersection** (object root, all `required`, no `minLength`/`minItems`, English snake_case); designed for a 128K-safe window (nominal windows overstate — use ~half), prompts are rubric/checklist-shaped (weak instruction-followers need explicit criteria), and reasoning-line models keep their `<think>` (never compressed).

**What ships** — 1 `SKILL.md` + 5 lens prompts (`lenses/`) + 1 rubric with ≥12 golden samples (`references/prove-or-flag.md`) + 1 seed-recipe note (`references/seed-recipes.md`) + 1 extractor (`scripts/extract_shadow_map.py`, Python stdlib) + 1 output schema (`schemas/output.json`). No `rules/`, no per-target scaffolding.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/attacker ~/.claude/skills/vince-attacker`). Findings / flags / ledger live under the **target project**'s `.loop/` (project-local).

**Honest coverage note** — Every round that shaped this version was `instance`-tier (one Fable family attacking its own KB). Per T11 the model-level blind spot is systematically invisible to all of them — so "converged" here means "converged against same-family attack," not "validated across models." This skill's pre-registered acceptance test is therefore: **run it once with a different-vendor attacker** (GPT / Gemini / DeepSeek / Kimi) against a real target, using the SEED hit-rate as a capability probe. Until that run exists, this skill is proven to *find things*, not proven to be *model-portable in the field*.

Full mechanism in [SKILL.md](SKILL.md).
