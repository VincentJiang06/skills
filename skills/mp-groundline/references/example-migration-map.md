# Example MIGRATION-MAP excerpt (documentation)

A trimmed excerpt of what `gen_migration_map.mjs` emits, from a real clean
Skyline program (zero hard features). The live doc is generated per-project at
use time — this is only an illustration of the shape. **Do not** treat it as a
fixture; the real output is not committed into the skill.

```markdown
# MIGRATION-MAP — Skyline → WebView

- **miniprogramRoot:** `miniprogram/`
- **Current renderer:** `skyline`
- **Status:** on Skyline — migration flips the renderer to WebView, keeps
  workarounds, and surfaces rewrite items below.

- **Summary:** mechanical 1 · keep 38 · verify 1 · **rewrite 0** · total 40

## 1. Config diff (`app.json`)

| Field | Current (Skyline) | After (WebView) | Action |
|---|---|---|---|
| renderer | `skyline` | `webview` | **flip** |
| componentFramework | `glass-easel` | `glass-easel` | keep (glass-easel ok on WebView) |
| rendererOptions.skyline | present | ignored | keep or strip |
| window.navigationStyle | `custom` | `custom` | keep |

## 3. Manual-review gate — REWRITE items

None. This program has **zero** hard Skyline-only features — a clean
mechanical migration.

## 4. Findings (one row per detected usage)

| File:Line | Category | Action | Snippet | Debug note |
|---|---|---|---|---|
| miniprogram/app.json:19 | renderer_flip | mechanical | `"renderer": "skyline"` | Flip app-level renderer "skyline" → "webview" … |
| miniprogram/pages/scan/index.wxml:75 | camera_mask | verify | `class="scan-pause-mask…"` | taps may bubble differently — verify before/after with vince-mp … |
| miniprogram/pages/home/index.less:177 | box_shadow_border | keep | `box-shadow: 0 0 0 1px @border-color-base;` | border-style workaround; keep for visual consistency … |
| miniprogram/pages/workflow/index.less:466 | word_break | keep | `word-break: break-all;` | overflow-wrap workaround; still renders — keep … |
| miniprogram/pages/home/index.wxml:12 | scroll_view_type | keep | `<scroll-view type="custom" scroll-y …>` | `type` ignored under WebView — keep unchanged … |
```

When the program DOES carry a hard feature, section 3 lists each Skyline-exclusive
usage (file:line + the rewrite target) as a manual-review gate, e.g.:

```markdown
## 3. Manual-review gate — REWRITE items

2 Skyline-exclusive usage(s) need a manual rewrite (no WebView equivalent):

- **miniprogram/pages/anim/index.js:6** `const offset = wx.worklet.shared(0);` —
  Skyline worklet animation — rewrite with wx.createAnimation / CSS animation.
- **miniprogram/pages/feed/index.wxml:2** `<grid-view>` — Skyline-exclusive —
  rewrite to `display: grid`.
```
