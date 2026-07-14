# Runbook: update the skill cards on vincejiang.com/skills/

A short, standing guide for Opus to keep the card grid at
**https://vincejiang.com/skills/** in sync with this repo. Run it after any
change to the skill roster or a skill's scope/description.

## The model

The page is a **mirror of this repo's README "一句话速览 / Skills at a glance"
section** — that section is the source of truth. The page has:

- Title **"Agent Skills 🧰"** + one install line `npx skills add VincentJiang06/skills`.
- **Four official groups**, in this order: **Finished Products** · **Coding Discipline**
  · **Loop & Adversarial** · **Meta Pipeline**. These are the **14 counted
  skills**.
- A bottom appendix titled **stupidskills** for experimental/sidecar cards. This
  appendix is visually separated and explicitly says it is **not counted** in the
  official skill total.
- One **card per skill**: `name` (links to `https://github.com/VincentJiang06/skills/tree/main/skills/<name>`),
  a 1–2 sentence description, and a `↗` arrow. No version, icon, or per-card
  install text.

So "update the cards" = (1) roster matches `skills/`, in the right group; (2)
each card's blurb matches the repo one-liner; (3) each link resolves.

## Steps

1. **Point at the site source.** The card content lives in the website repo, not
   this one — ask the user for its path/URL if not given. Find where cards are
   defined: usually a data array/JSON (e.g. `skills.json`, a `cards` array in a
   component) or a repeated HTML/MDX block. Grep the site for a known skill name
   (e.g. `album-review`) to locate it.
2. **Diff the official roster** against the counted list below (14 official
   skills as of 2026-07-14). Add official new skills to the right group; remove
   deleted ones; rename if a folder was renamed. **Archived versions under
   `archive/` never get cards** — they aren't installable. If a skill is marked
   `stupidskills`, put it only in the bottom appendix and do not change the
   official count.
3. **Sync each blurb** to the canonical copy below (keep it card-length: 1–2
   sentences — do *not* paste the longer README bullets or the full SKILL.md
   `description`). Match the site's existing language(s); if the site is
   bilingual, update both.
4. **Check every link** points at `.../tree/main/skills/<name>` and the folder
   exists on `main`.
5. **Preview, then ship** via whatever the site's normal flow is (local build →
   the user's deploy). Don't invent a deploy step; if unsure, stop and show the
   diff.

## Canonical card copy (roster + blurbs — sync source of truth)

Keep names exactly as the `skills/` folder names.

**Finished Products**
- **album-review** — Artist/credit + album → one 10,000–15,000-字, source-traced Chinese 乐评 covering every musical dimension.
- **hifi-review** — Objective HiFi-gear evaluation: signature from FR-vs-target, competence from measurements, every claim traced to evidence.
- **course-study** — Course materials → complete-coverage, Feynman-explained, exam-ready revision notes.
- **fact-check** — A fast, citation-backed BLUF answer to a factual question or "is it true…" claim (≤2 / ≤5 min).
- **humanizer-academic** — Rewrites AI-generated serious prose (EN/ZH) in two modes (academic / popsci); abstain-first — leaves it alone if it already reads human. v4.0.0: mode-split structural rebuild (per-mode/per-language packs, loaded on demand).
- **paper-writer** — Authors a new, complete, spec-compliant paper from a requirement and/or topic; never fabricates a citation, never plagiarizes — unverifiable sources are marked `[SOURCE NEEDED]`.
- **mp-cli-sup** — Debugs a live WeChat Mini Program via the `vince-mp` CLI: one persistent session, stable uids, camera-less scan.
- **mp-groundline** — WeChat Mini Program Skyline→WebView migration, consistency-first, with a read-only scanner + migration map.

**Coding Discipline** (auto-triggered as you build)
- **test-driven-development** — TDD for non-trivial behavior: a failing test first; the suite is a living spec you edit as the target changes.
- **neat** — End-of-session reconciliation of docs + agent memory against the code, so knowledge doesn't rot.

**Loop & Adversarial**
- **loop-constructor** — Designs the engineered loop for a medium/large task: decomposed into gated sub-loops, emitted as a runnable `.loop/` runbook.
- **attacker** — Attacks a product's observable behavior (or red-teams an idea): a fresh, TDD-independent subagent records only proven, reproducible breakages.
- **reorganize-logic** — Rebuilds the design-contract layer (architecture + structure + interfaces) with the code as the single source of truth, behind a review gate.

**Meta Pipeline** (the skill that builds skills)
- **skill-creator-max** — The whole skill-building pipeline in one skill (v1.0.0): a thin conductor dispatches a fresh subagent per role (composer / guidance / engineer / zipper / battery), gates on typed artifacts only, and runs fully standalone. Replaces the retired skill-conductor / skill-guidance / skill-engineer / skill-zipper.

**stupidskills** (bottom appendix — explicitly not counted in the 14 official skills)
- **loop-constructor-codex** — Codex CLI variant of loop-constructor: realizes the loop model as single-agent `codex exec` runs, on-disk state, and a fresh evaluator.
- **model-pyramid** — Right-sizes model tier + reasoning effort before subagent fan-out; it only sizes workers and does not spawn them.

## What changed in this pass (2026-07-14)

Official roster is now **14 counted skills** (was 16). The four Meta Pipeline
cards (`skill-conductor`, `skill-guidance`, `skill-engineer`, `skill-zipper`)
are **retired and removed** — replace them with a single **skill-creator-max**
card (v1.0.0, the one-skill pipeline). `paper-writer` is a new Finished
Products card. The `humanizer-academic` blurb notes the v4.0.0 mode-split
structural rebuild. The bottom-page **stupidskills** appendix
(`loop-constructor-codex`, `model-pyramid`) is unchanged and still not counted.
