# CLI Contract

Backend command:

```bash
vince-mp <command> --json
```

`vince-mp` must be installed as a system npm package, for example from the local package source with `npm install -g /Users/vince/playground/skill-developer/vince-mp-cli`. The CLI is short-lived. For multi-step runtime work, use one `run` workflow so the same automator connection owns query/snapshot uid state.

## Commands

- `doctor --project <path> --workspace-root <path> --json`
- `capabilities --json`
- `smoke-existing --ws-endpoint <ws> [--probe-elements] --json`
- `run --connect '<json>' --stdin --json`
- `screenshot --connect '<json>' --output <path> --json`
- `media --connect '<json>' --action <install|list|canvas-export|canvas-sample|camera-probe|camera-mock|restore> --json`

## Connection JSON

Attach, non-invasive:

```json
{"mode":"attach","wsEndpoint":"ws://127.0.0.1:9420"}
```

Launch, explicit side effect:

```json
{"mode":"launch","projectPath":"/absolute/workspace/project","port":9420}
```

`attach` must not include `projectPath`. `launch` must include `projectPath` and may open or focus DevTools.

## Workflow JSON

```json
{
  "connect": {"mode":"attach","wsEndpoint":"ws://127.0.0.1:9420"},
  "steps": [
    {"type":"currentPage"},
    {"type":"pageStack"},
    {"type":"pageData","maxJsonBytes":20000},
    {"type":"snapshot","timeoutMs":3000,"maxElements":50}
  ],
  "options": {"continueOnError": false}
}
```

Supported step types:

`currentPage`, `pageStack`, `pageData`, `systemInfo`, `appGlobalData`, `launchOptions`, `navigateTo`, `reLaunch`, `switchTab`, `wait`, `query`, `snapshot`, `tap`, `longpress`, `input`, `elementText`, `elementValue`, `elementAttribute`, `elementProperty`, `elementTrigger`, `elementScreenshot`, `callWxMethod`, `mockWxMethod`, `restoreWxMethod`, `storageGet`, `storageSet`, `storageRemove`, `storageClear`, `setPageData`, `callPageMethod`, `pageSize`, `scrollTop`, `pageScrollTo`, `evaluate`, `screenshot`, `startConsole`, `listConsole`, `clearConsole`, `networkInstall`, `networkList`, `networkClear`, `networkRestore`, `mediaInstall`, `mediaList`, `mediaAction`.

Single element screenshot workflow:

```json
{
  "connect": {"mode":"attach","wsEndpoint":"ws://127.0.0.1:9420"},
  "steps": [
    {"type":"query","selector":".target","includePosition":true,"timeoutMs":3000},
    {"type":"elementScreenshot","uid":"view_0","output":"captures/target.png","padding":4}
  ]
}
```

`elementScreenshot` writes only to the explicit `output` path under `--workspace-root`. It depends on a fresh uid from `query` or `snapshot`, then takes a full runtime screenshot and crops by `offset()`/`size()`. On Skyline pages where element enumeration or geometry hangs, report the bounded query/snapshot error instead of guessing a rectangle.

## Error Contract

All failures use:

```json
{"ok":false,"code":"ERROR_CODE","message":"...","details":{},"suggestions":[]}
```

Key codes:

- `PATH_OUTSIDE_WORKSPACE`: path escaped `--workspace-root`.
- `UNSAFE_CONNECTION_MODE`: attach/launch contract was violated.
- `AUTOMATOR_CONNECT_FAILED`: DevTools automation connection failed.
- `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`: element enumeration timed out, common on Skyline.
- `STALE_OR_UNKNOWN_UID`: uid was reused after mutation/navigation or never queried.
- `UNSAFE_WX_METHOD`: `callWxMethod` is not in the read-only allowlist.
- `ELEMENT_GEOMETRY_UNAVAILABLE`: element screenshot cannot read `offset()`/`size()`.
- `ELEMENT_SCREENSHOT_BOUNDS_INVALID`: computed element crop rectangle is outside the screenshot.
- `STORAGE_CLEAR_REQUIRES_CONFIRMATION`: `storageClear` was requested without `confirm:true`.
- `CAMERA_MOCK_REQUIRES_FIXTURE`: camera mock was requested without explicit fixture/mock config.

## Safe Defaults

- No implicit launch.
- No implicit relaunch.
- No implicit network/canvas/camera instrumentation.
- No implicit file writes.
- No implicit Camera frame/photo capture.
