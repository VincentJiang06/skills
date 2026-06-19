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

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/mp-cli-sup ~/.claude/skills/`). Requires the `vince-mp` CLI (lives in tools/vince-mp-cli).

Full spec: [SKILL.md](SKILL.md)
