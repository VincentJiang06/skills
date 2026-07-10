# Why there is no CLI — Door A is the only backend

DevTools has two doors. This skill uses only the first, on purpose.

- **Door A (official, used here):** DevTools 2.0 hosts an **embedded MCP server**; the `wechatide`
  command is its client (41 `skill_call` tools). It covers automation *and* what a raw automator
  cannot — cloud, preview/上传, compile, project lifecycle, login/openid — and the **IDE holds the
  connection**, so `wechatide` calls reuse it (connect-once/instant-repeat is native; automation is
  selector-based, no uid to track). Real-device automation is here too:
  `automation_viewport_action --action remote`.

- **Door B (legacy automator, NOT used):** `miniprogram-automator` over a WebSocket service port —
  what the retired `vince-mp` CLI and community MCPs wrap. It is **frozen at 0.12.1** (no API change
  since 2022) and its automation core is fully covered by Door A's `automation_*` tools; its
  session/uid daemon is moot when the IDE already holds the connection.

**So the wrapper CLI was dropped entirely.** `vince-mp` was only `automator.connect(...)` plus a
session daemon — nothing Door A lacks. The features that *were* unique (a cross-stack build preflight
and camera-less scan/canvas helpers) are preserved as `rules/supplements.md` + `scripts/doctor.mjs`
with **no automator dependency and no required npm**. The 草料-specific `env`/`logs` were removed
(they belong to the private `mp-cli-sup`).

If you ever need a **standalone/CI automation script** outside the agent loop, that is the one
remaining automator use — write it directly against `miniprogram-automator`
(`automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })` after opening the port with
`cli auto --project <p> --auto-port 9420`). That is a separate deliverable, not part of this skill's
runtime; this skill neither ships nor needs such a script.
