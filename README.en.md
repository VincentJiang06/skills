# Industrial-Grade Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · **English** · [简体中文](README.md)

> Agent skills for Claude Code, Codex, and other agent runtimes — each ships a deterministic validator + a red-green eval + an independent fresh-agent battery that *tries to break it*. Small, sharply-scoped, bilingual (EN / 中文), almost all built by the repo's own pipeline + loop engine. **For any skill's details, read its own folder's README.**

## Skills at a glance

**Product**
- **[album-review](skills/album-review/)** — artist + album → one 10,000–15,000-字 source-traced Chinese 乐评 across every musical dimension.
- **[hifi-review](skills/hifi-review/)** — objective HiFi-gear evaluation: signature from FR-vs-target, competence from measurements, every claim traced to evidence.
- **[course-study](skills/course-study/)** — course materials → complete-coverage, Feynman-explained, exam-ready notes.
- **[fact-check](skills/fact-check/)** — a fast, citation-backed BLUF answer to a factual question (≤2 / ≤5 min).
- **[humanizer-academic](skills/humanizer-academic/)** — rewrites AI-generated serious prose (EN / ZH / mixed) in two modes (academic / popsci); abstain-first, strips AI signals while keeping each genre's register.
- **[mp-cli-sup](skills/mp-cli-sup/)** — debugs a *live* WeChat Mini Program via the `vince-mp` CLI: one persistent session, stable uids, camera-less scan.
- **[mp-groundline](skills/mp-groundline/)** — WeChat Mini Program Skyline→WebView migration, consistency-first, with a read-only scanner + migration map.

**Coding discipline — auto-triggered as you build**
- **[test-driven-development](skills/test-driven-development/)** — TDD for *non-trivial* behavior: a failing test first, the suite kept as a *living spec* of the current target.

**Loop & adversary — turn a medium/large task into a runnable engineering loop**
- **[loop-constructor](skills/loop-constructor/)** — designs the engineered *loop* for a medium/large task: decomposed into gated sub-loops, persisted as a runnable `.loop/` runbook.
- **[loop-constructor-codex](skills/loop-constructor-codex/)** — the Codex CLI variant of loop-constructor: the same loop-engineering model realized as single-agent `codex exec` runs, on-disk state, and a fresh evaluator.
- **[model-pyramid](skills/model-pyramid/)** — right-sizes model tier + reasoning effort before subagent fan-out: peers keep both, search drops effort, large cheap lookup swarms drop one model tier, and the medium floor always holds.
- **[attacker](skills/attacker/)** — attacks a product's *actual observable behavior* (or red-teams an idea): a fresh, TDD-independent subagent records only proven, reproducible breakages; pairs with loop-constructor (attack→fix→re-attack).
- **[reorganize-logic](skills/reorganize-logic/)** — rebuilds the design-contract layer (architecture + structure + interfaces) with the code as the single source of truth, behind a review gate.

**The skill-building pipeline — skills that build skills (v2)**

A four-stage pipeline whose **gates are executable scripts**: the script a stage
self-gates with is the *same* script the conductor re-runs to gate it — builder
and gatekeeper share one ruler, zero room to copy a command wrong.
- **[skill-conductor](skills/skill-conductor/)** — drives guidance → engineer → zipper end to end; gates by running the stage scripts, anti-inflation final acceptance on `min(re-audit, independent battery)`, prefix-tolerant sibling resolution (repo + installed names).
- **[skill-guidance](skills/skill-guidance/)** — audits a skill/repo, emits the handoff spec, and self-gates with `validate_spec.mjs` (7 pillars, score↔status, verdict vs cap, gap→action); three dispositions (plan-interactive / plan-pipeline / audit), audit writes `post-build-audit.json` without clobbering the build spec.
- **[skill-engineer](skills/skill-engineer/)** — builds + tests red-green-refactor, self-gates with `validate_report.mjs` (P0 / adversarial-checklist joins, harness **re-run on the spot**, red-log check); trigger_eval with 3-vote majority + held-out anti-overfitting; behavioral RED = baseline-without-skill; pre-ship security lint.
- **[skill-zipper](skills/skill-zipper/)** — restructures losslessly for token efficiency, reliability, and trigger accuracy, with a portability checklist (open-standard 6-field core vs Claude-Code-only fields) and description guidance aligned to mid-2026.

> To keep Opus continuously syncing the principle KB + this pipeline to the latest ecosystem, see [`skills/skill-guidance/skill-principle/UPDATE.md`](skills/skill-guidance/skill-principle/UPDATE.md) (a Fact Registry of load-bearing numbers + a quality bar). The previous v1 is frozen in [`archive/`](archive/).

## What this generation adds

This is not a pile of prompt templates. It is a skill system with teeth:

- **The build pipeline is now v2.** guidance / engineer / conductor / zipper share executable gates; specs, build reports, trigger evals, held-out cases, and red logs can be re-run instead of trusted by narration.
- **Loop engineering is split into runtime-neutral and Codex-realized layers.** `loop-constructor` designs the general loop; `loop-constructor-codex` maps role separation, disk state, and fan-out onto `codex exec`.
- **Independence is first-class.** `attacker`, `reorganize-logic`, and `test-driven-development` were all reworked around the rule that the same mental model should not both produce and grade the answer.
- **Model/effort sizing is explicit.** `model-pyramid` is not model shopping and not cost rhetoric; at subagent fan-out time it emits an auditable `rule=<id> tier=<tier> effort=<notch>` line.
- **The KBs travel with the skills.** `skill-principle` and `loop-principle` are embedded under their owning skills instead of requiring a sibling copy ritual.

## Install

Use **[skills.sh](https://github.com/vercel-labs/skills)** (the `skills` CLI) — it auto-discovers every skill in the repo and installs into `~/.claude/skills/` (or `.agents/skills/` for project scope):

```bash
npx skills add VincentJiang06/skills      # interactively pick which skills to install
```

Manual alternative: `cp -R skills/<name> ~/.claude/skills/`. Public repo skill names are prefix-free; if you maintain private local mirrors, installing as `~/.claude/skills/vince-<name>` or `~/.agents/skills/vince-<name>` is fine, but keep the installed `SKILL.md` `name` and explicit invocation strings in sync.

**Dependencies & "installing everything":**
- **Runtime**: `node` (≥18) for the `.mjs` validators, `python3` for the `.py` scripts. **Both use only the standard library — no `npm install` / `pip install` needed.**
- **The two principle KBs now install with their corresponding skills.** `loop-principle/` is embedded at [`skills/loop-constructor/loop-principle/`](skills/loop-constructor/loop-principle/); `skill-principle/` is embedded at [`skills/skill-guidance/skill-principle/`](skills/skill-guidance/skill-principle/). Selecting `loop-constructor` or `skill-guidance` installs the matching KB as part of that skill folder.
- **For the full pipeline**, `skill-engineer` and `skill-conductor` reuse `skill-guidance/skill-principle/`, so install `skill-guidance` alongside them. You no longer need to copy the KBs as siblings of the agent home's `skills/` directory.
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

**⑤ Size a subagent fan-out** — `model-pyramid` only sizes; it does not spawn.
```
> I am about to launch 24 search subagents and 2 peer reviewers; use model-pyramid to assign tier/effort for each worker.
```

**⑥ Rebuild design contracts** — `reorganize-logic` rebuilds architecture, structure, and interface docs from code when they have rotted past incremental sync.

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
skills/                                      # install-ready skills (one folder each, with its own README)
skills/skill-guidance/skill-principle/       # embedded skill principle KB, installed with skill-guidance (incl. UPDATE.md refresh runbook)
skills/loop-constructor/loop-principle/      # embedded loop-engineering KB, installed with loop-constructor
tools/vince-mp-cli/                          # Node CLI that mp-cli-sup drives
tools/deploy_pipeline_skills.mjs             # deploy pipeline or all skills to local installs (vince- prefix, byte-verified)
.loop/                                       # runnable runbooks produced by loop-constructor
eval_exchange/                               # local builder / evaluator handoff protocol and sample session
archive/                                     # frozen previous versions (e.g. pipeline v1); not installable, not maintained
```

## Design philosophy (why these are different)

A few principles, hardened by building these skills one at a time and then polishing them with loops.

1. **Proof, not vibes.** A skill you can't verify is one you can't trust. Each ships a deterministic validator + an eval, built test-first. Loop engineering ≈ verification engineering: **define the check that proves it's done, then design backward from it.** The pipeline goes further — **its gates are executable scripts, not prose**: a stage's self-check and the conductor's gate run the *same* script, so a rule changes in one place and both stay in sync (in v1 a shipped example spec violated its own rule for weeks — the fate of prose-only gates).
2. **The closed loop lies.** A skill's own tests go green while it's still wrong — green-but-wrong by default. So each faces an **independent fresh-agent battery** (`attacker`), blind to its build rules, attacking on a held-out set. It caught real bugs the self-tests missed in *every* skill. Success is scored by an independent judge, never by "count the patterns I deleted."
3. **Accuracy over speed.** Crude buckets mislabel every edge case. Classify from **rich per-item descriptors + judgment at runtime**, not a hard enum. The one deliberate exception is `fact-check` (speed-first) — and even it is never confident-and-wrong.
4. **Sharp scope, no creep.** "More features = better" is a trap. Each skill does **one job well**: thin `SKILL.md`, progressive disclosure, low always-loaded cost.
5. **Every claim has a receipt.** Source-traceability is machine-checked; thin inputs **degrade honestly** instead of fabricating; the build **never fakes a pass**.
6. **Self-building, self-validating.** Almost every skill here was produced by the repo's own pipeline (`skill-conductor`) + loop engine (`loop-constructor`), grounded in two self-checked KBs — and the repo ships that pipeline too.

## Known limitations (honest)

Engineering honesty means writing down what isn't closed — the natural extension of "the closed loop lies":

- **Verification is asymptotic, not a proof.** The independent battery can still surface a green-but-wrong each round; we stop after closing every *proven* hole, not at perfection (e.g. humanizer v3.1's held-out attack "2/2 clean" = no proven break within budget, ≠ proven correct).
- **The two KBs are larger than ordinary skill support files, but now install with their corresponding skills** (see [Install](#install)). This is deliberate: a slightly larger install gives users full retrieval, templates, checklists, and self-checks immediately.
- **The conductor's "attacker only after a passing re-audit" gate is convention- + invariant-checked, not yet runtime-interlocked.** It holds via the rule prose + the `min(re-audit, battery)` invariant; not yet a hard machine gate (a noted follow-up).
- **Guidance's context-sufficiency detector is a seed, not an oracle.** The keyword detector that triggers elicitation can be fooled both ways; by design the agent's judgment of *substance* is the oracle, but it isn't deterministically closed.
- **loop-constructor's D6 cadence (completeness-first / iteration-first) is guidance, not linter-enforced.** A design can claim one cadence while carrying the opposite knobs — the linter can't catch it; the fresh-reader cadence box + the maker/checker are the gate.
- **For performance/quality upgrades, final acceptance may be a stronger held-out attack instead of a full conductor re-audit** (as in humanizer v3.1) — a deliberate engineering trade-off, recorded honestly rather than cut silently.
- **Trigger precision depends on a real runtime being available.** When an authenticated CLI is unavailable, some trigger evals use a live judge panel and say so in the report; that is usable evidence, not a disguised canonical CLI result.

## Changelog

Daily summaries from git history, limited to structural changes in the skill system.

- **2026-07-06** — humanizer moved to v3.2 (contrast-frame quota, citation-shell rework, frame-first hardening); both principle KBs received a FABLE synthesis pass; `loop-constructor-codex` landed; `model-pyramid` added testable subagent model/effort sizing; the session-end sync skill was removed from public distribution.
- **2026-07-02** — the skill-building pipeline became v2: executable G/E gates, audit disposition, held-out trigger eval, portable zipper; v1 pipeline archived; local `eval_exchange` protocol added; `attacker` / `loop-constructor` / `reorganize-logic` / `test-driven-development` received the independence-family update.
- **2026-06-25** — `skill-principle` and `loop-principle` were embedded under their owning skills so installs carry the KBs with them.
- **2026-06-24** — `.clawhubignore` and version metadata were synced for ClawHub/SkillHub publishing.
- **2026-06-23** — repo-wide zipper pass: shorter always-loaded SKILL.md files, details moved into `rules/` / `references/`; humanizer v3.1 performance uplift completed; attacker entered 0.3.x; loop-constructor added D6 cadence; README rewritten as the current user-facing entry.
- **2026-06-22** — `mp-cli-sup` survived 8 adversarial hardening rounds and closed at 0.2.0; `attacker` landed and made independent breakage-finding a standard acceptance layer.
- **2026-06-21** — `loop-constructor` shifted to SELECT→FILL→VERIFY; `test-driven-development` gained anti-gaming gates; humanizer split into academic / popsci modes with abstain-first behavior.
- **2026-06-20** — README became Chinese-first; major skills gained bilingual READMEs; public repo skill names dropped the `vince-` prefix.
- **2026-06-18** — staged `loop-constructor` and `reorganize-logic` landed; `vince-mp` CLI gained camera-less scan; README gained the one-line skill index.
- **2026-06-15** — `loop-principle` KB + `loop-constructor` landed.
- **2026-06-11** — `test-driven-development` was redesigned around trigger boundaries, modify mode, and subagent delegation; KB source density improved.
- **2026-06-05** — repo was reorganized for public release; `skills.sh` install path added; `mp-groundline` landed; `vince-mp` moved into persistent-session + doctor/scan/logs workflow.

## Acknowledgments

Methodology draws on the wider Agent Skills ecosystem — Anthropic's [skills](https://github.com/anthropics/skills) (spec + `skill-creator`) and obra's [superpowers](https://github.com/obra/superpowers); install is based on vercel-labs' [skills.sh](https://github.com/vercel-labs/skills).

## License

[MIT](LICENSE) © 2026 Vince Jiang. Use, adapt, and redistribute freely.
