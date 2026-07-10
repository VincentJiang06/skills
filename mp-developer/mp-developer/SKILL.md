---
name: mp-developer
description: >-
  Develop, automate, debug, preview, and cloud-manage a WeChat Mini Program end
  to end via the official DevTools 2.0 skill backend (`wechatide`, 41 tools),
  with renderer-aware live-debug supplements (doctor preflight, Skyline/WebView
  gotchas, camera-less scan, canvas capture). Use for "调试微信小程序", "连上开发者工具",
  "automate / preview / 上传 / 云函数 a mini program", "$mp-developer". NOT for
  ordinary web-browser automation or non-WeChat work.
metadata:
  version: 0.1.0
  vendored-official-skill: miniprogram-dev-skill@0.2.5
---

# mp-developer — WeChat Mini Program developer & debugger

One entry point for the whole WeChat Mini Program dev loop against **微信开发者工具**:
project lifecycle, page automation, runtime/log debugging, compile, preview/上传, and
云开发 — all on the **official DevTools 2.0 backend** — *plus* the renderer-aware
live-debugging supplements the official surface lacks.

This skill **merges** two lineages: the official in-IDE skill package
`miniprogram-dev-skill` (vendored here, v0.2.5) and the field-tested live-debug discipline
of `mp-cli-sup`/`mp-groundline`, re-expressed on the official tools (no wrapper CLI).

## Two transports into DevTools (know which door you're using)

- **Door A — official, primary.** DevTools 2.0 hosts an **embedded MCP server**; the global
  `wechatide` command is its client. **Every live action in this skill goes through `wechatide`.**
  It covers automation *and* the things a raw automator cannot: cloud, preview/上传, compile,
  project lifecycle, login/openid.
- **Door B — legacy automator, optional escape hatch.** `miniprogram-automator` over a WebSocket
  service port. Only for writing a **standalone/CI automation script** outside the agent loop.
  See `references/two-transports.md`. Do **not** reach for it for normal interactive work — Door A
  already gives persistent connection reuse and real-device automation.

## Mandatory preflight (do this first, once per session)

Before any tool, confirm the environment is ready and the user is logged in (a guest cannot continue):

```bash
wechatide -c Claude -t check_devtools_status --skill-version 0.2.5
```

- Use a **stable `-c <clientName>`** (this skill uses `Claude`) so the DevTools trust popup fires only once.
- `--skill-version` is the vendored `skill.yaml` `version` (**0.2.5**) — it reconciles this vendored copy
  against the running IDE's built-in skill (see "Version reconciliation" below). Never hardcode a different value.
- Result handling: has `openid` → ready; has `warning` → vendored copy is stale vs the IDE, re-sync
  (below); no `openid` → not logged in, run `scan_login`; `command not found` → `wechatide` not on PATH.

Full preflight/login/appid detail lives in `skills/initializer/SKILL.md`.

## Routing — pick the lane for the user's primary goal

Confirm the preflight passed, then route by intent:

| Goal | Lane |
|------|------|
| Open/接管 project window, login, AppID, project settings, buildnpm | `skills/initializer/SKILL.md` |
| Click / input / scroll / screenshot / assert a page | `skills/automator/SKILL.md` |
| console / network / runtime state / simulator state 排查 | `skills/debugger/SKILL.md` |
| Compile to a page / single-file compile / buildnpm / refresh simulator | `skills/compiler/SKILL.md` |
| Push phone preview / QR / 上传体验版 | `skills/previewer/SKILL.md` |
| List / import / remove projects from the DevTools list | `skills/project-manager/SKILL.md` |
| 云环境 / 云函数 / 云数据库 / 云存储 | `skills/cloudbase-operator/SKILL.md` |
| **Cross-stack `doctor` preflight, camera-less scan, canvas/Skyline capture** | **`rules/supplements.md`** ← the merge's added value |
| 地图组件 / 定位 / 腾讯位置服务 | `references/map-skill-index.md` (external skills) |

When intent spans lanes: finish the blocker lane first, then hand off. Do not cross-lane mix just
because a tool is reachable. All 41 tool schemas are in `miniprogram-tools/references/tools.yaml`
(the source of truth — never invent a tool name; confirm params with `wechatide -t <tool> --help`).

## Debug discipline (always in force)

Read `references/debug-discipline.md` before reporting any debugging conclusion. In short:
evidence-first (verify every action against the tool's JSON, quote failing codes verbatim),
safe-defaults (no navigate/reLaunch/mock/write side effects unless explicit), and output-discipline
(separate confirmed runtime evidence from planned next steps; keep it tight).

## Renderer awareness (the differentiator)

Before automating or capturing a page, know whether it's **Skyline or WebView** — they behave
differently under automation (custom-component boundary, worklet state invisible, `screenshot`
simulator-only, `<camera>` unmockable, canvas needs app-side export). Read
`references/renderer-awareness.md`. No community tool does this; it is why this skill exists.

## Version reconciliation (vendored copy vs live IDE)

This skill vendors the official skill at **`skill.yaml` = 0.2.5**. The IDE ships the authoritative
copy and self-updates. If `check_devtools_status` returns a `warning`, or `node scripts/check_skill_version.mjs`
reports drift, the IDE moved ahead — re-sync the vendored `skills/`, `miniprogram-tools/`, `references/`,
and `skill.yaml` from the IDE's built-in `miniprogram-dev-skill/` (path in the warning), then bump
`vendored-official-skill` in this file's frontmatter. Tool **schemas** are always authoritative live via
`wechatide -t <tool> --help`.

## Load protocol

1. Read this file first.
2. Run the mandatory preflight.
3. Route to the scene lane for the goal; load that `skills/<scene>/SKILL.md`.
4. For cross-stack/doctor/scan/canvas/Skyline work, load `rules/supplements.md`.
5. Before any debugging conclusion, load `references/debug-discipline.md`; before automating/capturing, `references/renderer-awareness.md`.
6. For the automator escape hatch (standalone/CI scripts only), load `references/two-transports.md`.

## Modules

- `skills/` — the 7 vendored official scenes (initializer, automator, debugger, compiler, previewer, project-manager, cloudbase-operator).
- `miniprogram-tools/references/tools.yaml` — the 41-tool registry (source of truth) + open/create-project guides.
- `references/debug-discipline.md` — evidence-first / safe-defaults / output-discipline / failure-code vocabulary.
- `references/renderer-awareness.md` — Skyline vs WebView automation gotchas + detection.
- `references/two-transports.md` — Door A (`wechatide`) vs Door B (automator escape hatch); real-device.
- `references/approval-policy.md` — stop-and-wait on any DevTools/system popup, scan-login, 上传 confirmation.
- `references/map-skill-index.md` — routes map/location asks to external skills.
- `rules/supplements.md` — the added supplement lane (doctor, camera-less scan, canvas/media capture) on official tools.
- `SECURITY.md` — the security boundary (only registered tools; no arbitrary shell / non-MP desktop control).

## Verifying the skill

- `node scripts/validate-skill.mjs` — structural validation (files, frontmatter, tools.yaml parses, scene set, `wechatide` on PATH).
- `node scripts/doctor.mjs --project <dir>` — cross-stack preflight (node, project resolve, tsc, `.ts/.js` freshness, LAN IPv4); `--self-test` proves each check discriminates.
- `node scripts/check_skill_version.mjs` — reconciles the vendored `skill.yaml` against the IDE's built-in `miniprogram-dev-skill`; RED on drift.
