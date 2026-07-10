---
name: mp-developer
description: >-
  Develop, automate, debug, preview & cloud-manage a WeChat Mini Program via the
  official DevTools 2.0 backend `wechatide`, plus renderer-aware live-debug
  supplements. Use for "调试微信小程序", "连上开发者工具", "automate/preview/上传/云函数 a mini
  program", "$mp-developer". NOT for browser automation, non-WeChat work,
  Skyline→WebView migration (→ mp-groundline), or app-side wx.modelContext AI 开发模式.
metadata:
  version: 0.2.0
  optimized-from-official: miniprogram-dev-skill@0.2.5
---

# mp-developer — WeChat Mini Program developer & debugger

One entry point for the whole WeChat Mini Program dev loop against **微信开发者工具**: project
lifecycle, page automation, runtime/log debugging, compile, preview/上传, and 云开发 — **all through
the single official backend `wechatide`** — plus the renderer-aware live-debug supplements the
official surface lacks. It optimizes the official skill's routing/discipline and adds a `doctor`
preflight, Skyline/WebView awareness, camera-less scan, and canvas capture. **No wrapper CLI.**

## Backend: `wechatide` only (Door A)

DevTools 2.0 hosts an embedded MCP server; the global `wechatide` command is its client, exposing
**41 tools** (`miniprogram-tools/references/tools.yaml` — the authoritative registry; confirm any
tool's params with `wechatide -t <tool> --help`, and **never invent a tool name**). Every live action
goes through it — automation, cloud, preview, compile, project, even real-device
(`automation_viewport_action --action remote`). The IDE holds the connection, so calls reuse it
natively (no session/uid to manage; automation is **selector-based**). The retired `vince-mp` /
`miniprogram-automator` CLI is **not** a backend here — see `references/two-transports.md`.

**Before calling any tool, get its guardrail:** `node scripts/lint_request.mjs "<request>" --tool <name>`
prints that tool's `side-effect · preconditions · common mistakes · verify · failure`
(`references/tool-guardrails.json` — one entry per tool) alongside the routing/discipline check. Honor
the `side-effect` field: `read` is safe; `write`/`confirm` need the side effect to be explicitly requested
(and `confirm` triggers a DevTools/user confirmation — stop-and-wait).

## Mandatory preflight (once per session)

```bash
wechatide -c Claude -t check_devtools_status --skill-version 0.2.5
```

Stable `-c Claude` (the DevTools trust popup fires once). `--skill-version` = the vendored `skill.yaml`
version (**0.2.5**), reconciling this copy against the running IDE. Result: has `openid` → ready;
`warning` → the copy is stale vs the IDE, re-sync (see below); no `openid` → run `scan_login`;
`command not found` → `wechatide` not on PATH. Detail: `skills/initializer/SKILL.md`.

## Route by the user's primary goal

Optionally sanity-check routing/tool-name/discipline first:
`node scripts/lint_request.mjs "<the request>" [--tool <name>]` (see `rules/supplements.md`).

| Goal | Lane |
|------|------|
| Open/接管 project, login, AppID, project settings, buildnpm | `skills/initializer/SKILL.md` |
| Click / input / scroll / screenshot / assert a page | `skills/automator/SKILL.md` |
| console / network / runtime / simulator state 排查 | `skills/debugger/SKILL.md` |
| Compile to a page / single-file compile / buildnpm / refresh | `skills/compiler/SKILL.md` |
| Push phone preview / QR / 上传体验版 | `skills/previewer/SKILL.md` |
| List / import / remove projects | `skills/project-manager/SKILL.md` |
| 云环境 / 云函数 / 云数据库 / 云存储 | `skills/cloudbase-operator/SKILL.md` |
| **doctor preflight, camera-less scan, canvas / Skyline capture** | **`rules/supplements.md`** |
| 地图组件 / 定位 / 腾讯位置服务 | `references/map-skill-index.md` (external skills) |

Finish the blocker lane before handing off; don't cross-lane mix. **Out of scope** (route elsewhere):
Skyline→WebView migration → `mp-groundline`; the app-side `wx.modelContext` AI 开发模式 → a different
product; 草料 env/logs → the private `mp-cli-sup`; browser automation / non-WeChat → not this skill.

## Always in force

- **Debug discipline** (`references/debug-discipline.md`) — read before any debugging conclusion:
  evidence-first, safe-defaults (no navigate/mock/write/deploy side effect unless explicit),
  failure-code vocabulary, `simulator_refresh` success ≠ compile pass, async-settle before reading effects.
- **Renderer awareness** (`references/renderer-awareness.md`) — read before automating/capturing:
  Skyline vs WebView (custom-component boundary, worklet invisible, `screenshot` simulator-only,
  `<camera>` unmockable, canvas via app-side export).
- **Approval policy** (`references/approval-policy.md`) — stop-and-wait on any DevTools/system popup,
  `scan_login`, `project_remove`/`上传` confirmation; never report "waiting for scan" as "logged in".
- **Security boundary** (`SECURITY.md`) — only registered `wechatide` tools + this skill's scripts;
  no arbitrary shell / non-MP desktop control.

## Version reconciliation (vendored copy vs live IDE)

`skill.yaml` is pinned to the optimized-from official version **0.2.5**. If `check_devtools_status`
returns `warning`, or `node scripts/check_skill_version.mjs` reports drift, re-sync `skills/`,
`miniprogram-tools/`, `references/{approval-policy,map-skill-index}.md`, and `skill.yaml` from the IDE's
built-in `miniprogram-dev-skill/`, then bump `optimized-from-official` above. Tool **schemas** are
always authoritative live via `wechatide -t <tool> --help`.

## Verifying the skill

- `node scripts/validate-skill.mjs` — structural validation (files, frontmatter, 41-tool registry, scenes, `wechatide` on PATH).
- `node evals/run_all.mjs` — the eval harness (routing/discipline/doctor/version cases; exits non-zero on any failure).
- `node scripts/doctor.mjs --self-test` — proves each doctor check discriminates.
- `node scripts/check_skill_version.mjs` — reconciles the vendored `skill.yaml` against the installed IDE.
