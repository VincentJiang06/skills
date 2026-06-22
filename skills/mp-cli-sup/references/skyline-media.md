# Skyline and Media Workflow

For Skyline snapshot, Canvas, Camera, or media-mock tasks.

## Skyline renderer reference (official skills)

This skill only covers *debugging* a Skyline page through `vince-mp`. For renderer behavior — why
`$$` enumeration hangs, what components/CSS are supported, scroll/route/worklet specifics — defer to
the official WeChat Skyline skills **if they are available in your environment**, invoking the matching one:

- `skyline-overview` — architecture, migration, when a page is Skyline vs WebView.
- `skyline-config` — `app.json`/page `renderer`, `rendererOptions`, `componentFramework`.
- `skyline-components` — scroll-view, swiper, forms, draggable sheets, shared-element transitions.
- `skyline-scroll-api` / `skyline-worklet` — programmatic scroll, SharedValue/worklet animations.
- `skyline-route` — custom routes / page transitions (half-screen, open-container).
- `skyline-wxss` — supported CSS properties and limitations.

When a Skyline page misbehaves (layout, scroll, animation, route), read the relevant official skill
(if installed) for the renderer contract, then use `vince-mp` (pageData / snapshot / screenshot) to
gather evidence.

## Skyline snapshot

Skyline/native pages may allow route/pageData reads while element enumeration hangs.

1. `vince-mp session start`, then `vince-mp data` / `stack` — route + pageData are valid partial evidence.
2. Only when uid interaction is needed, run one bounded `vince-mp snapshot <selector>` (concrete
   selector, not `*`).
3. On `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`, stop uid actions and report snapshot as the blocker;
   keep route/pageData/full-screenshot evidence.

## Camera-less scan (scanners)

DevTools/webview has no real Skyline camera preview, so the scan/decode path can't run from a real
camera. Drive it without hardware via the page's scan handler:

```bash
vince-mp scan PKG-2026-0605 --type qrcode            # onScanCode({type:"scancode",detail:{result,scanType,type:scanType}})
vince-mp scan 123 --method onDecodeResult            # custom handler name; add --raw for legacy {result,scanType}
```

**Preconditions:** be on the scanner page (`vince-mp page` to confirm the route) and know the handler
name — default `onScanCode`; if the page binds e.g. `bindscancode="handleScan"`, pass
`--method handleScan`. A wrong handler name or wrong current page returns a `callPageMethod` error or
a silent no-op, not a scan.

Then read the effect with `vince-mp data` (e.g. the new record / `latest`). This is the supported
way to smoke a scanner; real-camera frames still require a device.

## Canvas / Camera / media (one-shot `media`, or via the session `step`)

```bash
vince-mp media --connect '<json>' --action install --json
vince-mp media --connect '<json>' --action list --target canvas --json
vince-mp media --connect '<json>' --action canvas-export --canvas-id main --json
vince-mp media --connect '<json>' --action canvas-sample --canvas-id main --json
vince-mp media --connect '<json>' --action camera-probe --json          # metadata-only default
vince-mp media --connect '<json>' --action camera-mock --fixture-image fixtures/camera.png --json
vince-mp media --connect '<json>' --action restore --json
# In a session, the same actions route via: vince-mp step '{"type":"mediaAction","action":"camera-probe"}'
```

Prefer API-event evidence, snapshot temp path, and pixel checksum. If the runtime lacks
`canvasToTempFilePath`/`canvasGetImageData`, report unsupported/partial evidence rather than retrying
blindly. Camera mock is an explicit, reversible side effect — require a fixture/mock config and
`restore` after. Do not collect real photos/frames unless the user explicitly asks and the report
states capture was enabled.
