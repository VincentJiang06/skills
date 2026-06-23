# Industrial-Grade Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · **English** · [简体中文](README.md)

> Agent skills for Claude Code — each ships a deterministic validator + a red-green eval + an independent fresh-agent battery that *tries to break it*. Small, sharply-scoped, bilingual (EN / 中文), almost all built by the repo's own pipeline + loop engine. **For any skill's details, read its own folder's README.**

## Skills at a glance

**Product**
- **[album-review](skills/album-review/)** — artist + album → one 10,000–15,000-字 source-traced Chinese 乐评 across every musical dimension.
- **[hifi-review](skills/hifi-review/)** — objective HiFi-gear evaluation: signature from FR-vs-target, competence from measurements, every claim traced to evidence.
- **[course-study](skills/course-study/)** — course materials → complete-coverage, Feynman-explained, exam-ready notes.
- **[fact-check](skills/fact-check/)** — a fast, citation-backed BLUF answer to a factual question (≤2 / ≤5 min).
- **[humanizer-academic](skills/humanizer-academic/)** — rewrites AI-generated serious prose (EN / ZH / mixed) in two modes (academic / popsci); abstain-first, strips AI signals while keeping each genre's register.- **[mp-cli-sup](skills/mp-cli-sup/)** — debugs a *live* WeChat Mini Program via the `vince-mp` CLI: one persistent session, stable uids, camera-less scan.
- **[mp-groundline](skills/mp-groundline/)** — WeChat Mini Program Skyline→WebView migration, consistency-first, with a read-only scanner + migration map.

**Coding discipline — auto-triggered as you build**
- **[test-driven-development](skills/test-driven-development/)** — TDD for *non-trivial* behavior: a failing test first, the suite kept as a *living spec* of the current target.
- **[neat](skills/neat/)** — end-of-session reconciliation of docs + cross-session memory against the code, so knowledge doesn't rot.

**Loop & adversary — turn a medium/large task into a runnable engineering loop**
- **[loop-constructor](skills/loop-constructor/)** — designs the engineered *loop* for a medium/large task: decomposed into gated sub-loops, persisted as a runnable `.loop/` runbook.
- **[attacker](skills/attacker/)** — attacks a product's *actual observable behavior* (or red-teams an idea): a fresh, TDD-independent subagent records only proven, reproducible breakages; pairs with loop-constructor (attack→fix→re-attack).
- **[reorganize-logic](skills/reorganize-logic/)** — rebuilds the design-contract layer (architecture + structure + interfaces) with the code as the single source of truth, behind a review gate.

**The skill-building pipeline — skills that build skills**
- **[skill-conductor](skills/skill-conductor/)** — drives guidance → engineer → zipper end to end with anti-inflation final acceptance.
- **[skill-guidance](skills/skill-guidance/)** — audits a skill/repo and emits a schema-validated handoff spec.
- **[skill-engineer](skills/skill-engineer/)** — builds and tests a skill from that spec, red-green-refactor, with an independent battery.
- **[skill-zipper](skills/skill-zipper/)** — restructures an existing skill for token efficiency, reliability, and trigger accuracy — losslessly.

## Install

Use **[skills.sh](https://github.com/vercel-labs/skills)** (the `skills` CLI) — it auto-discovers every skill in the repo and installs into `~/.claude/skills/` (or `.agents/skills/` for project scope):

```bash
npx skills add VincentJiang06/skills      # interactively pick which skills to install
```

Manual alternative: `cp -R skills/<name> ~/.claude/skills/`.

**Dependencies & "installing everything":**
- **Runtime**: `node` (≥18) for the `.mjs` validators, `python3` for the `.py` scripts. **Both use only the standard library — no `npm install` / `pip install` needed.**
- **The two KBs are NOT installed by `npx skills`.** `loop-constructor` and `skill-guidance/engineer/conductor` reference [`loop-principle/`](loop-principle/) and [`develop-principle/`](develop-principle/) (via the relative path `../../`). The `skills` CLI only installs entries under `skills/`, **not these two sibling KBs**. For full function, also copy them to your install root (e.g. `~/.claude/loop-principle`, `~/.claude/develop-principle`) or set `$LOOP_PRINCIPLE`; without them the skills **degrade gracefully** to the node ids cited in `references/`.
- **`mp-cli-sup`** also needs [`tools/vince-mp-cli/`](tools/vince-mp-cli/) (a Node CLI).
- To get everything at once (skills + both KBs + CLI), just `git clone` the whole repo.

Then ask in natural language (Claude Code auto-triggers from the description) or call `/<skill-name>` explicitly:

```
> is it true that the Eiffel Tower gets taller in summer?     # → fact-check
```

## How to use: a few examples

These skills are designed to compose. Here are the common paths + a one-line demo prompt each.

**① Build a new skill (end to end)** — use `skill-conductor`; it drives guidance (audit + scope) → engineer (red-green build) → zipper (compress) → final acceptance (wiring in `attacker` against inflation).
```
> Use skill-conductor to turn this idea into an industrial skill: a skill that converts meeting notes into an action-item list, traceable to the source.
```

**② Design a loop for a medium/large task** — use `loop-constructor` to decompose into gated sub-loops, persist a `.loop/` runbook, then run it.
```
> /loop-constructor design a staged loop for "migrate this 500-file repo from Flow to TypeScript", emphasis: each step reversible and verifiable.
```

**③ Improve an existing skill's performance (loop + attacker)** — design a perf-uplift loop (baseline → diagnose → improve → held-out attack → ship), conductor-driven, with `attacker` validating on a held-out set that it genuinely improved without overfitting or regressing. (This repo's humanizer v3.1 was upgraded exactly this way: whole-document completeness 4.0→4.83, held-out attack 2/2 clean.)
```
> /loop-constructor design a loop to improve <skill>'s performance with attacker as a held-out adversarial gate; then run it to convergence.
```

**④ Adversarial validation / red-team** — use `attacker` against any product's observable behavior, or to red-team a plan.
```
> Use attacker on <skill/feature>'s observable behavior, scope = input parsing + edges; record only proven reproducible breakages.
```

**⑤ End-of-session / keep knowledge fresh** — `neat` reconciles docs + memory against the code; `reorganize-logic` rebuilds from scratch when docs have rotted past incremental sync.

## Practical tips (when developing skills)

Hard-won, reusable on your next skill:

- **Decide "what check proves it's done?" before designing.** Loop engineering ≈ verification engineering — no runnable check means it isn't a loop. Let `loop-constructor`'s linter reject hollow designs.
- **Let the conductor drive; don't hand-roll the pipeline.** guidance scopes, engineer builds red-green, zipper compresses, final acceptance gates on `min(re-audit, independent battery)` — far more reliable than "looks good to me."
- **Treat `attacker` as the enforcement arm of "the closed loop lies."** A skill's own tests are green-but-wrong by default; have a fresh agent (blind to the build rules) attack on a **held-out** set (not the training corpus) to prove it generalizes.
- **Freeze the ruler before you improve.** To lift a metric, first harden the eval (corpus + rubric) until it discriminates good from bad — then touch the skill. Don't change the ruler and the measured thing together. Capture a baseline first.
- **Beware a saturated metric.** If the baseline is already near-perfect, your cases are too easy / the judge too lenient — add harder cases (long-form, edges, mixed-language) + a stricter judge to reveal real headroom.
- **When a metric is structurally capped, re-target to what you actually care about — transparently, never by relaxing the gate.** Aim the gate at the real goal (e.g. "whole-document completeness" rather than a mean dragged down by short samples), and document why.
- **Make new features FP-safe.** When a step gets more aggressive (e.g. more eager to "add"), gate it **behind an existing conservative gate** (like humanizer's "abstain-first if it reads human"), so the change only fires when it should — then prove out-of-sample safety with a held-out attack.
- **Stop honestly.** Verification is asymptotic, not a proof. Stop after closing every *proven* hole; mark `candidate` / `stopped_unmet` truthfully rather than claiming `industrial`.
- **Write the description as "when to use / when not," not a workflow; keep it under 1024 chars.** Trigger accuracy comes from discriminating (vs neighboring skills / counter-examples), not from piling on words.

## Layout

```
skills/             # install-ready skills (one folder each, with its own README — details live there)
develop-principle/  # agent-first KB powering the pipeline (substrate for skill-guidance/engineer/conductor)
loop-principle/     # agent-first KB on loop engineering (substrate for loop-constructor)
tools/vince-mp-cli/ # Node CLI that mp-cli-sup drives
.loop/              # runnable runbooks produced by loop-constructor (one per task + attack/battery records)
```

## Design philosophy (why these are different)

A few principles, hardened by building these skills one at a time and then polishing them with loops.

1. **Proof, not vibes.** A skill you can't verify is one you can't trust. Each ships a deterministic validator + an eval, built test-first. Loop engineering ≈ verification engineering: **define the check that proves it's done, then design backward from it.**
2. **The closed loop lies.** A skill's own tests go green while it's still wrong — green-but-wrong by default. So each faces an **independent fresh-agent battery** (`attacker`), blind to its build rules, attacking on a held-out set. It caught real bugs the self-tests missed in *every* skill. Success is scored by an independent judge, never by "count the patterns I deleted."
3. **Accuracy over speed.** Crude buckets mislabel every edge case. Classify from **rich per-item descriptors + judgment at runtime**, not a hard enum. The one deliberate exception is `fact-check` (speed-first) — and even it is never confident-and-wrong.
4. **Sharp scope, no creep.** "More features = better" is a trap. Each skill does **one job well**: thin `SKILL.md`, progressive disclosure, low always-loaded cost.
5. **Every claim has a receipt.** Source-traceability is machine-checked; thin inputs **degrade honestly** instead of fabricating; the build **never fakes a pass**.
6. **Self-building, self-validating.** Almost every skill here was produced by the repo's own pipeline (`skill-conductor`) + loop engine (`loop-constructor`), grounded in two self-checked KBs — and the repo ships that pipeline too.

## Known limitations (honest)

Engineering honesty means writing down what isn't closed — the natural extension of "the closed loop lies":

- **Verification is asymptotic, not a proof.** The independent battery can still surface a green-but-wrong each round; we stop after closing every *proven* hole, not at perfection (e.g. humanizer v3.1's held-out attack "2/2 clean" = no proven break within budget, ≠ proven correct).
- **The two KBs are not installed by `npx skills`** (see [Install](#install)). The 4 KB-dependent skills degrade gracefully when the KB is absent, but full function needs them copied separately.
- **The conductor's "attacker only after a passing re-audit" gate is convention- + invariant-checked, not yet runtime-interlocked.** It holds via the rule prose + the `min(re-audit, battery)` invariant; not yet a hard machine gate (a noted follow-up).
- **Guidance's context-sufficiency detector is a seed, not an oracle.** The keyword detector that triggers elicitation can be fooled both ways; by design the agent's judgment of *substance* is the oracle, but it isn't deterministically closed.
- **loop-constructor's D6 cadence (completeness-first / iteration-first) is guidance, not linter-enforced.** A design can claim one cadence while carrying the opposite knobs — the linter can't catch it; the fresh-reader cadence box + the maker/checker are the gate.
- **For performance/quality upgrades, final acceptance may be a stronger held-out attack instead of a full conductor re-audit** (as in humanizer v3.1) — a deliberate engineering trade-off, recorded honestly rather than cut silently.

## Acknowledgments

Methodology draws on the wider Agent Skills ecosystem — Anthropic's [skills](https://github.com/anthropics/skills) (spec + `skill-creator`) and obra's [superpowers](https://github.com/obra/superpowers); install is based on vercel-labs' [skills.sh](https://github.com/vercel-labs/skills).

The `neat` skill is adapted from [@KKKKhazix](https://github.com/KKKKhazix)'s [neat-freak（洁癖）](https://github.com/KKKKhazix/khazix-skills#-neat-freak%E6%B4%81%E7%99%96) (MIT).

## License

[MIT](LICENSE) © 2026 Vince Jiang. Use, adapt, and redistribute freely.
