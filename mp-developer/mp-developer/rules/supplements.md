# Supplements — the merge's added value on top of the official tools

The official `wechatide` surface covers project/automation/cloud/compile/preview/debug. These
supplements add what it lacks, all **without a wrapper CLI**: a cross-stack `doctor` preflight
(a script), and two automation recipes (camera-less scan, canvas/Skyline capture) expressed as
official-tool sequences. Renderer caveats for all of this live in `references/renderer-awareness.md`.

## 1. `doctor` — cross-stack preflight (script, no automator)

`check_devtools_status` tells you DevTools is connected; it does **not** tell you the project actually
builds. `doctor` is the static pre-flight that does — before you waste a debugging session on a project
that won't compile:

```bash
node scripts/doctor.mjs --project <projectDir>        # add --skip-typecheck to skip tsc
node scripts/doctor.mjs --self-test                   # prove each check discriminates
```

Checks: node version · project resolves (via `project.config.json` `miniprogramRoot`, so a
`miniprogram/`-subdir layout works) · `tsc --noEmit` (if the project is TypeScript) · `.ts`/`.js`
freshness (stale compiled output is a classic "my change didn't take" cause) · local LAN IPv4
(for real-device debugging on the same network). Pure Node/shell — no DevTools connection, no automator.

It is a **static** preflight: it does not test the live automation port, so it cannot diagnose a
connect/auth failure — for that, read the `check_devtools_status` result (see `references/debug-discipline.md`).

## 2. Camera-less scan (drive a scanner page without hardware)

DevTools/WebView has no real camera, so a scan/decode flow can't run from a live camera. Drive the page's
own scan handler through the official automation tools instead of faking camera frames:

```bash
# Confirm you are on the scanner page first:
wechatide -c Claude -t automation_runtime_info --project <p> --action currentPage
# Call the page's scan handler with a scancode-shaped event (default handler name onScanCode):
wechatide -c Claude -t automation_page_action --project <p> --action callMethod \
  --method onScanCode --args-file scan-event.json
```

`scan-event.json` (the shape a real `bindscancode`/scan handler expects):

```json
[ { "type": "scancode", "detail": { "result": "PKG-2026-0710", "scanType": "QR_CODE", "type": "QR_CODE" } } ]
```

Preconditions & caveats:
- Be on the scanner page and know the **handler name** — default `onScanCode`; if the page binds e.g.
  `bindscancode="handleScan"`, use `--method handleScan`. A wrong handler/page is a `callMethod` error or a
  silent no-op, not a scan.
- `callMethod` resolves on the handler's **synchronous** return, not its async `wx.request`→`setData` — settle
  (`automation_page_action --action waitFor`) then read the effect with `getData`. This smokes a scanner in
  DevTools; real-camera frames still need a device.
- If the handler is not a page method but a component method, scope via the component host element instead
  (`automation_element_action --action callMethod`).

## 3. Canvas / media capture

No black-box canvas primitive exists — capture via `automation_viewport_action --action screenshot`
(simulator only) or drive the app's own `wx.canvasToTempFilePath` through `automation_page_action callMethod` /
`automation_evaluate` and read the temp file. Full recipe + the Canvas-2D node caveat and the
"`<camera>`/`CameraContext` are unmockable" rule are in `references/renderer-awareness.md` (§Canvas, §Camera).

## What is intentionally NOT here

- **草料-specific `env`/`logs`** (backend-env switch + `requestId` server-log pull) were removed from this
  general skill — they belong to the private `mp-cli-sup`, not a general MP developer skill.
- **A wrapper CLI / persistent-uid session** — moot under Door A (the IDE holds the connection; automation is
  selector-based). See `references/two-transports.md`.
