# vince-mp rework — design + adversarial checklist (Stage G)

**Goal (Step-1 yardstick):** Make the `vince-mp` CLI + `vince-mp-cli-sup` skill genuinely
usable for daily WeChat Mini Program dev — kill the per-call reconnect lag, collapse the
multi-step attach ceremony into one command, and add the 4 high-frequency capabilities —
verified by live WeChat DevTools debug loops.

**Live test project:** `/Users/vince/playground/deepscan-neo-demo/deep-scan-client-mp-clean`
(`miniprogramRoot: "miniprogram/"`, app.json under the subdir, TS project — the exact layout
today's `doctor`/`launch` reject with INVALID_PROJECT).

**Root causes (from CLI source + project memories):**
1. **Can't connect:** `assertProjectShape` checks `app.json` at the `--project` root → INVALID_PROJECT
   for `miniprogramRoot` layouts; a normally-open DevTools window exposes no automation port, so the
   user hand-runs `cli auto --auto-port 9420` then attaches (2-step manual recipe).
2. **Every step reconnects:** each `vince-mp` call is a short process doing connect→work→disconnect.
   No reuse; uids die per-process. Interactive loops pay the full handshake per line = "卡顿".
3. Secondary: serial per-element snapshot (~400 round-trips), pageData silent-truncates <~6KB,
   camera/scan core path can't run in the simulator.

## Architecture (new modules under vince-mp-cli/src/)
- `project-resolve.js` — resolve `{projectRoot, appRoot, appJsonPath, miniprogramRoot, appId}` from a
  workspace via `project.config.json` `miniprogramRoot`; fallback app.json search excluding
  `node_modules`, `.claude/worktrees`, `dist`, `miniprogram_npm`. **Fixes RC#1 layout.**
- `automation-port.js` — `isPortLive(host,port)` TCP probe; `ensureAutomationPort()` returns the live
  wsEndpoint, else spawns `<cli> auto --project <projectRoot> --auto-port <port>` detached, polls until
  live (bounded), returns it. **Collapses the 2-step recipe.**
- `session-context.js` — extract context factory + single-step runner from `runWorkflow` so the daemon
  and `run` share one `executeStep` path (the proven seam).
- `daemon.js` — long-lived process: resolves+connects ONCE, holds context (stable elementMap/uids),
  listens on a per-workspace Unix socket, serves step/batch/status/shutdown requests, idle-reaps,
  cleans up on signal. **Kills RC#2.**
- `client.js` — session manager: locate running daemon (meta+socket ping, clean stale), `ensureSession`
  (auto-spawn detached), `sendStep`, `stopSession`. Falls back to one-shot when `--no-session`.
- `backend.js` — env registry (mock/net/im) + persisted selection/token at `~/.vince-mp/config.json`;
  `queryErrorLogs({requestId})`, `lookupAccount({openId|uid})` over the api's admin endpoints.
- `doctor` (enhanced in commands.js) — node + resolved project (via project-resolve) + wechat cli +
  `tsc --noEmit` + `.ts/.js` freshness + selected backend domain + LAN IP.

## New CLI surface
- `session start|stop|status|restart` — daemon lifecycle.
- Shorthands routing to the session (auto-start; `--no-session` = one-shot): `page` `data [path] [--full]`
  `stack` `query <sel> [--all]` `snapshot [sel]` `tap <uid>` `input <uid> <text>` `eval <fn>`
  `shot <out>` `console [--clear]` `scan <code> [--method m] [--type t]`; generic `step '<json>'`.
- `run` — routes through the session if available (reuses connection); explicit `--connect` still works
  one-shot (backward compatible).
- `env list|use|current`, `logs <requestId>`, `account --openid|--uid`.
- `doctor`, `capabilities`, `help`, `smoke-existing`, `screenshot`, `media` — preserved.

## Prioritized actions
- **P0** (the "完全不够用/卡顿" core): project-resolve (fix INVALID_PROJECT) · automation-port ensure ·
  session daemon+client with connection reuse & stable uids · step shorthands + run-via-session ·
  backward-compat one-shot · safety/contract regression stays green.
- **P1**: camera-less `scan` · pageData no-silent-truncate default · snapshot batching · real `doctor`.
- **P2**: backend `env`/`logs`/`account`.

## Adversarial checklist (every edge → a test and/or live smoke; final battery attacks these)
1. app.json under `miniprogramRoot` subdir → resolves (no INVALID_PROJECT).
2. app.json at root (`miniprogramRoot:"."`/absent) → resolves.
3. No project.config.json → fallback app.json search excludes node_modules/.claude-worktrees/dist.
4. project.config.json `miniprogramRoot` set but app.json missing there → clear error, not silent.
5. Automation port already live → ensure returns it, does NOT spawn a 2nd `cli auto` (no port fight).
6. Port dead → spawn, poll, return; never-comes-up → bounded clear timeout error.
7. 2nd step reuses the SAME connection — no new connect side-effect, near-instant.
8. uid from snapshot/query survives across separate CLI invocations until navigation (stable uids).
9. Stale socket (daemon died) → client cleans + restarts, never hangs.
10. Idle reap — daemon self-terminates after idle timeout (no leaked процессы).
11. Concurrent requests serialize on the one connection without corrupting elementMap.
12. `session status` with no session → structured none/ok:false, not a crash; `stop` removes sock+meta.
13. pageData >20KB (scan page) not silently truncated by default; real jsonBytes + how-to-get-full shown.
14. Batched snapshot == serial summaries (correctness); one property-read failure → {unavailable}, not a whole-snapshot crash.
15. `scan <code>` builds correct callPageMethod onScanCode payload; custom --method/--type honored; missing code → error.
16. doctor: tsc failure → check ok:false (not crash); no tsconfig → tsc na (not error).
17. doctor: `.ts` newer than `.js` flagged stale; fresh pair not flagged.
18. `env use <unknown>` → error listing valid envs; `logs` with no env/token → clear actionable error.
19. backend HTTP/network error → structured CliError, not unhandled rejection.
20. **Regression:** storageClear needs confirm · unsafe wx blocked · path-outside-workspace blocked · attach forbids projectPath (existing 19 tests stay green).
21. **Backward compat:** `run --connect … --stdin` one-shot works with NO daemon.
22. Auto-start: shorthand with no session auto-starts (1st pays connect, rest instant); `--no-session` forces one-shot.
