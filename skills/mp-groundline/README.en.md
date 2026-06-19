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

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/mp-groundline ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
