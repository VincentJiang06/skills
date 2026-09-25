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

**Dependency & maintenance** — Step 4 verification needs the system `vince-mp` CLI (driven by `mp-cli-sup`); without DevTools or vince-mp the MIGRATION-MAP marks every page UNVERIFIED and never claims "consistent". The scanner measures page-level `renderer` pins against the `webview` target (a program that adopted Skyline page by page is a migration target) and skips the program's own `packOptions.ignore` folders, listing them in the map. The local `validate-skill` checks skill structure and the synthetic harness only — it does not prove a real migration is consistent.
**Measured results and known issues (0.2.1)** — E11 two-arm run on 0.1.2, 3 cases. In all 3 cases the judge preferred the arm with the skill. That arm made a smaller diff every time, kept `rendererOptions` and every workaround, and did not fix any delta it had not observed. The bare model, without the skill, made fixes like that in all 3 cases. The result shows a direction only: the judge knew which arm had the skill, and only tool calls were recorded, no tokens. The fix audit left two P2 defects open. (1) If app.json declares a page inside a `packOptions.ignore` folder, the scanner flips that page's renderer but never scans its content. Check the map's "Not scanned" folders against the page pins it asks you to flip, and scan any overlapping folder by hand. (2) Programs that adopted Skyline page by page also get the "global default-layout shift" warning. On those programs, keep any default-layout fix to the pinned pages. The other open items are listed in CHANGELOG.
**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/mp-groundline ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
