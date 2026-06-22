# Evidence and Known Failures

Backend-independent edge cases for live `vince-mp` debugging.

## Connecting (session start)

- `session start` does the whole connect: resolve project (`miniprogramRoot`-aware, so app.json
  under `miniprogram/` is fine — no more spurious `INVALID_PROJECT`), ensure the automation port,
  attach. An already-live port is reused, never re-spawned (no "port in use" fight).
- `attach` = `automator.connect({ wsEndpoint })`; it never falls back to launch. `launch` /
  `cli auto` may open or focus DevTools — a connect-time side effect, only when ensuring the port.
- A DevTools page-URL `autoPort` parameter is not automatically the automation WebSocket — let
  `session start` resolve/verify it.
- `AUTOMATION_PORT_TIMEOUT`: `cli auto` ran but the port never answered → enable DevTools 安全设置 →
  服务端口 (CLI/HTTP automation), confirm the project opens. `WECHAT_CLI_NOT_FOUND` → pass
  `--cli-path` or set `WECHAT_DEVTOOLS_CLI`.
- **`APP_NOT_RUNNING`** (fast, ~8s — not a hang): reads got no current page because the app isn't
  running in the simulator. Almost always a build/startup error (e.g. "模拟器启动失败 … Cannot read
  property 'subPackages' of undefined" = a stale/broken build). Run `vince-mp doctor` and fix the
  build (`npm run build:devtools` for TS projects); do not retry blindly.

## Session lifetime and uids

- One background daemon per workspace holds ONE connection; commands reuse it (near-instant) and the
  element map (uids) lives in the daemon, so **uids persist across separate CLI calls**.
- A uid is stale only after navigation (`nav`/`reLaunch`/`switchTab`) or a node-replacing mutation —
  re-query then. `STALE_OR_UNKNOWN_UID` means re-query.
- A dead daemon's stale socket/meta is auto-detected and cleaned; the next command restarts a
  session. `session status` shows whether one is live; `STEP_TIMEOUT` means a single step exceeded
  the daemon backstop (unresponsive app/connection).
- A dropped connection (DevTools closed/restarted) auto-reconnects once on the next step and retries
  it (uids reset — re-query); `session reconnect` forces it. If reconnect fails → `SESSION_CONNECTION_LOST`.
- Without a session (`--no-session` / a one-shot `run`), uid state lives only for that one process.

## Snapshot

- `snapshot`/`query` reads are batched (parallel, bounded concurrency) — fast even for many elements.
- Skyline/native pages may allow route/pageData reads while element enumeration hangs;
  `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT` blocks uid actions but does NOT invalidate route/pageData.
- The universal `*` selector is unsupported on some renderers (`SNAPSHOT_ELEMENT_ENUMERATION_FAILED`)
  — pass a concrete selector.

## Console and network

- The session auto-captures console from start (buffered; the message and exception buffers are EACH capped at the most recent 1000) — `console`
  lists it, `console --clear` resets it. It only has output since the session started.
- WeChat automation re-delivers each `console.log` several times (5–8×); the CLI coalesces identical
  messages arriving back-to-back so one log = one entry. Distinct or time-separated logs are kept; to
  count rapid identical repeats, put a counter in the log text.
- Network monitoring is NOT auto-injected; `networkInstall` must precede the observed request, and any
  report must state that earlier requests are unavailable. Never claim console/network evidence from a
  prior non-CLI run as current.
- Network recipe (there is **no** `network` shorthand — use `step`/`run`):
  `vince-mp step '{"type":"networkInstall"}'` → trigger the request (tap/nav) →
  `vince-mp step '{"type":"networkList"}'` → `vince-mp step '{"type":"networkRestore"}'`.
  Requests fired before `networkInstall` are invisible.

## Doctor — "green tests but broken build"

`doctor` is the pre-debug health check: it runs the project's `tsc --noEmit`, flags `.ts` files newer
than their committed `.js` sibling (DevTools runs the `.js`; a newer `.ts` means a missing rebuild),
and surfaces the selected backend domain + LAN IPv4. A passing `npm test` that regex-matches `.ts`
can hide a non-compiling/stale build — trust `doctor` (tsc + freshness), not just the test runner.

## Cross-stack (env / logs)

- `env use <key>` switches the named backend (mockLan/caoliaoDevNet/caoliaoProdIm = mock/.net/.im).
- `logs --request-id <id>` pulls the matching server error log (needs an admin token via
  `VINCE_MP_ADMIN_TOKEN` or `env token`). `--user-id` filters by account; `BACKEND_UNREACHABLE`
  means the env isn't deployed/reachable, `ADMIN_TOKEN_REQUIRED` means no token is set.
