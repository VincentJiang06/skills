# Scan protocol — how the scanner classifies

Load at Step 1. The deterministic classifier lives in `scripts/scan.mjs`; this is
the reasoning behind its rules and how to read its output. Full I/O contract:
`references/scanner-contract.md`. Evidence for every verdict:
`references/skyline-to-webview.md`.

## Run it

```bash
node scripts/scan.mjs <program-root>      # repo root (holds project.config.json)
```

It resolves `miniprogramRoot` from `project.config.json`, reads `app.json` and
each page `.json` (including subpackage pages from **both** `subPackages` and
`subpackages`), walks `.wxml/.wxss/.less/.js/.ts/.wxs` (skipping `node_modules`
and `miniprogram_npm`), and prints `{ ok, error, miniprogramRoot, renderer_config,
findings[], summary }`. On a blocker it prints a structured error and exits 1.

## The four actions

- **mechanical** — the renderer flip (app-level) and any page-level renderer
  override. The migration applies these automatically.
- **keep** — a Skyline-era workaround that still renders under WebView. Default
  for every workaround; consistency-first means leaving it alone.
- **verify** — behavior may differ under WebView; confirm before/after with
  vince-mp (`rules/verify-with-vince-mp.md`) and fix only a real delta.
- **rewrite** — a Skyline-exclusive feature with no WebView equivalent. Surfaced
  up front as a manual-review gate; never silently dropped.

## Detection rules that matter

- **Real tag, not substring.** A Skyline-only element counts only as a real
  opening tag: `<span`, `<grid-view`, `<list-view`, `<sticky-header`,
  `<sticky-section`, `<nested-scroll-header`, `<nested-scroll-body`,
  `<draggable-sheet`, `<snapshot`, `<*-gesture-handler` — each followed by
  whitespace, `/`, or `>`. The literal text inside a class name, attribute value,
  JS identifier (`spanning`, `listViewData`), or comment yields **no** finding.
  WXML comments are stripped before tag-scanning.
- **worklet → rewrite (high):** detected via STRONG + WEAK tokens.
  **STRONG, Skyline-exclusive** — `wx.worklet`, a `'worklet'` directive,
  `applyAnimatedStyle`, `runOnUI`, `runOnJS`, `useSharedValue` — always fire,
  **one finding per matching source line** (the rewrite class flags every
  occurrence; never collapse a file's multiple worklet lines to one).
  **WEAK** — `Easing`, bare `timing(`/`spring(`/`decay(` — fire **only when the
  same file ALSO contains a STRONG signal**, because a generic charting/animation
  lib reuses those bare names (`import { Easing } from 'chart-lib'`,
  `function spring(){}`); in a file with a strong signal the weak lines still
  count per occurrence (file-level gate, NOT a `wx.worklet.` prefix), in a file
  with none they produce nothing. JS/TS comments are stripped first, so a comment
  mentioning `wx.worklet` does not fire (and does not arm the weak tokens);
  multiple matches on the SAME line → one finding.
- **custom route → rewrite:** `routeBuilder`, `wx.router`, `wx://`,
  `open-container`/`openContainer`, `customRoute` — **one finding per matching
  source line** in JS/TS and **one per `<open-container>` tag** in WXML (every
  occurrence; never one-per-file).
- **scroll-view** `type="list"/"custom"` → keep; if `enhanced` is already present
  the finding records it and the generator emits **no** redundant suggestion.
- **workarounds → keep:** a `box-shadow` hairline-border clause `(inset )?0 0 0 Npx`
  **anywhere** in the value (flush, `inset`, or a 2nd+ comma clause; unit
  case-insensitive) — the spread must carry a length unit, so a no-op
  `0 0 0 0`/`none`/`transparent` and a no-hairline multi-shadow are not flagged;
  flex+wrap grid substitute (only when `flex-wrap:wrap` **and** a **non-`100%`**
  `width: calc(...)` column co-occur — plain `display:flex`, an unrelated
  `flex-wrap:wrap`, or a full-width `calc(100% - …)` never fires);
  `word-break: break-all`; `backdrop-filter` (both **case-insensitive** — CSS
  property names are case-insensitive, so `WORD-BREAK: BREAK-ALL` /
  `BACKDROP-FILTER:` also fire). CSS/LESS comments are stripped with a
  CSS-aware stripper that masks `url(...)`/strings first, so a `url(https://…)` does
  **not** blank a real declaration sharing its line.
- **camera tap-mask → verify.**
- **config:** `renderer:"skyline"` → exactly one `renderer_flip` (mechanical);
  page-level `renderer` differing from app-level → a distinct `page_renderer_override`
  (mechanical) at that page's json, **deduped by resolved path** so the same physical
  page listed under both `subPackages` and `subpackages` yields exactly one (distinct
  pages in different roots still each get their own); `componentFramework:"glass-easel"` → keep;
  `rendererOptions.skyline` → keep/strip note, never rewrite.
- **already webview:** `renderer:"webview"` (or unset) → `summary.mechanical==0`,
  `summary.already_migrated==true`; STOP before editing.
- **malformed/missing app.json →** `{ ok:false, error }`, a blocker (no crash, no
  silent empty scan).
- **idempotency:** re-scanning an already-webview tree yields no new findings and
  `mechanical==0`.

## Reading the summary

`summary.rewrite > 0` is a manual-review gate — list every rewrite item to the
user before any edit. `summary.rewrite == 0` on a Skyline program means a clean
mechanical migration (flip + keep). `already_migrated == true` means stop.
