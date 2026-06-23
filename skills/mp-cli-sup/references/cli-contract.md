# CLI Contract

Backend command (installed npm package; `npm install -g <vince-mp-cli pkg>`):

```bash
vince-mp <command> [args] --json
```

Common flags: `--json`, `--workspace-root <dir>`, `--port <n>` (automation port, default 9420),
`--no-session` (force a one-shot connect instead of the session).

## Session lifecycle (the primary path)

```bash
vince-mp session start [--port 9420] [--connect '<json>'] [--idle-timeout-ms <ms>]
vince-mp session status        # running? connection, uptime, uidCount, reconnects, currentPage
vince-mp session stop          # disconnect + remove socket
vince-mp session restart
vince-mp session reconnect     # force a fresh attach (uids reset); also happens automatically on a dropped connection
```

`session start` resolves the project from `project.config.json` `miniprogramRoot`, ensures the
automation port is live (spawns `cli auto --project <root> --auto-port <port>` only if it isn't —
already-live ports are reused, never re-spawned), attaches, and leaves a background daemon holding
ONE connection. A per-workspace Unix socket lives under `~/.vince-mp/sessions/`; the daemon
idle-reaps itself. Every later command auto-starts a session if none is running.

## Read / act shorthands (route through the session)

| Command | Step built | Notes |
|---|---|---|
| `page` / `stack` | currentPage / pageStack | route + page stack |
| `data [path]` | pageData | 200KB cap for shorthand reads (not the generic ~20KB JSON truncation), reported via `truncated`; `--max-bytes` to override |
| `sysinfo` | systemInfo | |
| `query <sel> [--all] [--position]` | query | mints uid(s) like `view_0`; `--all` for multiple |
| `snapshot [<sel>] [--position] [--max-elements n]` | snapshot | batched reads; concrete selector (`*` is unsupported on some renderers); `--max-elements` caps enumeration; **resets the uid map** (re-numbers uids — `query` appends) |
| `tap <uid>` / `input <uid> <text>` | tap / input | uid from a prior query/snapshot; valid across calls in a session |
| `eval '<js expr>'` | evaluate | wraps as `function(){ return (<expr>); }` |
| `scan <code> [--type qrcode] [--method onScanCode] [--raw]` | callPageMethod | camera-less: calls the page's scan handler (default `onScanCode`) with a `{type:"scancode", detail:{result, scanType, type:scanType}}` event object; `--raw` sends the legacy `{result, scanType}` shape |
| `shot <output>` | screenshot | full-page PNG under `--workspace-root` — the SESSION path (the standalone `screenshot`/`media` commands are one-shot and REQUIRE `--connect '<json>'`) |
| `nav <url>` | navigateTo | navigation (invalidates uids) |
| `console [--clear] [--type log]` | listConsole/clearConsole | buffered since session start (message + exception buffers each capped 1000); needs a session — `--no-session` → `INVALID_ARGUMENT` |
| `step '<json>'` | any step | escape hatch: a step object, or an array → batch |

## Diagnose / cross-stack

```bash
vince-mp doctor [--project <dir>] [--skip-typecheck] --json
# checks: node, resolved project (miniprogramRoot-aware), wechat cli, tsc --noEmit,
#         .ts/.js freshness, selected backend domain, local LAN IPv4
vince-mp env list | current | use <key> | token <ADMIN_TOKEN>     # mockLan|caoliaoDevNet|caoliaoProdIm
vince-mp logs --request-id <id> | --user-id <id> | --code <n> [--route r] [--since t] [--limit n]
# POSTs <env.base>/admin/error-logs/list with Authorization: Bearer <token>
# token from VINCE_MP_ADMIN_TOKEN or `env token`; pull a client failure's server-side error log.
```

## One-shot / explicit-connection commands

```bash
vince-mp smoke-existing --ws-endpoint ws://127.0.0.1:9420 [--probe-elements] --json
# NOTE: --probe-elements snapshots with the universal `*` selector (no override flag), so on
# Skyline pages expect SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT/FAILED — prefer a session + a
# concrete `snapshot <selector>` there. --probe-elements is WebView-oriented.
vince-mp run --stdin --json                       # batch; routes through the session
vince-mp run --connect '<json>' --stdin --json    # one-shot with an explicit connection
vince-mp screenshot --connect '<json>' --output <path> --json
vince-mp media --connect '<json>' --action <install|list|canvas-export|canvas-sample|camera-probe|camera-mock|restore> --json
vince-mp capabilities --json                       # full manifest: commands, shorthands, sessionOps, steps
vince-mp help --json                               # command + flag reference
```

## Connection JSON

```json
{"mode":"attach","wsEndpoint":"ws://127.0.0.1:9420"}
{"mode":"launch","projectPath":"/absolute/project","port":9420}
```

`attach` must not include `projectPath`, `launch`, or `reLaunch`. `launch` includes `projectPath` and may open/focus DevTools.
`session start` always uses `attach` (it may spawn the headless `cli auto` automation server if the
port is down — the one connect-time effect); the `launch` mode that opens/focuses a DevTools project
is separate and human-gated.

## Workflow JSON (`run`)

```json
{
  "steps": [
    {"type":"currentPage"},
    {"type":"pageData","maxJsonBytes":200000},
    {"type":"query","selector":".item","all":true,"includePosition":true},
    {"type":"elementScreenshot","uid":"view_0","output":"captures/item.png","padding":4}
  ],
  "options": {"continueOnError": false}
}
```

A `run` with no `connect` (and without `--no-session`) reuses the session. A `run` that embeds its
own `connect`, or uses `--connect`, is one-shot. Supported step types:
`currentPage, pageStack, pageData, systemInfo, appGlobalData, launchOptions, navigateTo, reLaunch,
switchTab, wait, query, snapshot, tap, longpress, input, elementText, elementValue,
elementAttribute, elementProperty, elementTrigger, elementScreenshot, callWxMethod, mockWxMethod,
restoreWxMethod, storageGet, storageSet, storageRemove, storageClear, setPageData, callPageMethod,
pageSize, scrollTop, pageScrollTo, evaluate, screenshot, startConsole, listConsole, clearConsole,
networkInstall, networkList, networkClear, networkRestore, mediaInstall, mediaList, mediaAction`.

## Error contract

All failures: `{"ok":false,"code":"ERROR_CODE","message":"...","details":{},"suggestions":[]}`. Key codes:

- `INVALID_PROJECT` / `PROJECT_NOT_FOUND`: no resolvable Mini Program (check `miniprogramRoot`).
- `WECHAT_CLI_NOT_FOUND`: DevTools `cli` binary missing (`--cli-path` / `WECHAT_DEVTOOLS_CLI`).
- `AUTOMATION_PORT_TIMEOUT`: `cli auto` ran but the port never came up — enable DevTools automation/安全设置.
- `AUTOMATOR_CONNECT_FAILED`: attach to the ws endpoint failed.
- `APP_NOT_RUNNING`: no current page within the page-acquire timeout — the app isn't running in the
  simulator (build/startup error). Investigate the build, don't retry blindly.
- `SESSION_NOT_RUNNING` / `SESSION_TIMEOUT`: the daemon is gone/slow; a stale socket is auto-cleaned and re-started.
- `SESSION_CONNECTION_LOST`: the connection dropped and the auto-reconnect also failed — confirm DevTools is open, then `session restart`.
- `STEP_TIMEOUT`: a single step exceeded the daemon backstop (unresponsive connection/app).
- `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`: element enumeration timed out (common on Skyline).
- `STALE_OR_UNKNOWN_UID`: uid was used after navigation/mutation, or never queried.
- `UNSAFE_CONNECTION_MODE` / `UNSAFE_WX_METHOD` / `PATH_OUTSIDE_WORKSPACE` / `STORAGE_CLEAR_REQUIRES_CONFIRMATION`
  / `CAMERA_MOCK_REQUIRES_FIXTURE`: safety contracts (unchanged).
- `ADMIN_TOKEN_REQUIRED` / `BACKEND_UNREACHABLE` / `BACKEND_ERROR` / `UNKNOWN_ENV`: `env`/`logs` issues.

## Safe defaults

No implicit `launch`/`reLaunch` beyond `session start` ensuring the port; no implicit
network/canvas/camera instrumentation; no implicit file writes; no implicit Camera frame/photo capture.

## Read/act caps & step-only actions

- **`console`** returns the FIRST `pageSize` entries (default 50, oldest-first) of the ≤1000 buffer.
  For recent/all logs use `console --page-size 1000` or `step '{"type":"listConsole","pageIdx":N}'`.
- **Output path parent must already exist.** `shot`/`elementScreenshot`/`screenshot` write only under
  `--workspace-root`, AND the parent dir must pre-exist (the CLI does not `mkdir`) — else `PATH_NOT_FOUND`.
- **Truncation.** `eval`/`sysinfo`/`scan` cap JSON at ~200KB and IGNORE `--max-bytes` (only `data`
  honors it); on overflow the value becomes `{truncatedJsonPreview, truncated:true}` — narrow the
  expression or read via `data <path>`.
- **`nav` is `navigateTo` only.** For a tabBar page use `step '{"type":"switchTab","url":"..."}'`;
  for a full reset `step '{"type":"reLaunch","url":"..."}'`.
- **Step-only actions (no shorthand) — via `step '<json>'`:** `longpress`, `elementTrigger`,
  `elementText/Value/Attribute/Property`, `setPageData` (data must be a plain object — it MUTATES page
  state), `storageGet/Set/Remove/Clear` (Clear needs `confirm:true`), `appGlobalData`, `launchOptions`,
  `mediaAction`, `network*`. Field shapes: `setPageData {"data":{...}}` ·
  `storageSet {"key","value"}` / `storageGet|storageRemove {"key"}` ·
  `elementTrigger {"uid","eventName","detail?"}` · `elementAttribute|elementProperty {"uid","name"}` ·
  `longpress {"uid"}` · `mediaAction {"action","options?"}`.

## At-a-glance command map

A grouped index of the surface above (load this section, or the SKILL.md skeleton, when you just need the shape; the sections above hold the exact schema):

- **Session lifecycle:** `session start|status|stop|restart|reconnect` (auto-reconnects on a dropped connection; `reconnect` forces it).
- **Read (instant):** `page`, `stack`, `data [path]`, `sysinfo`, `query <sel> [--all]`,
  `snapshot <sel>`, `console [--clear]`, `eval '<expr>'`.
- **Act (uids persist):** `tap <uid>`, `input <uid> <text>`, `scan <code> [--type t] [--method m] [--raw]`,
  `shot <output>`, `nav <url>`, `step '<json>'` (any supported workflow step — see `references/cli-contract.md`), `run --stdin` (batch).
- **Diagnose / cross-stack:** `doctor [--skip-typecheck]`, `env list|use <key>|current|token <t>`,
  `logs --request-id <id> | --user-id <id> | --code <n>`.
- **One-shot / special:** add `--no-session` to any shorthand (except `console`, whose buffer lives in the session daemon) for a single connect-and-exit;
  `smoke-existing --ws-endpoint <ws>` (attach-only non-invasive); `screenshot`, `media`,
  `capabilities`, `help`.
