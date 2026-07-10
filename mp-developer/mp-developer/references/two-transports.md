# Two transports into DevTools — Door A (official) vs Door B (automator)

Both drive the same 微信开发者工具 instance, but through different channels. This skill is
**Door-A-first**. Door B is a documented escape hatch, not a runtime lane.

## Door A — official DevTools-2.0 MCP (primary, use this)

- DevTools 2.0 hosts an **embedded MCP server**; the global `wechatide` command is its client.
- Every tool in `miniprogram-tools/references/tools.yaml` routes here (`execution.transport: "skill_call"`).
- **Auth:** first connect for a `-c <clientName>` triggers a one-time DevTools approval popup; this skill
  uses `-c Claude` so the popup fires once. `MCP_CLIENT_NAME` env overrides.
- **Connection persistence is free:** the IDE holds the runtime connection, so `wechatide` calls reuse it —
  "connect once, instant repeats" happens natively. There is **no uid to track**; automation is
  **selector-based** (`--selector .foo`), stateless per call.
- **Real-device (真机) automation is covered here:** `wechatide -c Claude -t automation_viewport_action
  --project <p> --action remote` triggers real-device debugging (QR to scan); afterward the standard
  `automation_element_action` / `automation_page_action` / `automation_evaluate` tools drive the device.
  Caveat: `screenshot` is simulator-only (see `renderer-awareness.md`).

## Door B — `miniprogram-automator` npm (optional escape hatch only)

Reach for this **only** to produce a **standalone/CI automation script** that must run outside the agent
loop (e.g. a Jest regression suite in a pipeline). It is the same automation engine underneath, so it
adds nothing for interactive work — do not use it to "connect and poke around"; Door A is better for that.

`miniprogram-automator` is frozen at **0.12.1** (npm; API unchanged since 2022). It has no session/daemon
of its own — a connection lives only for one live WebSocket.

Minimal hardcoded npm usage (this is what a wrapper CLI reduces to — keep it this small):

```js
// scripts/automator-escape-hatch.mjs — run: node scripts/automator-escape-hatch.mjs
import automator from 'miniprogram-automator'

// Attach to an already-running DevTools whose automation port you opened first:
//   /Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project <projectPath> --auto-port 9420
const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })

const page = await mp.currentPage()
console.log(JSON.stringify({ route: page.path, data: await page.data() }))
const btn = await page.$('.submit-btn')
if (btn) await btn.tap()
// Real device instead of simulator: `await mp.remote()` (prints a QR to scan), then the same API.
await mp.disconnect()   // leaves DevTools open; use mp.close() to also close the project window
```

Prerequisites: DevTools → 设置 → 安全设置 → 服务端口 (+ HTTP 调试 / 自动化测试) enabled; `miniprogram-automator`
installed (`npm i miniprogram-automator`). The `cli auto` port is arbitrary via `--auto-port`.

### Why the wrapper CLI was dropped

`vince-mp-cli` was a wrapper over exactly the `automator.connect(...)` call above. Its automation core
(`data`/`query`/`tap`/`input`/`eval`/`screenshot`/`nav`/wx-mock) is **fully covered by Door A's
`automation_*` tools**, and its session/uid daemon is moot under Door A (the IDE holds the connection).
The only wrapper features without an official equivalent were `doctor` (cross-stack preflight) and
camera-less `scan`/canvas helpers — those are preserved as scripts + rules in `rules/supplements.md`,
with **no CLI dependency**. The 草料-specific `env`/`logs` were intentionally left out of this general skill.
