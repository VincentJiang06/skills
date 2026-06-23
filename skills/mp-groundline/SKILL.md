---
name: mp-groundline
description: >-
  Migrate a WeChat Mini Program off the Skyline renderer onto WebView, keeping
  pages visually CONSISTENT, and emit a MIGRATION-MAP doc. Use for "把小程序从
  skyline 迁移到 webview", "migrate off Skyline to WebView", "$mp-groundline". NOT
  for live-runtime debugging (mp-cli-sup), Skyline component dev, or
  reverse/non-WeChat work.
version: 0.1.0
---

# mp-groundline

Migrate a WeChat Mini Program **off the Skyline renderer onto the WebView
renderer** while keeping the front-end **visually and behaviorally consistent**,
and hand the next agent a **MIGRATION-MAP** debug doc that maps what changed.

## Prime directive — minimal diff, consistency first

The renderer flip (`app.json` `renderer: "skyline"` → `"webview"`) is the **one**
change that does ~90% of the migration. Everything else is *conservative*.

A mature Skyline program is full of **workarounds** — patterns the team adopted to
cope with Skyline's stricter subset (box-shadow used as a border, flex+width
instead of CSS grid, `word-break: break-all`, `scroll-view type="list"/"custom"`,
precomputed template flags, a tap-mask over `<camera>`). **These all still render
under WebView.** So the consistency-preserving move is to **KEEP them**, flip the
renderer, then **verify each page and fix only the deltas that actually appear**.
Reverting a workaround "because WebView now supports the native feature" is the
*opposite* of consistency and is OUT of scope unless the user asks to modernize.

Hard Skyline-only features (worklet animations, custom routes, Skyline-exclusive
components) have **no WebView equivalent** and DO require a real rewrite — but only
when the scan finds them. **Flag, never silently drop.**

## What this skill produces

1. A **migration scan** (deterministic JSON) — `renderer_config` + a categorized
   inventory of every Skyline-specific usage / workaround, each tagged
   `mechanical` / `keep` / `verify` / `rewrite`.
2. The **MIGRATION-MAP.md** debug doc (the headline deliverable) — config diff,
   the general Skyline↔WebView element/API table, the rewrite manual-review gate,
   and one row per finding (file:line + action + debug note).
3. The **migrated program** — renderer flipped, workarounds kept, real deltas
   fixed minimally, each fix re-verified.

## Steps

### Preflight
Resolve `miniprogramRoot` from `project.config.json`; locate `app.json`; confirm
`renderer == "skyline"` (if already `"webview"` → report already-migrated, run the
scan as a no-op inventory, and **STOP before editing**); confirm a clean git
working tree so the flip is revertible.

### Step 1 — Scan  → load `rules/scan-protocol.md`
```bash
node scripts/scan.mjs <program-root>
```
Emits `renderer_config` + `findings[]` + `summary`. Every `rewrite` finding is a
manual-review item surfaced up front.

### Step 2 — Emit the MIGRATION-MAP (doc-before-edit gate)
```bash
node scripts/gen_migration_map.mjs <program-root>   # or pipe the scan JSON
```
Write `MIGRATION-MAP.md` **before any edit** so the plan is reviewable. Contract:
`references/scanner-contract.md`; mapping evidence: `references/skyline-to-webview.md`.

### Step 3 — Mechanical flip
Edit `app.json` (and any page-level `renderer` override): `renderer → "webview"`.
Keep `glass-easel`, `style:"v2"`, `navigationStyle:"custom"`, `lazyCodeLoading`,
per-page `disableScroll`; keep or strip `rendererOptions.skyline` (ignored by
WebView).

### Step 4 — Verify  → load `rules/verify-with-vince-mp.md`
Use the system `vince-mp` CLI (the tool `mp-cli-sup` drives — do **NOT**
rebuild it) to capture before/after screenshots + `pageData` per page and diff →
the list of **actual** deltas.

### Step 5 — Targeted fixes  → load `rules/minimal-fix-protocol.md`
Fix ONLY confirmed deltas, smallest change first, re-verify each. Record each fix
in the MIGRATION-MAP.

### Step 6 — Finalize
Update the MIGRATION-MAP with applied fixes + remaining rewrite items. Report diff
size (files touched, lines changed) — minimal is the goal. **Rollback** = `git
checkout` of `app.json` + touched page `.json`.

## Scope boundary

- **IN:** Skyline→WebView migration of a WeChat mini program; consistency-first
  minimal-diff edits; the deterministic scan + MIGRATION-MAP doc.
- **OUT (route elsewhere):** live runtime debugging → `mp-cli-sup`;
  DEVELOPING Skyline components / worklet animations / custom routes → the
  `skyline-*` skills (opposite direction); webview→skyline reverse migration;
  perf-only optimization with no renderer change; modernizing/reverting a
  workaround unless explicitly asked; non-WeChat work. The discriminator is
  **DIRECTION** (off Skyline) + **INTENT** (migrate+consistency, not
  develop/debug/optimize).

## Metrics

- **migration_correctness** = every hard Skyline-only feature present is flagged
  `rewrite` AND zero false `rewrite` on a clean-workaround program (target 1.0;
  oracle = the deterministic eval harness).
- **minimal_diff** = files touched + lines changed (the mechanical flip is one
  `app.json` edit + N page-json edits only where a page override exists).
- **activation_precision** = the 4 positives + 4 adjacent negatives in
  `assets/eval-cases.json` via `trigger_eval.mjs --judge cli` (target ≥0.9).

## Modules (load on demand)

| File | When to load |
|------|--------------|
| `rules/scan-protocol.md` | Step 1 — how the scanner classifies; detection rules; reading the summary. |
| `rules/verify-with-vince-mp.md` | Step 4 — before/after `vince-mp` capture + diff (real subcommands). |
| `rules/minimal-fix-protocol.md` | Step 5 — confirmed-delta-only, smallest-change-first, re-verify-each. |
| `references/skyline-to-webview.md` | Evidence-bound Skyline→WebView per-feature map (drives category→action). |
| `references/scanner-contract.md` | The frozen JSON contract for `scan()` output. |
| `references/example-migration-map.md` | An illustrative MIGRATION-MAP excerpt (doc only). |

## Scripts

| File | Usage |
|------|-------|
| `scripts/scan.mjs` | `node scripts/scan.mjs <root>` — the migration scanner (exports `scan(root)`; CLI prints JSON). |
| `scripts/gen_migration_map.mjs` | `node scripts/gen_migration_map.mjs <root>` — pure scan→MIGRATION-MAP.md (exports `generate(scan)`). |

## Assets

| File | Usage |
|------|-------|
| `assets/eval-cases.json` | Labeled trigger cases (4 must_activate + 4 must_not_activate). |
| `assets/metric-plan.json` | Metric definitions (migration_correctness, minimal_diff, activation_precision). |
| `assets/release-manifest.json` | Version, release gate, rollback path. |
| `assets/skill-design-record.json` | The design record. |
