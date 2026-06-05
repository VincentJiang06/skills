# Skyline → WebView migration map (evidence-bound)

Per-feature correspondence distilled from the on-disk `skyline-*` skills. Every
`rewrite` verdict traces to a source that documents the feature as
**Skyline-exclusive**; every `keep` traces to a source confirming the workaround
**still renders under WebView**. Distilled and cited — never copied.

This file is the authority behind the scanner's `category → action` mapping
(`scripts/scan.mjs`) and the generator's general table
(`scripts/gen_migration_map.mjs`). A category is `rewrite` **only** if a source
below marks it Skyline-only.

## Sources (read for exact behavior)

| id | path |
|---|---|
| S-OVERVIEW | `~/.agents/skills/skyline-overview/references/migration/compatibility.md` |
| S-COMPONENT | `~/.agents/skills/skyline-overview/references/introduction/component-support.md` |
| S-CONFIG | `~/.agents/skills/skyline-config/references/app-config.md` |
| S-WXSS | `~/.agents/skills/skyline-wxss/` |
| S-ROUTE | `~/.agents/skills/skyline-route/SKILL.md` |
| S-WORKLET | `~/.agents/skills/skyline-worklet/SKILL.md` |

## Config (→ mechanical / keep)

| Skyline config | WebView | Action | Evidence |
|---|---|---|---|
| `renderer: "skyline"` | `renderer: "webview"` (the default) | **mechanical** (the core flip) | S-CONFIG: renderer 可选值 webview(默认)/skyline |
| page-level `renderer` override | reconcile per page | **mechanical** (distinct per page) | S-OVERVIEW FAQ: Skyline 支持按页面/分包粒度开启 → page json carries its own renderer |
| `componentFramework: "glass-easel"` | supported on WebView | **keep** | S-CONFIG: glass-easel 是 Skyline 必需；WebView 亦支持 glass-easel |
| `rendererOptions.skyline.*` (defaultDisplayBlock / defaultContentBox / disableABTest / tagNameStyleIsolation) | ignored by WebView | **keep** (or strip) | S-CONFIG: rendererOptions 嵌套在 rendererOptions.skyline 下，仅 Skyline 读取 |
| `window.navigationStyle: "custom"` | native nav available, custom still works | **keep** | S-CONFIG: Skyline 必须 custom；WebView 两者皆可，保持一致就 keep |

## Hard Skyline-only features (→ rewrite — no WebView equivalent)

| Skyline feature | WebView replacement | Evidence (Skyline-exclusive) |
|---|---|---|
| **worklet** animation (`wx.worklet`, `applyAnimatedStyle`, `runOnUI`, `runOnJS`, `useSharedValue`, `Easing`, `timing/spring/decay`) | `wx.createAnimation` / CSS animation / `this.animate()` | S-OVERVIEW 速查表: "animate 接口 ❌ → worklet 动画" (inverse: worklet is the Skyline-only path); S-WORKLET (whole skill is Skyline worklet system) |
| **custom route** (`routeBuilder`, `wx.router`, `wx://`, `open-container`, `customRoute`) | default page transitions | S-ROUTE (whole skill: 自定义路由 routeBuilder / 预设路由 wx:// / open-container are Skyline-only) |
| `<span>` (inline text+image mix) | `flex` layout / `rich-text` | S-COMPONENT "Skyline 新增组件 → span" |
| `<grid-view>` | `display: grid` | S-COMPONENT "Skyline 新增组件 → grid-view"; S-OVERVIEW 速查表 "display: grid ❌ → grid-view 组件" |
| `<sticky-header>` / `<sticky-section>` | `position: sticky` | S-COMPONENT "Skyline 新增组件"; S-OVERVIEW 速查表 "position: sticky ❌ → sticky-header 组件" |
| `<list-view>` | plain children under `scroll-view` | S-COMPONENT "Skyline 新增组件 → list-view (scroll-view type=list 的直接子节点)" |
| `<nested-scroll-header>` / `<nested-scroll-body>` | nested scroll containers / movable-view | S-COMPONENT "Skyline 新增组件" |
| `<draggable-sheet>` | `page-container` / movable-view sheet | S-COMPONENT "Skyline 新增组件 → draggable-sheet (半屏可拖拽)" |
| `<snapshot>` | canvas snapshot APIs | S-COMPONENT "Skyline 新增组件 → snapshot (WXML→图片)" |
| `*-gesture-handler` (tap / double-tap / long-press / pan / scale / horizontal-drag / vertical-drag / force-press) | `bindtap` / touch events / movable-view | S-COMPONENT "手势组件" table (all Skyline-only) |

> Why these are `rewrite` and not `keep`: each is a Skyline **component or API
> that does not exist under WebView** — leaving it in place yields a blank/broken
> node, unlike a CSS workaround which merely becomes unnecessary. The scanner
> flags **every occurrence** and must not silently drop one: concretely, **one
> finding per matching source line** for the JS/TS API patterns (`worklet`,
> `custom_route`) and **one finding per opening tag** for the WXML element /
> `<open-container>` patterns — a file with N distinct worklet lines yields N
> worklet findings, never a single collapsed one. (Dedupe is per-line only:
> two matches on the same line → one finding for that line.) See the granularity
> column in `references/scanner-contract.md`.
>
> Precision: the worklet **WEAK** tokens (`Easing`, bare `timing(`/`spring(`/`decay(`)
> are names a generic charting/animation lib reuses, so they count **only when the
> same file also carries a STRONG, Skyline-exclusive signal** (`wx.worklet`, a
> `'worklet'` directive, `applyAnimatedStyle`, `runOnUI`, `runOnJS`,
> `useSharedValue`). A file with only the weak names and no strong signal yields
> **zero** worklet findings (no phantom rewrite). The gate is file-level, so a
> bare `spring()` line in a strong-signal file still counts per occurrence.

## Skyline-era workarounds (→ keep — still render under WebView)

A mature Skyline program adopts these to cope with Skyline's stricter subset.
Under WebView the native feature is available again, but the workaround **still
renders identically**, so consistency-first migration keeps it.

| Workaround | Why it was needed (Skyline limitation) | Under WebView | Action | Evidence |
|---|---|---|---|---|
| `box-shadow: 0 0 0 Npx` as a border | S-WXSS: limited `border-style` support | `border` works; box-shadow also works | **keep** | S-WXSS (border-style support notes) |
| `word-break: break-all` | no `overflow-wrap: anywhere` | `overflow-wrap` works; `word-break` also works | **keep** | S-WXSS (white-space / wrap support) |
| flex + explicit width instead of `display: grid` | S-OVERVIEW 速查表: "display: grid ❌" | `display: grid` works; flex also works | **keep** | S-OVERVIEW 速查表 |
| `scroll-view type="list"/"custom"` | S-COMPONENT: scroll-view 需显式 `type="list"` | `type` ignored; still scrolls; `enhanced` available | **keep** (no redundant `enhanced` suggestion if present) | S-COMPONENT (scroll-view) |
| `backdrop-filter` | (kept across both) | supported | **keep** | S-WXSS (filter/mask support) |
| precomputed template flags (no `&&`/`?:`/`!` in `wx:if`) | Skyline WXML operator limits | operators allowed; precompute still works | **keep as-is** (not separately flagged by the scanner — "this is a precomputed flag" is not reliably detectable statically) | S-COMPONENT / WXML notes |
| custom navigation (`navigationStyle: "custom"`) | S-OVERVIEW FAQ: Skyline 无原生导航栏 | native nav available; custom still works | **keep** | S-OVERVIEW FAQ |

## Ambiguous (→ verify — behavior MAY differ; confirm before/after)

| Pattern | Why uncertain | Action | Evidence |
|---|---|---|---|
| camera tap-mask wrapper (a mask `<view>` over `<camera>`) | event bubbling / same-layer rendering differs between renderers; the mask may stop intercepting taps | **verify** (vince-mp before/after; fix only a real delta) | S-COMPONENT (camera 原生组件同层渲染 differs); field workaround |

## How the scanner uses this file

- `worklet`, `custom_route`, `skyline_component` → **rewrite** (rows in "Hard
  Skyline-only features").
- `box_shadow_border`, `word_break`, `flex_grid_workaround`, `scroll_view_type`,
  `backdrop_filter` → **keep** ("workarounds"). Precomputed template flags are
  also kept as-is, but the scanner emits **no** `template_precompute` category for
  them (not reliably detectable statically) — see scanner-contract.md.
- `renderer_flip`, `page_renderer_override` → **mechanical**; `component_framework`,
  `renderer_options` → **keep** ("config").
- `camera_mask` → **verify** ("ambiguous").
