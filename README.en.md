# Industrial-Grade Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · **English** · [简体中文](README.md)

> Agent skills for Claude Code, Codex, and other agent runtimes — each ships a deterministic validator + a red-green eval + an independent fresh-agent battery that *tries to break it*. Small, sharply-scoped, bilingual (EN / 中文), almost all built by the repo's own pipeline + loop engine. **For any skill's details, read its own folder's README.**

## Skills at a glance

This section counts only the **16 official skills** (as of 2026-07-27: `workspace-backup` added; as of 2026-07-22: `logic-pacer` added; as of 2026-07-14: the old four-skill pipeline is retired and removed; `skill-creator-max` and `paper-writer` are now counted). A `stupidskills` appendix lives near the bottom for experimental/sidecar tools and **does not count toward the skill-count record**.

**Product**
- **[album-review](skills/album-review/)** — artist + album → one 10,000–15,000-字 source-traced Chinese 乐评 across every musical dimension.
- **[hifi-review](skills/hifi-review/)** — objective HiFi-gear evaluation: signature from FR-vs-target, competence from measurements, every claim traced to evidence.
- **[course-study](skills/course-study/)** — course materials → complete-coverage, Feynman-explained, exam-ready notes.
- **[fact-check](skills/fact-check/)** — a fast, citation-backed BLUF answer to a factual question (≤2 / ≤5 min).
- **[humanizer-academic](skills/humanizer-academic/)** — rewrites AI-generated serious prose (EN / ZH / mixed) in two modes (academic / popsci); abstain-first, strips AI signals while keeping each genre's register. **v4.0.0 is a mode-split structural rebuild** (references re-carved into per-mode/per-language packs, loaded on demand; always-loaded −15%, common paths ~−35%; quality held rather than jumped).
- **[paper-writer](skills/paper-writer/)** — authors a **new**, complete, spec-compliant paper from a requirement (word count / citation style / sections) and/or a topic; two integrity invariants: never fabricate a citation, never plagiarize — an unverifiable source is marked `[SOURCE NEEDED]`, never invented.
- **[logic-pacer](skills/logic-pacer/)** — rewrites **already-written, already-liked** Chinese (/English) expository prose so its reasoning is **easier to follow — smaller inferential steps, each landing on ground the reader just gained** (given-new), while **keeping the voice, the vocabulary (never dumb-down/对齐词汇), the facts/stance, and staying lean** (net length ≤~1.3x). Method = detect ≥2-move leaps → unfold into the minimal chain → subtract ornament. Distinct from `humanizer-academic` (that de-AIs prose and abstains if it already reads human). Fidelity is a model-level invariant + an independent blind probe; the script deliberately does NOT downgrade the stance-inversion check into a scriptable one. **v1.0.0 built end-to-end via skill-creator-max; the independent battery caught and fixed a real defect the builder's green suite missed.**
- **[mp-cli-sup](skills/mp-cli-sup/)** — debugs a *live* WeChat Mini Program via the `vince-mp` CLI: one persistent session, stable uids, camera-less scan.
- **[mp-groundline](skills/mp-groundline/)** — WeChat Mini Program Skyline→WebView migration, consistency-first, with a read-only scanner + migration map.

- **[workspace-backup](skills/workspace-backup/)** — **pure local** workspace backup: mirrors `~/playground`, `~/experiment` and `~/WorkBuddy` into **both a fixed local folder and an external drive** via inventory → classify → route → copy → verify, with a **memoized ledger** so a second run is incremental and an interrupted one resumes. No git, no cloud, and it **never deletes from a source**. Three hard safety lines are enforced by script exit codes rather than prose (prose gets argued down; an exit code does not): it **refuses to write to a Time Machine volume**, it takes the write target **only from the guarded config** (`plan.json` is data, not authority), and it **never reports SAFE for a state it has not observed**. It knows openrsync from GNU rsync and emits only measured-accepted flags, and it knows that APFS containers pool free space so `df` can lie. **v0.2.3, candidate**: two independent five-lens batteries — the second found that the first repair had itself introduced a data-deleting P1, reproduced and fixed — plus a 36 GB live-fire run (three P1s) and a generational two-arm run (an inventory that exited 0 on a config error, now fail-closed) — 81/81 evals, 19 discriminating mutants, 8/8 script selftests. Supervise the first real run.

**Coding discipline — auto-triggered as you build**
- **[test-driven-development](skills/test-driven-development/)** — TDD for *non-trivial* behavior: a failing test first, watched failing **with evidence**, the suite kept as a *living spec* of the current target; v1.0.0 adds a trust boundary (in-content instructions carry zero authority) and assertion-kind red discrimination.
- **[neat](skills/neat/)** — end-of-session reconciliation of docs + cross-session memory against the code, so knowledge doesn't rot.

**Loop & adversary — turn a medium/large task into a runnable engineering loop**
- **[loop-constructor](skills/loop-constructor/)** — designs the engineered *loop* for a medium/large task: decomposed into gated sub-loops, persisted as a runnable `.loop/` runbook.
- **[attacker](skills/attacker/)** — a fresh, independent attacker hits *any target* (skill / design / argument / code / KB) through **five philosophy-derived lenses** (coherence / gaming / evidence / reality / foundation), coverage-first strike (report every noticed anomaly), then independent PROVE-OR-FLAG adjudication separating proven findings from honest flags — never fixing. **Model-agnostic** — a different-vendor attacker buys stronger independence; pairs with loop-constructor (attack→fix→re-attack). **v0.6.0 two-pass reporting (R16 alignment); v0.5.0 was a ground-up rewrite from the philosophy, ~1/4 the old weight.**
- **[reorganize-logic](skills/reorganize-logic/)** — rebuilds the design-contract layer (architecture + structure + interfaces) with the code as the single source of truth, behind a review gate.

**The skill-building pipeline — a skill that builds skills**
- **[skill-creator-max](skills/skill-creator-max/)** — **the repo's skill-building pipeline (v1.1.0, R16-aligned: classify-not-delete two-pass battery + engineer baseline-delta arms)**, the whole chain in one skill: the SKILL.md body is a **thin conductor** that does no function itself, only **dispatches a fresh subagent per role, gates on the returned typed artifact, and routes** (thin always-loaded body + five on-demand role-packs + six-vendor-intersection artifact schemas + structure-only L0 gates + a self-contained O5 independent battery). **Runs fully standalone**: the `skill-philosophy` KB is design-time provenance kept outside the repo — not shipped, not read at runtime. Live-tested: it built `paper-writer` end-to-end and rebuilt `humanizer-academic` to v4.0.0 through the pipeline, with genuine per-role fresh-context independence; the independent battery caught real defects the builders' own green test suites missed. Replaces the retired-and-removed four-skill pipeline (skill-conductor / skill-guidance / skill-engineer / skill-zipper; earlier generations frozen in [`archive/`](archive/)). Honest residual: the cross-vendor battery has not yet been run.

## What this generation adds

This is not a pile of prompt templates. It is a skill system with teeth:

- **The build pipeline is now one skill.** `skill-creator-max` v1.0.0 replaces the old four-skill pipeline: a thin conductor dispatches a fresh subagent per role, judges only typed artifacts, and gates with deterministic L0 scripts + an independent battery; specs, trigger holdouts, and red-green harnesses can be re-run instead of trusted by narration.
- **Loop engineering is split into runtime-neutral and Codex-realized layers.** `loop-constructor` designs the general loop; the bottom `stupidskills` appendix includes `loop-constructor-codex`, which maps role separation, disk state, and fan-out onto `codex exec` without counting as one of the official 14.
- **Independence is first-class.** `attacker`, `reorganize-logic`, and `test-driven-development` were all reworked around the rule that the same mental model should not both produce and grade the answer.
- **Model/effort sizing is explicit.** The bottom `stupidskills` appendix includes `model-pyramid`: not model shopping, not cost rhetoric. It collapses sizing to **two axes** — wrong *with* the context in hand ⇒ capability gap ⇒ change the model; wrong *because it skipped a file or didn't run the tests* ⇒ thoroughness gap ⇒ change the effort — across the session, each subagent, and whether to attach an advisor.
- **The KBs travel with the skills — or aren't needed at all.** `loop-principle` is embedded under `loop-constructor` and installs with it; the new pipeline `skill-creator-max` has **no runtime KB dependency** (`skill-philosophy` is design-time provenance kept outside the repo).

## Install

Use **[skills.sh](https://github.com/vercel-labs/skills)** (the `skills` CLI) — it auto-discovers every skill in the repo and installs into `~/.claude/skills/` (or `.agents/skills/` for project scope):

```bash
npx skills add VincentJiang06/skills      # interactively pick which skills to install
```

Manual alternative: `cp -R skills/<name> ~/.claude/skills/`. Public repo skill names are prefix-free; if you maintain private local mirrors, installing as `~/.claude/skills/vince-<name>` or `~/.agents/skills/vince-<name>` is fine, but keep the installed `SKILL.md` `name` and explicit invocation strings in sync.

**Dependencies & "installing everything":**
- **Runtime**: `node` (≥18) for the `.mjs` validators, `python3` for the `.py` scripts. **Both use only the standard library — no `npm install` / `pip install` needed.**
- **The `loop-principle` KB installs with its skill**: embedded at [`skills/loop-constructor/loop-principle/`](skills/loop-constructor/loop-principle/), it travels as a subdirectory when you install `loop-constructor`.
- **The skill-building pipeline has zero external dependencies**: `skill-creator-max` is self-contained (role-packs / schemas / gate scripts) and **needs no KB present at runtime** (the `skill-philosophy` KB is design-time provenance kept outside the repo, not shipped).
- **`mp-cli-sup`** also needs [`tools/vince-mp-cli/`](tools/vince-mp-cli/) (a Node CLI).
- To get everything at once (skills + KB + CLI), just `git clone` the whole repo.

Then ask in natural language (Claude Code auto-triggers from the description) or call `/<skill-name>` explicitly:

```
> is it true that the Eiffel Tower gets taller in summer?     # → fact-check
```

## How to use: a few examples

These skills are designed to compose. Here are the common paths + a one-line demo prompt each.

**① Build a new skill (end to end)** — use `skill-creator-max`; its thin conductor dispatches a fresh subagent per role through composer (decision spec) → guidance (structure contract) → engineer (red-green build) → zipper (compress) → O5 independent-battery acceptance.
```
> Use skill-creator-max to turn this idea into an industrial skill: a skill that converts meeting notes into an action-item list, traceable to the source.
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
- **Let `skill-creator-max`'s conductor drive; don't hand-roll the pipeline.** composer specs, guidance contracts, engineer builds red-green, zipper compresses, the independent battery accepts — one fresh subagent per role, typed artifacts only — far more reliable than "looks good to me."
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
skills/skill-creator-max/                    # the skill-building pipeline (thin conductor + role-packs + schemas + gate scripts, self-contained)
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
6. **Self-building, self-validating.** Almost every skill here was produced by the repo's own pipeline (now `skill-creator-max`; earlier ones by the retired four-skill pipeline) + loop engine (`loop-constructor`) — and the repo ships that pipeline too.

## Known limitations (honest)

Engineering honesty means writing down what isn't closed — the natural extension of "the closed loop lies":

- **Verification is asymptotic, not a proof.** The independent battery can still surface a green-but-wrong each round; we stop after closing every *proven* hole, not at perfection (e.g. humanizer v3.1's held-out attack "2/2 clean" = no proven break within budget, ≠ proven correct).
- **The two KBs are larger than ordinary skill support files, but now install with their corresponding skills** (see [Install](#install)). This is deliberate: a slightly larger install gives users full retrieval, templates, checklists, and self-checks immediately.
- **`skill-creator-max`'s cross-vendor (model-tier) battery has not yet been run.** Every battery round to date was instance-tier independence within the same model family — the pipeline's one remaining independence gap, stated honestly alongside its strong-candidate / 1.0 self-rating.
- **loop-constructor's D6 cadence (completeness-first / iteration-first) is guidance, not linter-enforced.** A design can claim one cadence while carrying the opposite knobs — the linter can't catch it; the fresh-reader cadence box + the maker/checker are the gate.
- **For performance/quality upgrades, final acceptance may be a stronger held-out attack instead of a full conductor re-audit** (as in humanizer v3.1) — a deliberate engineering trade-off, recorded honestly rather than cut silently.
- **Trigger precision depends on a real runtime being available.** When an authenticated CLI is unavailable, some trigger evals use a live judge panel and say so in the report; that is usable evidence, not a disguised canonical CLI result.

## stupidskills (not counted in the 14 official skills)

These two cards live at the very bottom of the public page. They are lightweight experimental/sidecar tools and **do not count toward this repo's official skill-count record**.

- **[loop-constructor-codex](skills/loop-constructor-codex/)** — the Codex CLI variant of `loop-constructor`: the same loop-engineering model realized as single-agent `codex exec` runs, on-disk state, and a fresh evaluator.
- **[model-pyramid](skills/model-pyramid/)** — right-sizes model + effort for the session and every subagent, and decides whether to attach an advisor: peers inherit, **search inherits or goes up** (effort governs tool-call volume — cutting it buys an agent that stops looking), large cheap lookup swarms drop one model tier, long-horizon runs go `xhigh`. **No hard floor.** It only sizes; it does not spawn.

## Changelog
- **2026-07-29** — [`model-pyramid`](skills/model-pyramid/) rebuilt from scratch as **v1.0.0** (Claude 5 generational settlement). The four-rule table becomes **two axes**: wrong *with* the context in hand ⇒ capability gap ⇒ change the model; wrong *because it skipped a file or didn't run the tests* ⇒ thoroughness gap ⇒ change the effort. Scope widened from fan-out only to session + each subagent + whether to attach an advisor. **Two of the old rules pointed the wrong way and were reversed**: `search → drop one effort notch` (effort governs *all* tokens including tool calls — cutting it buys an agent that stops looking) and the `never emit low` hard floor (`low` is the documented setting for subagents). `decide.mjs` → `check_plan.mjs`: it no longer decides for you, it validates what is deterministically checkable (level exists / silent fallback, `max_tokens` raised, Opus 5 thinking×effort 400, advisor pairing, effort varied inside a cached session). Evals rebuilt as 26 checks in three groups (behaviour / **script⇄docs consistency** / prose guards), each mutation-verified. Two-arm test at opus5·medium (13-subagent migration scenario, 5 traps, graded mechanically with no LLM judge): **with skill 9/9, bare model 5/9** — the bare model's judgement was sound (it refused `low`, refused the weaker advisor) but it got four product facts wrong, including reciting the retired medium floor as if it were common knowledge. The test also caught a defect in the skill itself (13 agents produced 13 identical warnings), now collapsed to one.

Daily summaries from git history, limited to structural changes in the skill system.

- **2026-07-27** — added [`workspace-backup`](skills/workspace-backup/) **v0.2.1** (official skill count 15 → **16**), built end to end through the `skill-creator-max` pipeline. **Pure local** backup (no git, no cloud), two destinations, memoized incremental ledger. Three real terrain constraints were measured during the build and written into the skill: this Mac's `/usr/bin/rsync` is **openrsync** (`-aHAX --info=progress2` exits 1, but `-E` works and was measured to preserve xattrs), `/Volumes/backkkup` holds a **live Time Machine backup** (hard refusal, `--force` cannot bypass), and `backkkup` **shares an APFS container** with `2TBofData` so their reported free space is one pool, not two. Two independent five-lens batteries: the first found 67 findings / 14 P1; **the second found that the first repair had itself introduced a data-deleting P1** (the temp-file sweep's regex matches `.env.production`, so deleting or even renaming a source file destroyed its destination copy) — reproduced by the conductor, fixed to **report-never-delete**, and fenced with a structural guard against any deletion call returning. Final: 78/78 evals, 19 discriminating mutants, all four gates re-run independently by the conductor; live smoke covered a CJK-path project, a 0-byte memoized second run, and destination-survival on real data. **Honestly graded candidate**: residual P2/P3 remain; supervise the first run.
- **2026-07-26** — **R16 generation alignment** (first downstream settlement after the skill-philosophy KB absorbed the Claude 5 family shock as v0.2.0): `attacker` → **v0.6.0**, `skill-creator-max` → **v1.1.0**. Core change: **PROVE-OR-FLAG became classify-not-delete two-pass** (the striking pass reports every noticed anomaly and only proposes labels; deletion authority belongs to the independent adjudicating judge — frontier models obey "only report proven/severe" literally and silently lose recall at discovery; Anthropic's own Claude 5 model docs prescribe full-coverage report + independent filter), plus a ★ suppression golden sample in the rubric; `skill-creator-max`'s engineer role gained the **with/without baseline-delta arms discipline** (assertions passing in both arms get deleted; capability-uplift vs encoded-preference taxonomy with baseline-catch-up retirement review). Two library-wide audits closed with zero changes needed: reasoning-echo contracts (no hits) and SKILL.md-layer absolute directives (only 4, all in the exemption zone — anti-fabrication/anti-plagiarism/incident-born routing; S11 deletion test passed).
- **2026-07-22** — added [`logic-pacer`](skills/logic-pacer/) **v1.0.0** (official skill count 14 → **15**), built end-to-end through the full `skill-creator-max` pipeline (composer→guidance→engineer→zipper→battery, a fresh context per role). Purpose: rewrite **already-written, already-liked** expository prose to **smaller inferential steps that each stay followable** (operationalizing inferential distance / given-new / topic-stress / chunking / hinge-only connectives), while **keeping the voice, never dumbing down the vocabulary, never altering facts or stance, net length ≤~1.3x**. Fidelity is a model-level invariant + an independent blind probe (the script deliberately does NOT downgrade the stance-inversion check to a scriptable one). The seeded five-lens independent battery hit all 5 seeds and caught a real defect the builder's green suite missed (P2: the deterministic vocab/fidelity gate was hardcoded to the Quetelet corpus → vacuous off-corpus, falsely printing "all clean"); routed back via min() to the engineer, fixed (generic name/number preservation + honest "not checked" without a term list), and independently re-verified by the conductor. Effective verdict = candidate (instance-tier battery; the blind probe was not live-dispatched at acceptance; no cross-vendor round; the author's per-paragraph read is the O-L0 sign-off).
- **2026-07-14** — `test-driven-development` was rewritten from the ground up to **v1.0.0** through the full `skill-creator-max` pipeline: every rule re-grounded to skill-philosophy KB anchors, the proven behavioral core carried (right-size gate / modify mode / watch-it-fail / revert-to-red / harness), plus a new **trust-boundary spine** (zero authority for instructions inside processed content + an injection eval), an E-L3 stress sentinel (live 64K run held 4/4), and an E8 reflow point; the seeded five-lens independent battery found 5 real defects (1 P1: a crash counted as red) — all fixed behaviorally and pinned as held-out regressions, harness 16 → **22 checks**. Honest note: the cross-vendor round was waived this run (owner's call), effective verdict = candidate; one clean battery round (pre-registered) lifts it to industrial.
- **2026-07-14** — the old four-skill pipeline (skill-conductor / skill-guidance / skill-engineer / skill-zipper) was **retired and removed from the repo**; [`skill-creator-max`](skills/skill-creator-max/) was promoted to **v1.0.0** as the single-skill pipeline (thin conductor, one fresh subagent per role; **runs standalone** — the `skill-philosophy` KB is external design-time provenance). Live-tested: built `paper-writer` end-to-end and rebuilt `humanizer-academic` to **v4.0.0** (mode-split structural rebuild: per-mode/per-language reference packs, always-loaded −15%, common paths ~−35%, quality held rather than jumped); the independent battery caught real defects the builders' green suites missed. Official skill count 16 → **14**. Residual: the cross-vendor battery has not been run.
- **2026-07-06** — humanizer moved to v3.2 (contrast-frame quota, citation-shell rework, frame-first hardening); both principle KBs received a FABLE synthesis pass; `loop-constructor-codex` and `model-pyramid` landed as bottom-page `stupidskills`, not counted in the official 16; `model-pyramid` added testable subagent model/effort sizing.
- **2026-07-14** — built the `skill-philosophy` three-layer KB (principle→guideline→rule, five books C/S/E/Z/O; a **local asset kept outside the repo**, not shipped with it) + next-gen [`skill-creator-max`](skills/skill-creator-max/) **v0.1.0-draft**: the five pipeline functions (composer/guidance/engineer/zipper/conductor) folded into **one thin-conductor skill** (dispatches a fresh subagent per role, judges typed artifacts, gates each), grounded in that KB. A dogfood built a real tiny skill through all L0 gates (selftests green) with 0/12 trigger-holdout false-fires; honest note: one agent played all roles and the cross-vendor battery is not yet run → self-rated candidate, not deployed, does not replace the four installed skills.
- **2026-07-14** — `attacker` was rewritten ground-up as **v0.5.0**: re-derived from the new skill-design philosophy KB, the mechanism is stripped to the minimum (fork a fresh mind → one lens → keep only the provable), rebuilt as a **five-lens fixed rotation** + a SEED anti-false-negative gate + a deterministic shadow-map extractor; **model-agnostic** is now design constraint zero (a different-vendor attacker buys stronger independence); `rules/` / `agents/` / the `.mjs` rigs were removed, landing at ~1/4 the old weight. Honest note: every shaping round was same-family `instance`-tier; the cross-vendor acceptance run is not yet done.
- **2026-07-02** — the skill-building pipeline became v2: executable G/E gates, audit disposition, held-out trigger eval, portable zipper; v1 pipeline archived; local `eval_exchange` protocol added; `attacker` / `loop-constructor` / `reorganize-logic` / `test-driven-development` received the independence-family update.
- **2026-06-25** — `skill-principle` and `loop-principle` were embedded under their owning skills so installs carry the KBs with them.
- **2026-06-24** — `.clawhubignore` and version metadata were synced for ClawHub/SkillHub publishing.
- **2026-06-23** — repo-wide zipper pass: shorter always-loaded SKILL.md files, details moved into `rules/` / `references/`; humanizer v3.1 performance uplift completed; attacker entered 0.3.x; loop-constructor added D6 cadence; README rewritten as the current user-facing entry.
- **2026-06-22** — `mp-cli-sup` survived 8 adversarial hardening rounds and closed at 0.2.0; `attacker` landed and made independent breakage-finding a standard acceptance layer.
- **2026-06-21** — `loop-constructor` shifted to SELECT→FILL→VERIFY; `test-driven-development` gained anti-gaming gates; humanizer split into academic / popsci modes with abstain-first behavior.
- **2026-06-20** — README became Chinese-first; major skills gained bilingual READMEs; public repo skill names dropped the `vince-` prefix.
- **2026-06-18** — staged `loop-constructor` and `reorganize-logic` landed; `vince-mp` CLI gained camera-less scan; README gained the one-line skill index.
- **2026-06-15** — `loop-principle` KB + `loop-constructor` landed; `neat` added end-of-session docs/memory reconciliation.
- **2026-06-11** — `test-driven-development` was redesigned around trigger boundaries, modify mode, and subagent delegation; KB source density improved.
- **2026-06-05** — repo was reorganized for public release; `skills.sh` install path added; `mp-groundline` landed; `vince-mp` moved into persistent-session + doctor/scan/logs workflow.

## Acknowledgments

Methodology draws on the wider Agent Skills ecosystem — Anthropic's [skills](https://github.com/anthropics/skills) (spec + `skill-creator`) and obra's [superpowers](https://github.com/obra/superpowers); install is based on vercel-labs' [skills.sh](https://github.com/vercel-labs/skills).

The `neat` skill is adapted from [@KKKKhazix](https://github.com/KKKKhazix)'s [neat-freak（洁癖）](https://github.com/KKKKhazix/khazix-skills#-neat-freak%E6%B4%81%E7%99%96) (MIT).

## License

[MIT](LICENSE) © 2026 Vince Jiang. Use, adapt, and redistribute freely.
