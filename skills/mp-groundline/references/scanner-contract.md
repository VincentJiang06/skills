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
  - **`worklet` strong-vs-weak tokens (precision gate).** Worklet detection
    splits its tokens into STRONG and WEAK to avoid a rewrite-class false
    positive. **STRONG, Skyline-exclusive signals** — `wx.worklet`
    (covers `wx.worklet.shared(`), a `'worklet'`/`"worklet"` directive,
    `applyAnimatedStyle`, `runOnUI`, `runOnJS`, `useSharedValue` — always fire,
    **one finding per matching line**. **WEAK tokens** — `Easing`, and bare
    `timing(` / `spring(` / `decay(` — are names a generic charting/animation lib
    reuses (`import { Easing } from 'chart-lib'`, `function spring(){}`,
    `timing(300)`), so they count **only when the SAME file ALSO contains at least
    one STRONG signal**. In a file with a strong signal the weak tokens still fire
    **per matching line** (per-occurrence preserved); in a file with **no** strong
    signal the weak tokens produce **nothing**. The gate is **file-level**, not a
    `wx.worklet.` prefix requirement — a bare `spring()` line in a file that also
    uses `wx.worklet`/`applyAnimatedStyle` still counts.
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
  `flex_grid_workaround` additionally requires a *signature* co-occurrence (see
  "Precision of the keep heuristics" below) — presence of `flex-wrap:wrap` alone
  is not enough.

Within a single line, a category dedupes to one finding (a JS line matching the
worklet pattern twice → one `worklet` finding for that line; a line matching both
the worklet and the custom_route pattern → one of each).

| category | action | severity | granularity | trigger |
|---|---|---|---|---|
| `renderer_flip` | mechanical | info | once per program (app-level) | app.json `renderer:"skyline"` (exactly one) |
| `page_renderer_override` | mechanical | low | once per **physical** page (deduped by resolved page-json path) | page json `renderer` differing from app-level. The resolved page set is **deduped by resolved path**, so the SAME physical page listed in both `subPackages` and `subpackages` (or in `pages[]` and a subpackage) yields **exactly one** override; distinct pages in different roots each still get their own |
| `renderer_options` | keep | info | once per program | `rendererOptions.skyline` present (ignored by WebView; keep or strip) |
| `component_framework` | keep | info | once per program | `componentFramework:"glass-easel"` (supported on WebView) |
| `worklet` | rewrite | high | per matching line | worklet animation API/directive. **STRONG** signals (`wx.worklet`, a `'worklet'` directive, `applyAnimatedStyle`, `runOnUI`, `runOnJS`, `useSharedValue`) always fire. **WEAK** tokens (`Easing`, bare `timing(`/`spring(`/`decay(`) fire **only when the file also carries a STRONG signal** — a generic charting/animation lib reusing those bare names yields nothing (file-level gate, not a `wx.worklet.` prefix) |
| `custom_route` | rewrite | high | per matching line (JS) / per tag (`<open-container>`) | custom route API/scheme/element |
| `skyline_component` | rewrite | high | per opening tag | a real Skyline-only element tag |
| `box_shadow_border` | keep | low | per matching line | a hairline `box-shadow` clause `(inset )?0 0 0 Npx` used as a border — the spread MUST carry a length **unit** (`px`/`rpx`/`em`/`rem`/`%`, case-insensitive). The clause may sit **anywhere** in the value: flush after the colon, with a leading `inset`, or as a 2nd+ comma clause (`0 2px 8px rgba(), 0 0 0 1px`). A no-op `0 0 0 0` / `none` / `0 0 0 transparent`, and a normal multi-shadow with **no** hairline clause (`0 2px 8px rgba(), 0 4px 16px rgba()`), are NOT flagged |
| `flex_grid_workaround` | keep | low | once per file (heuristic) | flex substituting for grid — fires only when `flex-wrap:wrap` **and** a **non-`100%`** `width: calc(...)` column width co-occur in the file; plain `display:flex`, an unrelated `flex-wrap:wrap`, a bare non-width `calc(`, a plain `width:100%`, or a full-width `width: calc(100% - …)` container do NOT fire (precision tightening — see note below) |
| `word_break` | keep | low | per matching line | `word-break: break-all` — **case-insensitive** (CSS property names are case-insensitive, so `WORD-BREAK: BREAK-ALL` also fires; the value matches case-insensitively too) |
| `backdrop_filter` | keep | low | per matching line | `backdrop-filter` — **case-insensitive** property name (`BACKDROP-FILTER:` also fires) |
| `scroll_view_type` | keep | low | per opening tag | `scroll-view type="list"/"custom"` |
| `camera_mask` | verify | medium | once per file (heuristic) | a tap-mask wrapper over `<camera>` |

## Precision of the keep heuristics (`box_shadow_border`, `flex_grid_workaround`)

Both default to the **safe** `keep` action, so an over-match is never dangerous —
but it is noise in the MIGRATION-MAP inventory. Two tightenings keep them honest:

- **`box_shadow_border`** matches a real 1-side hairline border clause — the
  spread must carry a length **unit** — and the clause may appear **anywhere** in
  the value, not only flush after the colon:
  `/box-shadow:\s*(?:[^;{}]*?[,\s])?(?:inset\s+)?0\s+0\s+0\s+\d*\.?\d+(?:px|rpx|em|rem|%)/i`.
  This catches the three standard ways to author the hairline this skill flags as
  a flagship KEEP: flush (`box-shadow: 0 0 0 1px #ccc`), inset
  (`box-shadow: inset 0 0 0 1px #ccc`), and a 2nd+ comma clause
  (`box-shadow: 0 2px 8px rgba(), 0 0 0 1px #ccc`); the unit is case-insensitive
  (`1PX`). It still does **not** match the no-op reset `box-shadow: 0 0 0 0`,
  `box-shadow: none`, `box-shadow: 0 0 0 transparent`, or a normal multi-shadow
  with no hairline clause (`box-shadow: 0 2px 8px rgba(), 0 4px 16px rgba()`).
  `.5px` is caught by `\d*\.?\d+`. (Evals: `scan_box_shadow_border_precision`,
  `scan_box_shadow_border_inset_multishadow`.)
- **`flex_grid_workaround`** is the documented *flex-instead-of-grid* signature:
  `flex-wrap: wrap` **and** a **non-`100%`** `width: calc(...)` column width must
  both appear in the file. The `100%` exclusion is the key precision guard: a
  `width: calc(100% - …)` is a full-width *container*, not a grid column, so an
  unrelated tag-cloud (`flex-wrap:wrap`) sharing a file with such a container is no
  longer a false positive. This is **deliberately file-scoped, not block-scoped**:
  on real trees the column-width `calc(…)` is frequently a **sibling** rule of the
  flex container (confirmed on the demo's `home/index.less`, where
  `.intro-sheet__features{flex-wrap:wrap}` and the column
  `.intro-feat-card{width:calc(50% - 6rpx)}` are adjacent sibling blocks), so a
  same-block requirement would **false-negative the genuine grid**. The non-`100%`
  column-width guard removes the false positive without that regression. A bare
  non-width `calc(` (e.g. `height: calc(... + env(safe-area-inset-bottom))`) and a
  plain `width: 100%` remain non-triggers. (Evals: `scan_flex_grid_precision`,
  `scan_flex_grid_fullwidth_no_false_positive`.)

## MIGRATION-MAP cell safety (generator)

`gen_migration_map.mjs` renders findings into Markdown **tables**. A finding's
`snippet`/`note` is arbitrary source text, so `esc()` sanitizes every cell:
escape `|` → `\|` (cell-delimiter), collapse any CR/LF to a single space (so a
row never splits), neutralize backticks `` ` `` → `'` (an embedded backtick would
close the inline-code span the cell is wrapped in), and cap length to 200 chars.
A row therefore always has exactly the header's cell count.

The cap is applied **after** the `|`→`\|` escape, so it can land in the middle of
an escaped `\|` — keeping the lone `\` and dropping the `|`. To honor the
guarantee that **a cap never severs a `\|`** (a dangling `…a\…` would escape the
following cell delimiter), after slicing `esc()` strips a **trailing lone
backslash** before appending the `…` ellipsis: an **odd** run of trailing
backslashes (the last `\` is a severed escape lead) loses its last char; an
**even** run (fully-paired literal backslashes) is left intact. (Evals:
`gen_markdown_injection_safe`, `gen_markdown_newline_collapse`,
`gen_cap_no_dangling_backslash`.)

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
`.less` compiled to wxss). Logic: `.js`, `.ts`, **and `.wxs`** — `.wxs` is a
JS-subset module language and is run through the same worklet/custom_route
detectors (and the same comment-strip) so a `'worklet'` directive or `wx.worklet`
token inside a `.wxs` is never silently dropped. Config: `app.json`, page `*.json`.
`node_modules/` and `miniprogram_npm/` are skipped.

The whole `miniprogramRoot` tree is walked recursively, so source findings inside
**subpackage** dirs and **custom component** files (`Component({...})`, not just
`Page({...})`) are scanned like any other file. Page-level renderer overrides are
discovered from `app.json.pages` plus **both** `subPackages` (camelCase) and
`subpackages` (lowercase) — the two spellings are **merged**, not short-circuited,
so a config carrying both keys does not lose the lowercase set's overrides. Each
subpackage page is resolved against its own `root`. Because the merge can list the
**same physical page** under both spellings (or in `pages[]` and a subpackage), the
resolved page set is **deduped by resolved page-json path** so each physical page
yields **at most one** `page_renderer_override` finding (the "one finding per page"
granularity). The dedupe is by **resolved path only** — distinct pages in different
subpackage roots each still produce their own override (no over-collapse). (Evals:
`scan_subpackage_overrides_both_spellings`, `scan_page_override_dedupe`,
`scan_component_file_worklet`, `scan_wxs_worklet`.)

## Comment handling per language

Each language gets a comment stripper that preserves newlines (line numbers stay
accurate) so a token mentioned only in a comment never becomes a finding:

- **WXML** — `<!-- … -->` blocks (`stripWxmlComments`).
- **JS / TS / WXS** — `//` line + `/* */` block, skipping over string literals so a
  `//` inside `'wx://…'` is not mistaken for a comment (`stripJsComments`).
- **WXSS / LESS** — a **CSS-aware** stripper (`stripCssComments`), **not** the JS
  one. The JS stripper treats `//` as a line comment, which is wrong for CSS: the
  `//` inside `background: url(https://cdn/x.png)` would blank the rest of that
  line and silently drop a real `box-shadow:0 0 0 1px` / `word-break:break-all` /
  `backdrop-filter` sharing it (violating the per-line keep guarantee; `//` is not
  even valid `.wxss` syntax). `stripCssComments` first **masks** `url(...)` and
  quoted-string literals (same-length blanks, so columns are preserved), *then*
  strips genuine `/* */` blocks (both `.wxss` and `.less`) and genuine `//` LESS
  line comments on the masked text — so a `url(https://…)` line keeps its real
  declarations while a commented-out workaround (`/* box-shadow:… */`,
  `// box-shadow:…`) still produces no finding. (Eval:
  `scan_css_url_line_workaround_kept`.)
