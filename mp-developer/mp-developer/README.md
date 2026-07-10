# mp-developer

One skill for the whole WeChat Mini Program dev loop against **微信开发者工具** — project lifecycle,
page automation, runtime/log debugging, compile, preview/上传, and 云开发 — on the **official
DevTools 2.0 backend**, plus renderer-aware live-debug supplements the official surface lacks.

一个技能覆盖微信小程序完整开发闭环：项目、自动化、调试、编译、预览/上传、云开发，全部走**官方
DevTools 2.0 后端**，并补上官方缺失的**渲染器感知实时调试**能力。

## Why this exists (the merge)

It merges two lineages:
- the **official** in-IDE skill package `miniprogram-dev-skill` (**vendored here, v0.2.5**, 41 tools), and
- the field-tested live-debug discipline of `mp-cli-sup` / `mp-groundline`, **re-expressed on the official
  tools with no wrapper CLI** — because `vince-mp` was only a wrapper over `miniprogram-automator`, whose
  automation core is now fully covered by the official `automation_*` tools.

**Two doors into DevTools** (see `references/two-transports.md`):
- **Door A — official, primary.** DevTools 2.0 hosts an embedded MCP server; the `wechatide` command is its
  client. Every live action goes here. It covers cloud/preview/compile/project/login that a raw automator can't,
  reuses the IDE connection natively, and does real-device automation (`automation_viewport_action --action remote`).
- **Door B — legacy automator, optional escape hatch.** `miniprogram-automator` over a WebSocket port; only for
  a standalone/CI script (`scripts/automator-escape-hatch.mjs`). Not for interactive work.

The added value over the official skill: a cross-stack **`doctor`** preflight, **renderer awareness**
(Skyline vs WebView gotchas — no other tool does this), **camera-less scan** / canvas capture recipes,
and a hardened **debug discipline** (evidence-first, safe defaults, failure-code vocabulary).

## Requirements

- **微信开发者工具 2.0** installed (provides the `wechatide` command; this skill was vendored against v0.2.5).
- Node.js (for the `scripts/`); `miniprogram-automator` only if you use the optional Door-B escape hatch.
- In DevTools: 设置 → 安全设置 → 服务端口 (+ HTTP 调试 / 自动化测试) enabled.

## Usage

Start every session with the mandatory preflight, then route by goal (see `SKILL.md`):

```bash
wechatide -c Claude -t check_devtools_status --skill-version 0.2.5    # openid + skillVersion; auth popup once
node scripts/doctor.mjs --project <projectDir>                        # cross-stack build/env preflight
```

| Goal | Lane |
|------|------|
| open project / login / appid / settings / buildnpm | `skills/initializer/` |
| tap / input / scroll / screenshot / assert | `skills/automator/` |
| console / network / runtime / simulator 排查 | `skills/debugger/` |
| compile / single-file / refresh | `skills/compiler/` |
| preview / QR / 上传体验版 | `skills/previewer/` |
| project list / import / remove | `skills/project-manager/` |
| 云环境 / 云函数 / 云数据库 / 云存储 | `skills/cloudbase-operator/` |
| doctor / camera-less scan / canvas / Skyline capture | `rules/supplements.md` |

## Develop / verify

```bash
node scripts/validate-skill.mjs         # structural validation (files, frontmatter, 41-tool registry, wechatide on PATH)
node scripts/doctor.mjs --self-test     # prove each doctor check discriminates
node scripts/check_skill_version.mjs    # reconcile the vendored skill.yaml against the installed IDE (RED on drift)
```

## Known limitations

- The vendored `skills/` + `tools.yaml` are a **point-in-time copy** of the official v0.2.5 skill. When the IDE
  updates, `check_devtools_status` returns a `warning` and `check_skill_version.mjs` reports drift — re-sync from
  the IDE's built-in `miniprogram-dev-skill/` and bump `vendored-official-skill` in `SKILL.md`. Tool **schemas**
  are always authoritative live via `wechatide -t <tool> --help`.
- Door A's `/mcp` server is a DevTools-2.0 **developer-preview** capability; it is not yet in official public docs
  and Tencent may change it. `wechatide` on the installed IDE is the source of truth.
- **草料-specific** `env`/`logs` (backend-env switch + `requestId` server-log pull) are intentionally **not** here —
  they remain in the private `mp-cli-sup`.
- Live `<camera>` frames cannot be mocked (only `wx.*` media pickers can); real-device `screenshot` is unavailable
  (capture via app-side canvas export). See `references/renderer-awareness.md`.
