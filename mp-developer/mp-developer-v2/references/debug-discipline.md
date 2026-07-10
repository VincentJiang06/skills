# Debug discipline — evidence-first, safe defaults, tight output

The operating discipline for using the official `wechatide` tools on a live Mini Program. In force
for every debugging turn. It is additive to the scene docs — this is the part they do not spell out.

## Evidence-first

- **Verify every action against the tool's JSON.** A tool returning without error is not proof of
  effect — read back observable state (`automation_page_action --action getData`,
  `get_app_network_content`, a screenshot) to confirm the change landed.
- **Quote failing codes/messages verbatim** — `MCP_TOOL_ERROR` / `MCP_INIT_ERROR` / `CONNECT_ERROR` /
  `User denied` / `CLOUD_PROJECT_NOT_SUPPORTED` and the tool's own message; never paraphrase an error into a guess.
- **Cheap state before expensive:** route/pageStack/pageData (`automation_runtime_info`,
  `automation_page_action getData`) before element enumeration or screenshots.
- **Async settle before reading effects.** Any handler doing async work (`tap`/`input`/scan/`callMethod`
  → `wx.request` → `setData`) returns when DevTools *dispatches* the call, not when the effect lands —
  `automation_page_action --action waitFor` (or re-poll) before reading. Dispatched ≠ effect landed.

## Safe defaults (no surprise side effects)

- **Read-only by default.** No `automation_navigate`, `automation_page_action setData`,
  `automation_wx_api mock`, `simulator_open_page`, `simulator_refresh`, `debug_clear_cache`, or
  `buildnpm` unless that side effect is explicit in the request.
- **Never write cloud state casually.** `cloud_db_write_*` / `cloud_stor_write` / `cloud_fn_deploy` are
  write ops with confirmation gates — surface them, don't auto-execute; honor `confirm`/`force`/`--dry-run`;
  never delete with an empty or over-broad path.
- **Stop-and-wait on any popup** (auth, `scan_login`, `project_remove`, `上传` confirmation) — see
  `references/approval-policy.md`. Never report "waiting for scan" as "logged in".
- **No arbitrary shell / non-MP desktop control** (`SECURITY.md`).

## `lint_request` discipline flags → what to do

`node scripts/lint_request.mjs "<request>"` surfaces these; each maps to a rule above:

| Flag | Meaning / action |
|---|---|
| `refresh-not-compile` | `simulator_refresh` success only means the refresh triggered — it is NOT a compile pass. Verify with `compile_wxml`/`compile_wxss`. |
| `async-settle` | Wait (`waitFor`) before reading the effect; dispatched ≠ landed. |
| `screenshot-simulator-only` | `screenshot` works only in the simulator; on device / caveat Skyline, capture via app-side canvas export (`renderer-awareness.md`). |
| `real-device-door-a` | Real device = `automation_viewport_action --action remote`, then the standard automation tools — via Door A, no separate automator. |
| `non-invasive-no-side-effect` | Read-only request: do not navigate/reLaunch/mutate as a side effect. |
| `cloud-write-gate` | A write/fee-bearing/destructive cloud op — surface the confirmation gate, do not auto-run. |
| `automator-escape-hatch-only` | The user mentioned automator: Door A (`wechatide`) is primary; automator is only for a standalone/CI script (`two-transports.md`). |

## Failure-code vocabulary (map, don't retry blindly)

| Symptom | Likely cause | Action |
|---|---|---|
| `command not found: wechatide` | CLI not on PATH | tell the user; do not proceed |
| `CONNECT_ERROR` / `MCP_INIT_ERROR` | DevTools MCP unreachable / not authorized | one `wechatide auth -c Claude` + retry; if a popup is pending, stop-and-wait |
| `check_devtools_status` `warning` | vendored copy stale vs IDE | re-sync (SKILL.md §Version reconciliation) |
| no `openid` | not logged in | `scan_login`, re-check; stop-and-wait for scan |
| query returns empty on a page | Skyline custom-component boundary / query-before-render | `waitFor` + scope inside the component host (`renderer-awareness.md`) |
| screenshot blank / "client unavailable" | Skyline not rendered / real-device (simulator-only) | wait for a real selector; on device use app-side canvas export |
| tool "succeeded" but no effect | async not settled, or `simulator_refresh` ≠ compile | settle + re-read; validate compile with `compile_*` |

A slow read that never returns usually means the app is not running in the simulator (build/startup
error) — investigate the build; don't paper over it with retries.

## Output discipline

At most ~2 short paragraphs or ~6 bullets unless full JSON evidence is requested. **Separate confirmed
runtime evidence from planned next steps.** Include the exact command shape when a rerun is needed.
For a debugging turn, give: `summary` · `issueClass` · `evidence` · `likelyCause` · `nextActions`.
