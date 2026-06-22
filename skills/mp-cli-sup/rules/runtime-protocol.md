# runtime-protocol — safe, session-first execution

Read this before running `vince-mp`, building workflow JSON, or reporting CLI failure evidence.

## Backend contract

The backend is the system-installed CLI package:

```bash
vince-mp <command> --json
```

Apply CLI discipline: structured JSON in/out, standard error codes, explicit side effects,
explicit path boundaries, narrow commands. Load `references/cli-contract.md` only when exact
command/step/error schema is needed; otherwise keep this high-level protocol in context.

## Execution protocol

1. **Connect once with a session.** Start with `vince-mp session start` (optionally `--port`,
   `--connect`, `--workspace-root`). It resolves the project via `project.config.json`
   `miniprogramRoot` (so a `miniprogram/`-subdir layout works), ensures the automation port is
   live (spawning `cli auto` only if needed — no "port in use" fight), then attaches. All later
   commands reuse that one connection.
2. **Classify the command:** read (`page`/`stack`/`data`/`sysinfo`/`query`/`snapshot`/`console`/
   `eval`), act (`tap`/`input`/`scan`/`shot`/`nav`/`step`/`run`), or diagnose (`doctor`/`env`/`logs`).
3. **Classify connection safety:**
   - non-invasive inspection of the current client → the session's default `attach`, or
     `smoke-existing --ws-endpoint` for a one-shot read;
   - opening/focusing a project → allowed only as the connect-time side effect of `session start`
     ensuring the port, or an explicit, user-authorized `--connect '{"mode":"launch",...}'`.
4. **UI work:** `query`/`snapshot` to mint a uid, then `tap`/`input` by that uid (long-press,
   `elementTrigger`, and `elementScreenshot` have no shorthand — use `step '{"type":...,"uid":...}'`). In a session a uid stays valid across separate CLI calls — refresh only after
   navigation or page mutation. For one element's image use `shot`/`elementScreenshot` with an
   explicit output path under `--workspace-root`.
5. **Diagnostics:** read route/pageStack/pageData before snapshot. Treat a Skyline snapshot
   timeout as a partial-evidence blocker, not a full failure. If reads hang, expect a fast
   `APP_NOT_RUNNING` — check the simulator for a build/startup error.
6. **Canvas/Camera:** load `references/skyline-media.md`; instrumentation and mocks must be
   explicit and reversible.
7. **Verify** every action with CLI JSON. On failure report: command, error code, connection
   mode, side effects attempted, and the next deterministic recovery command.

## Hard rules

- Use only the system `vince-mp` backend; no other automation backend/connector for new work.
- Do not navigate, `reLaunch`, instrument media/network, mock APIs, or write state
  (`setPageData`/`storage*`) when the user asked for non-invasive inspection. (`session start` ensuring the port is the one allowed connect-time effect.)
- Do not infer the automation WebSocket from an unrelated DevTools URL parameter; let
  `session start` resolve/verify it, or pass a verified `--connect`.
- Do not write outside `--workspace-root`.
- Do not call unsafe `wx` methods unless the step explicitly sets `allowUnsafe:true`.
- Camera work is metadata-only unless the user explicitly requests mock/take-photo behavior.
- Storage writes/clears are explicit side effects; `storageClear` requires the literal `confirm:true`
  field (else `STORAGE_CLEAR_REQUIRES_CONFIRMATION`): `vince-mp step '{"type":"storageClear","confirm":true}'`.
  `storageSet`/`storageRemove` likewise go via `step` (no shorthand). Surface the data loss; never wipe silently.

## Output discipline

At most 2 short paragraphs or 6 bullets unless full JSON evidence is requested. Summarize the
observed route/pageData/log/media evidence; name failing codes (`PATH_OUTSIDE_WORKSPACE`,
`SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`, `APP_NOT_RUNNING`); separate confirmed runtime evidence
from planned next steps; include the exact command shape when a rerun is needed.

## Anti-patterns

- Do not fall back to `launch`/`cli auto` against a port to "recover" an attach failure unless the
  user allowed opening DevTools — first read the error code from `session start`/`session status`
  (`AUTOMATION_PORT_TIMEOUT` → enable DevTools 安全设置 → 服务端口; `AUTOMATOR_CONNECT_FAILED` → confirm
  DevTools is open). `doctor` is a STATIC pre-flight (project resolves + cli binary + build freshness);
  it does NOT test the live automation port, so it cannot diagnose an attach/port failure.
- Do not hide side effects behind helper scripts; the CLI JSON must show the action and output path.
- Do not retry Skyline element enumeration indefinitely — bounded timeouts, report partial evidence.
- Do not treat a slow read as success: a real hang surfaces fast as `APP_NOT_RUNNING` (app not
  running in the simulator) — investigate the build, don't paper over it.

## Verification

After applying this file: (1) commands used the system `vince-mp` binary and the session where
possible; (2) any file write stayed inside `--workspace-root`; (3) failures were reported with CLI
error code, command shape, connection mode, and attempted side effects.
