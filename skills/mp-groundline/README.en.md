# mp-groundline

> Land a Mini Program from Skyline back onto WebView — consistency-first: flip the renderer, but never strip the existing compatibility code.

**English** · [简体中文](README.md)

**What it does** — Migrates a WeChat Mini Program from the Skyline renderer to WebView, consistency-first: flips the renderer while keeping page behavior consistent, with a read-only scanner + a generated MIGRATION-MAP doc.

**Why it's good** —
- Flips the renderer and **keeps** the workarounds — never reverts, never strips existing compatibility code; minimal diff, not a rewrite.
- A read-only scanner that only inventories and never touches the target; hard Skyline-only features are always "flagged, never silently dropped".
- Uses the system `vince-mp` CLI to capture before/after screenshots + `pageData` and fix only the deltas that actually appear.
- Hardened over 5 engineer rounds × 4 fresh batteries — 11 latent bugs caught (incl. markdown injection, CSS url-comment-eating, worklet weak-token over-match).

**When to use** — "migrate this mini program off Skyline to WebView" · "generate the skyline→webview migration doc"; or call `/mp-groundline`.
**Not for** — live runtime debugging (→ mp-cli-sup); DEVELOPING Skyline components / worklet animations / custom routes (→ skyline-* skills, opposite direction); webview→skyline reverse migration; perf-only optimization with no renderer change; modernizing / reverting a workaround unless explicitly asked; non-WeChat work.

**Dependency & maintenance** — Step 4 verification needs the system `vince-mp` CLI (driven by `mp-cli-sup`); without DevTools or vince-mp the MIGRATION-MAP marks every page UNVERIFIED and never claims "consistent". The scanner measures page-level `renderer` pins against the `webview` target (a program that adopted Skyline page by page is a migration target) and skips the program's own `packOptions.ignore` folders, listing them in the map (a folder that holds a page app.json declares is still scanned). The local `validate-skill` checks skill structure and the synthetic harness only — it does not prove a real migration is consistent.
**Measured results and known issues (0.2.3)** — E11 two-arm run on 0.1.2, 3 cases. In all 3 cases the judge preferred the arm with the skill. That arm made a smaller diff every time, kept `rendererOptions` and every workaround, and did not fix any delta it had not observed. The bare model, without the skill, made fixes like that in all 3 cases. The result shows a direction only: the judge knew which arm had the skill, and only tool calls were recorded, no tokens. The two P2 defects the 0.2.0 fix audit left open are fixed in 0.2.2: a declared page inside a `packOptions.ignore` folder is scanned, and for per-page Skyline adoption the default-layout advice names only the pinned pages. The independent audit of that fix round found no P0 or P1, and the release check passed (release_ok). The items still open are no worse than installed 0.1.1. A `wx://` route on the same line after a quote-bearing regex literal is missed (0.1.x has the same limit). A `packOptions.ignore` folder that holds one declared page is scanned in full, so an unshipped backup subfolder inside it can add rewrite items (extra findings, never a dropped one). Other open items are listed in CHANGELOG.
**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/mp-groundline ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
