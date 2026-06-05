# Scanner contract — `scripts/scan.mjs`

The deterministic core. `scan(root)` reads a WeChat Mini Program tree **read-only**
and returns the migration inventory below. The MIGRATION-MAP generator and every
eval case consume this exact shape — it is frozen here (resolves the spec's
blocking_unknown #1). Change it only with a contract test update.

## Entry points

```js
import { scan } from "./scripts/scan.mjs";   // programmatic (eval cases import THIS)
const result = scan("/abs/path/to/program-root");
```

```bash
node scripts/scan.mjs /abs/path/to/program-root   # CLI wrapper prints JSON to stdout
```

`root` is the **repo root** (the dir holding `project.config.json`), OR a dir that
already is the `miniprogramRoot`. The scanner resolves `miniprogramRoot` from
`project.config.json` when present; otherwise it treats `root` as the program root
and looks for `app.json` directly under it.

## Output shape

```jsonc
{
  "ok": true,                       // false only on a structured blocker (see Errors)
  "error": null,                    // string when ok=false, else null
  "miniprogramRoot": "miniprogram/",// resolved value (relative to root), or "." 
  "renderer_config": {
    "renderer": "skyline",          // "skyline" | "webview" | null (unset → webview default)
    "componentFramework": "glass-easel",   // or null
    "style": "v2",                  // or null
    "navigationStyle": "custom",    // app.json window.navigationStyle, or null
    "lazyCodeLoading": "requiredComponents", // or null
    "rendererOptions": { "skyline": { ... } },  // raw object, or null
    "page_overrides": [             // pages whose json sets renderer differing from app-level
      { "page": "pages/foo/index", "file": "miniprogram/pages/foo/index.json", "renderer": "skyline" }
    ]
  },
  "findings": [
    {
      "category": "renderer_flip",  // see Categories
      "action": "mechanical",       // "mechanical" | "keep" | "verify" | "rewrite"
      "severity": "info",           // "info" | "low" | "medium" | "high"
      "file": "miniprogram/app.json", // path relative to root
      "line": 18,                   // 1-based; 0 when not line-addressable
      "snippet": "\"renderer\": \"skyline\"",
      "note": "Flip app-level renderer skyline→webview (the core migration)."
    }
  ],
  "summary": {
    "mechanical": 1, "keep": 7, "verify": 1, "rewrite": 0,
    "total": 9,
    "already_migrated": false       // true iff renderer is already "webview" (or unset)
  }
}
```

`summary.total === findings.length`. The four action counts sum to `total`.

## Actions (the migration decision)

| action | meaning | who acts |
|---|---|---|
| `mechanical` | a deterministic edit the migration applies (the renderer flip + page overrides) | the skill, automatically |
| `keep` | a Skyline-era workaround that **still renders under WebView** — leave it | nobody (default for workarounds) |
| `verify` | behavior **may** differ under WebView; confirm with vince-mp before/after | the agent, at verify time |
| `rewrite` | a **Skyline-exclusive** feature with no WebView equivalent — manual rewrite | a human/agent, surfaced up front |

`action` is bound to evidence: a category is `rewrite` **only** if a source skill
documents the feature as Skyline-exclusive (see `references/skyline-to-webview.md`).

## Categories → action (the mapping table)

The **granularity** column is the counting contract: how many findings one program
yields for that category. It is normative — `scripts/scan.mjs` and these values
are reconciled (a counting eval pins each). The governing rule:

- **Rewrite-class** features (`worklet`, `custom_route`, `skyline_component`) —
  the skill's prime directive *"flag every occurrence, never silently drop one"*
  (`references/skyline-to-webview.md`) — emit **one finding per occurrence**:
  per matching source line for the JS/TS API patterns (`worklet`, `custom_route`),
  per real opening tag for the WXML element/`<open-container>` patterns.
- **Per-line / per-occurrence keep workarounds** (`box_shadow_border`,
  `word_break`, `backdrop_filter`, `scroll_view_type`) — emit one finding per
  matching line / tag so every kept site is inventoried.
- **Program-level config notes** (`renderer_flip` app-level, `component_framework`,
  `renderer_options`) — emit **once per program** (a single config decision).
  `page_renderer_override` is **once per page** (a per-page config decision).
- **Whole-file heuristics** (`flex_grid_workaround`, `camera_mask`) — emit **once
  per file**: these are low-confidence presence heuristics, not exhaustive site
  lists, so they are deliberately collapsed to one row per file to avoid noise.
  They are NOT rewrite-class, so the never-drop guarantee does not bind them.

Within a single line, a category dedupes to one finding (a JS line matching the
worklet pattern twice → one `worklet` finding for that line; a line matching both
the worklet and the custom_route pattern → one of each).

| category | action | severity | granularity | trigger |
|---|---|---|---|---|
| `renderer_flip` | mechanical | info | once per program (app-level) | app.json `renderer:"skyline"` (exactly one) |
| `page_renderer_override` | mechanical | low | once per page | page json `renderer` differing from app-level |
| `renderer_options` | keep | info | once per program | `rendererOptions.skyline` present (ignored by WebView; keep or strip) |
| `component_framework` | keep | info | once per program | `componentFramework:"glass-easel"` (supported on WebView) |
| `worklet` | rewrite | high | per matching line | worklet animation API/directive |
| `custom_route` | rewrite | high | per matching line (JS) / per tag (`<open-container>`) | custom route API/scheme/element |
| `skyline_component` | rewrite | high | per opening tag | a real Skyline-only element tag |
| `box_shadow_border` | keep | low | per matching line | `box-shadow: 0 0 0 Npx` used as a border |
| `flex_grid_workaround` | keep | low | once per file (heuristic) | flex + wrap substituting for grid |
| `word_break` | keep | low | per matching line | `word-break: break-all` |
| `backdrop_filter` | keep | low | per matching line | `backdrop-filter` |
| `scroll_view_type` | keep | low | per opening tag | `scroll-view type="list"/"custom"` |
| `camera_mask` | verify | medium | once per file (heuristic) | a tap-mask wrapper over `<camera>` |

## Errors (structured, never a throw)

When the program cannot be scanned, return:

```json
{ "ok": false, "error": "app.json not found under <miniprogramRoot>", "miniprogramRoot": "...",
  "renderer_config": null, "findings": [], "summary": { "mechanical":0,"keep":0,"verify":0,"rewrite":0,"total":0,"already_migrated":false } }
```

Triggers: missing `app.json`, malformed (invalid JSON) `app.json`. A malformed
**page** json is skipped with no crash (it does not fail the whole scan). The CLI
wrapper prints the error JSON and exits non-zero.

## Idempotency

Re-scanning an already-`webview` tree → `summary.mechanical === 0`,
`summary.already_migrated === true`, and **no** `renderer_flip` / `page_renderer_override`
findings (the migration is not re-applied). Workaround `keep` findings may still
appear (they are inventory, not edits).

## Scanned file types

WXML: `.wxml`. Styles: `.wxss` **and** `.less` (Skyline projects often author
`.less` compiled to wxss). Logic: `.js`, `.ts`. Config: `app.json`, page `*.json`.
`node_modules/` and `miniprogram_npm/` are skipped.
