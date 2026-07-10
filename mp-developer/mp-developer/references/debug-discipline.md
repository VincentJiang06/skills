# Debug discipline — evidence-first, safe defaults, tight output

The operating discipline for using the official `wechatide` tools to debug a live Mini Program.
Ported from `mp-cli-sup`/`mp-groundline` onto the official backend. In force for every debugging turn.

## Evidence-first

- **Verify every action against the tool's JSON result.** A tool returning without error is not proof of
  effect — read back the observable state (`automation_page_action --action getData`,
  `get_app_network_content`, a screenshot) to confirm the intended change actually happened.
- **Quote failing codes/messages verbatim.** Report `MCP_TOOL_ERROR` / `MCP_INIT_ERROR` /
  `CONNECT_ERROR` / `User denied` / `CLOUD_PROJECT_NOT_SUPPORTED` and the tool's own message as-is;
  do not paraphrase an error into a guess.
- **Read cheap state before expensive.** route/pageStack/pageData (`automation_runtime_info`,
  `automation_page_action getData`) before element enumeration or screenshots.
- **Async settle before reading effects** (see `renderer-awareness.md` §Async settle).

## Safe defaults (no surprise side effects)

- **Read-only by default.** Do not `automation_navigate` (navigateTo/redirectTo/reLaunch/switchTab),
  `automation_page_action setData`, `automation_wx_api mock`, `simulator_open_page`, `simulator_refresh`,
  `debug_clear_cache`, or `buildnpm` unless that side effect is explicit in the request.
- **Never write cloud state casually.** `cloud_db_write_*` / `cloud_stor_write` (upload/delete) /
  `cloud_fn_deploy` are write ops with confirmation gates — surface them, don't auto-execute; honor
  `confirm`/`force`/`--dry-run` semantics; never delete with an empty or over-broad path.
- **Stop-and-wait on any popup.** DevTools auth popup, `scan_login`, `project_remove` confirmation, and
  `miniprogram_upload`/体验版 confirmation block on the user. Report the exact step you are paused at and
  what the user must do; never describe "waiting for scan" as "logged in". See `references/approval-policy.md`.
- **No arbitrary shell / non-MP desktop control** — the official security boundary (`SECURITY.md`); only
  registered `wechatide` tools + this skill's own `scripts/`.

## Failure-code vocabulary (map, don't retry blindly)

| Symptom | Likely cause | Action |
|---|---|---|
| `command not found: wechatide` | CLI not on PATH | tell the user; do not proceed |
| `CONNECT_ERROR` / `MCP_INIT_ERROR` | DevTools MCP unreachable / not authorized | one `wechatide auth -c Claude` + retry; if popup pending, stop-and-wait |
| `check_devtools_status` returns `warning` | vendored skill copy stale vs IDE | re-sync (root SKILL.md §Version reconciliation) |
| no `openid` | not logged in | `scan_login`, then re-check; stop-and-wait for scan |
| query returns empty on a page | Skyline custom-component boundary / query-before-render | `waitFor` + scope inside the component host (`renderer-awareness.md`) |
| screenshot blank / "client unavailable" | Skyline not rendered / real-device (screenshot simulator-only) | wait for a real selector; on device use app-side canvas export |
| tool "succeeded" but no effect | async not settled, or `simulator_refresh` success ≠ compile pass | settle + re-read; validate compile with `compile_*`, not refresh |

- `simulator_refresh` returning `success:true` means the refresh **triggered**, not that compilation passed —
  verify with `compile_js`/`compile_wxml`/`compile_wxss` when you need the compile result.
- A slow read that never returns usually means the app is not running in the simulator (build/startup
  error) — investigate the build; do not paper over it with retries.

## Output discipline

- At most ~2 short paragraphs or ~6 bullets unless full JSON evidence is requested.
- **Separate confirmed runtime evidence from planned next steps.** State what you observed (route,
  pageData, log line, failing code) distinctly from what you propose to do next.
- Include the exact command shape when a rerun is needed, so the user (or next turn) can reproduce it.
- Give a structured conclusion when debugging: `summary` · `issueClass` · `evidence` · `likelyCause` ·
  `nextActions` (as the `debugger` scene recommends).
