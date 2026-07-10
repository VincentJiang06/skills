# Supplements — what this skill adds on top of the official tools

The official `wechatide` surface covers project/automation/cloud/compile/preview/debug. These
supplements add what it lacks, all **without a wrapper CLI**: a routing/discipline self-check, a
cross-stack `doctor` preflight, and two automation recipes (camera-less scan, canvas capture)
expressed as official-tool sequences. Renderer caveats for all of this: `references/renderer-awareness.md`.

## 1. `lint_request` — routing / tool-name / discipline self-check (script)

Before acting on a request, sanity-check the routing, that any tool you're about to call is real, and
which discipline rules apply:

```bash
node scripts/lint_request.mjs "把小程序从 skyline 迁移到 webview"        # → OUT: route to mp-groundline
node scripts/lint_request.mjs "点一下提交按钮" --tool automation_tap     # → automator; tool INVALID → automation_element_action
node scripts/lint_request.mjs --json "刷新模拟器后就算编译通过了吧"       # → discipline: refresh-not-compile
```

It returns `{scope, lane, redirect_to, backend, tool_check, discipline_flags}` — validating tool names
against the authoritative `tools.yaml` and flagging out-of-scope redirects + discipline slips (each flag
→ its rule in `references/debug-discipline.md`). When `--tool <name>` is a valid tool it also attaches that
tool's **guardrail** from `references/tool-guardrails.json` (one entry per all 41 tools):
`side_effect` (read/write/confirm) · `preconditions` · `common_mistakes` · `verify` · `failure`. Consult it
before every tool call — especially honor `side_effect` (write/confirm ⇒ the side effect must be explicitly
requested; `confirm` ⇒ a DevTools/user confirmation, stop-and-wait). It is an **advisor, not the router**:
you still reason; it reliably catches the known hazard patterns, it does not classify every possible phrasing.

## 2. `doctor` — cross-stack build/env preflight (script, no automator)

`check_devtools_status` tells you DevTools is connected; it does **not** tell you the project builds.
Run `doctor` before wasting a debugging session on a project that won't compile:

```bash
node scripts/doctor.mjs --project <projectDir>        # add --skip-typecheck to skip tsc
node scripts/doctor.mjs --self-test                   # prove each check discriminates
```

Checks: node · project resolves (via `project.config.json` `miniprogramRoot`, so a `miniprogram/`-subdir
layout works) · `tsc --noEmit` (if TypeScript) · `.ts`/`.js` freshness (stale compiled `.js` is a classic
"my change didn't take" cause; `.d.ts` excluded) · local LAN IPv4 (real-device same-network debugging).
Pure Node/shell — no DevTools connection, no automator. It is **static**: it does not test the live
automation port, so it cannot diagnose a connect/auth failure (read `check_devtools_status` for that).

## 3. Camera-less scan (drive a scanner page without hardware)

DevTools/WebView has no real camera. Drive the page's own scan handler via official automation instead
of faking camera frames:

```bash
wechatide -c Claude -t automation_runtime_info --project <p> --action currentPage   # confirm the scanner page
wechatide -c Claude -t automation_page_action --project <p> --action callMethod \
  --method onScanCode --args-file scan-event.json
```

`scan-event.json` (the shape a real scan handler expects):

```json
[ { "type": "scancode", "detail": { "result": "PKG-2026-0710", "scanType": "QR_CODE", "type": "QR_CODE" } } ]
```

Caveats: be on the scanner page and know the **handler name** (default `onScanCode`; a page binding
`bindscancode="handleScan"` → `--method handleScan`). `callMethod` resolves on the handler's *synchronous*
return, so settle (`automation_page_action --action waitFor`) then read the effect with `getData`. A
component-method handler is scoped via `automation_element_action --action callMethod` on the host.

## 4. Canvas / media capture

No black-box canvas primitive exists — capture via `automation_viewport_action --action screenshot`
(simulator only) or drive the app's own `wx.canvasToTempFilePath` through `automation_page_action callMethod`
/ `automation_evaluate` and read the temp file. Full recipe + the Canvas-2D node caveat and the
"`<camera>`/`CameraContext` are unmockable" rule: `references/renderer-awareness.md` (§Canvas, §Camera).

## Intentionally NOT here

- **草料-specific `env`/`logs`** — removed; they belong to the private `mp-cli-sup`.
- **A wrapper CLI / persistent-uid session** — moot under Door A (`references/two-transports.md`).
