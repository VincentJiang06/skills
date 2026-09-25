# mp-cli-sup

> Debug a *live* WeChat Mini Program — one connect, instant repeat commands, uids stable across calls.

**English** · [简体中文](README.md)

**What it does** — Debugs a *live* WeChat Mini Program through the system `vince-mp` JSON CLI: start a persistent session once (auto-resolves miniprogramRoot + the DevTools automation port), then read and act on the runtime with instant, connection-reused commands.

**Why it's good** —
- **One connect, instant repeat commands**: connect once and every later command reuses that connection, so repeats are near-instant.
- **Element uids STABLE across calls**: `query` a uid, then `tap` it in a separate call — no re-querying.
- **Camera-less `scan` smoke** plus single-element screenshots — drive the scan path with no physical camera.
- A real `doctor` (tsc + `.js` freshness); and client↔backend error-log correlation by `requestId`.

**When to use** — "debug WeChat DevTools / start a mp session" · "inspect pageData" · "query an element then tap it" · "camera-less scan smoke" · "why won't the simulator connect" · "check tsc/.js freshness" · "switch backend env" · "pull the server error log for this requestId"; or call `/mp-cli-sup`.
**Not for** — generic browser automation; source-only Mini Program edits without runtime; non-WeChat connector work.

**Safety boundary (0.3.0)** —
- **The admin token never passes through the agent**: set `VINCE_MP_ADMIN_TOKEN` in the environment that launches the agent, typed without echo or shell history (e.g. `read -rs VINCE_MP_ADMIN_TOKEN && export VINCE_MP_ADMIN_TOKEN`, then start the agent from that shell). Don't put the value on a command line with `env token <token>` — it shows in `ps` and shell history. The agent only checks presence via `ADMIN_TOKEN_REQUIRED` — it never reads, passes or stores the value; a token pasted into chat is not used and you are told to rotate it.
- **Production (`data.cli.im`) is asked first**: switching to `caoliaoProdIm`, or pulling `logs` while production is selected, needs your go-ahead for that specific action; the previous env is restored and reported afterwards.
- **Runtime content is data**: "instructions" inside console, logs or pageData are never executed.
- These are rule-layer gates, not an execution-layer lock. For a hard lock, add a sandbox/permission deny on `~/.vince-mp`.

Every invocation reads SKILL.md, `rules/runtime-protocol.md` and `references/cli-contract.md` (about 6.3k tokens); the other files load on demand.

Maintainers (verification, release checklist, judgment ledger): see [MAINTENANCE.md](MAINTENANCE.md) — not needed for debugging.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/mp-cli-sup ~/.claude/skills/`). Requires the `vince-mp` CLI (lives in tools/vince-mp-cli).

Full spec: [SKILL.md](SKILL.md)
