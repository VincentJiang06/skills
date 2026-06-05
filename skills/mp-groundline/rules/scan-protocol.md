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
each page `.json`, walks `.wxml/.wxss/.less/.js/.ts` (skipping `node_modules` and
`miniprogram_npm`), and prints `{ ok, error, miniprogramRoot, renderer_config,
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
- **worklet → rewrite (high):** `wx.worklet`, a `'worklet'` directive,
  `applyAnimatedStyle`, `runOnUI`, `runOnJS`, `useSharedValue`, `Easing`,
  `timing(`/`spring(`/`decay(` — **one finding per matching source line** (the
  rewrite class flags every occurrence; never collapse a file's multiple worklet
  lines to one). JS/TS comments are stripped first, so a comment mentioning
  `wx.worklet` does not fire; multiple matches on the SAME line → one finding.
- **custom route → rewrite:** `routeBuilder`, `wx.router`, `wx://`,
  `open-container`/`openContainer`, `customRoute` — **one finding per matching
  source line** in JS/TS and **one per `<open-container>` tag** in WXML (every
  occurrence; never one-per-file).
- **scroll-view** `type="list"/"custom"` → keep; if `enhanced` is already present
  the finding records it and the generator emits **no** redundant suggestion.
- **workarounds → keep:** `box-shadow: 0 0 0 Npx` as a border, flex+wrap grid
  substitute, `word-break: break-all`, `backdrop-filter`.
- **camera tap-mask → verify.**
- **config:** `renderer:"skyline"` → exactly one `renderer_flip` (mechanical);
  page-level `renderer` differing from app-level → a distinct `page_renderer_override`
  (mechanical) at that page's json; `componentFramework:"glass-easel"` → keep;
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
