# Renderer awareness — Skyline vs WebView under automation

The single thing no other WeChat MP automation tool does: **know the page's renderer before you
automate or capture it.** Skyline (glass-easel) and WebView behave differently under the official
`automation_*` tools. Getting this wrong produces empty queries, blank screenshots, and false
"element not found" conclusions.

## Detect the renderer first

- Read `app.json` / the page's `.json` for `"renderer": "skyline"` and `componentFramework: "glass-easel"`,
  or check per-page `renderer` overrides. Default (absent) = WebView.
- At runtime, `wechatide -c Claude -t automation_runtime_info --project <p> --action systemInfo` and inspect
  the rendering-backend fields; or `automation_evaluate` a probe. When unsure, treat layout/scroll/animation
  anomalies as Skyline-first.
- For a Skyline→WebView migration itself, that is a different skill (`mp-groundline`); this file is about
  *debugging* either renderer live.

## Skyline automation gotchas (glass-easel)

1. **Custom-component boundary is hard.** `automation_page_action --action querySelector/querySelectorAll`
   cannot cross into a custom component. Query the component host first, then scope the sub-query inside it
   (`automation_element_action` on the host). Skyline UIs lean heavily on custom components, so "query
   returns empty" is usually a boundary issue, not a bad selector.
2. **Query before render = empty/timeout.** Enumeration on a not-yet-rendered glass-easel subtree returns
   empty or times out. Always `automation_page_action --action waitFor --selector <sel>` (or a condition)
   **before** querying. Treat "empty on a Skyline page" as boundary/timing, never a broken selector.
3. **Worklet state is invisible.** Worklet-thread animation/gesture values are not in the JS/AppService node
   tree — you cannot read animated positions or worklet-computed values via `element property/data`, and
   `createSelectorQuery`/`boundingClientRect` may not resolve inside a worklet. Report worklet-driven values
   as unmeasurable, not "zero".
4. **Simulator vs device divergence.** Some Skyline behaviors, share-poster rendering, and `image`/`snapshot`
   rasterization render in DevTools but differ or fail on device. Since `screenshot` is simulator-only,
   the one place you can capture pixels is the one place Skyline may render unlike the device — caveat every
   Skyline screenshot accordingly.

## Screenshots

- `wechatide -c Claude -t automation_viewport_action --action screenshot` requires `--wait-for-selector`
  **or** `--wait-seconds`; prefer `--wait-for-selector` at a selector that proves the page rendered.
- **Simulator only.** On a real device (after `automation_viewport_action --action remote`) `screenshot` is
  unavailable ("client unavailable"). For on-device pixels, go through the app's own canvas/snapshot export
  (below) and read the produced file.
- Long pages: capture at the section selector you care about rather than assuming a full-height stitch.

## Canvas capture (no black-box primitive)

There is no automation canvas-export tool. Two real paths:

1. **Whole-page pixels:** `automation_viewport_action --action screenshot` (simulator only, see above).
2. **App-side export (works on device):** drive the page/component's own `wx.canvasToTempFilePath` via
   `automation_page_action --action callMethod` or `automation_evaluate`, producing a temp file, then read it.
   For Canvas 2D you must first get the node via `createSelectorQuery().select(...).fields({node:true,size:true})`
   and pass `canvas` (not the legacy `canvasId`); the export must run inside the `draw()`/after-render callback
   or it exports blank. This is app-cooperative, not a capture of an arbitrary canvas.

## Camera and media mocking

- `automation_wx_api --action mock` overrides the **result of a `wx.*` method** — so media *pickers*
  (`wx.chooseMedia` / `wx.chooseImage` / `wx.chooseVideo`) are mockable to return fixture temp files.
- **The live `<camera>` component and `CameraContext.takePhoto()` are native-component/context methods, not
  `wx.*` methods, so they are NOT interceptable.** There is no supported path to feed synthetic camera frames.
  For scanner/camera flows, mock the picker or drive the page's scan handler directly (see camera-less scan in
  `rules/supplements.md`); do not promise live-camera automation.

## Async settle (both renderers)

Any automation whose handler does async work (`tap`/`input`/scan/`callMethod` → `wx.request` → `setData`)
returns when DevTools **dispatches** the call, not when the async effect lands. `waitFor` (or re-poll page
data / network) **before** reading the effect — whether the read is page data, a network entry, or a media file.
