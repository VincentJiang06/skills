# mp-developer

One skill for the whole WeChat Mini Program dev loop against **微信开发者工具** — project lifecycle,
page automation, runtime/log debugging, compile, preview/上传, and 云开发 — **through the single
official DevTools 2.0 backend `wechatide`**, plus renderer-aware live-debug supplements the official
surface lacks. **No wrapper CLI.**

一个技能覆盖微信小程序完整开发闭环，全部走**官方 DevTools 2.0 后端 `wechatide`**，并补上官方缺失的
**渲染器感知实时调试**能力。**零封装 CLI。**

## What v2 is (the merge, optimized)

It merges the official `miniprogram-dev-skill` (v0.2.5, 41 tools) with field-tested live-debug
discipline — this time by **optimizing** the official guidance (tighter routing, hardened discipline,
wechatide-first framing) rather than vendoring it verbatim, and by **dropping the CLI entirely**:

- **Backend = `wechatide` only** (Door A: the DevTools-2.0 embedded MCP). Real-device via
  `automation_viewport_action --action remote`; the IDE holds the connection (selector-based, no uid session).
- **Added value:** `lint_request` (routing/tool-name/discipline self-check over the authoritative
  registry), `doctor` (cross-stack build/env preflight), renderer-awareness (Skyline vs WebView),
  camera-less scan, canvas capture, and a hardened debug discipline.
- **Dropped:** the `vince-mp`/`miniprogram-automator` wrapper CLI (Door A covers it), and the
  草料-specific `env`/`logs` (they stay in `mp-cli-sup`). See `references/two-transports.md`.

## Requirements

- **微信开发者工具 2.0** installed (provides `wechatide`; vendored against v0.2.5).
- Node.js for `scripts/` and `evals/` — **zero npm dependencies** (node stdlib only).
- In DevTools: 设置 → 安全设置 → 服务端口 (+ HTTP 调试 / 自动化测试) enabled.

## Usage

```bash
wechatide -c Claude -t check_devtools_status --skill-version 0.2.5   # mandatory preflight (openid + skillVersion)
node scripts/lint_request.mjs "<the request>" [--tool <name>]        # optional routing/tool/discipline self-check
node scripts/doctor.mjs --project <projectDir>                       # cross-stack build/env preflight
```

Then route by goal (see `SKILL.md`): initializer / automator / debugger / compiler / previewer /
project-manager / cloudbase-operator, or the doctor·scan·canvas supplements (`rules/supplements.md`).

## Develop / verify

```bash
node scripts/validate-skill.mjs      # structural validation (files, frontmatter, 41-tool registry, harness, wechatide)
node evals/run_all.mjs               # the eval harness (21 cases: routing/discipline/doctor/version); exits non-zero on failure
node scripts/doctor.mjs --self-test  # prove each doctor check discriminates
node scripts/check_skill_version.mjs # reconcile the vendored skill.yaml against the installed IDE (RED on drift)
```

## Known limitations

- The vendored `skills/` + `tools.yaml` are a **point-in-time copy** of the official v0.2.5 skill. When
  the IDE updates, `check_devtools_status` returns `warning` and `check_skill_version.mjs` reports drift —
  re-sync from the IDE's built-in `miniprogram-dev-skill/` and bump `optimized-from-official` in `SKILL.md`.
  Tool **schemas** are always authoritative live via `wechatide -t <tool> --help`.
- Door A's `/mcp` server is a DevTools-2.0 **developer-preview** capability; `wechatide` on the installed
  IDE is the source of truth.
- `lint_request` is an advisor, not the router — it catches the known hazard patterns, not every phrasing.
- Live `<camera>` frames cannot be mocked; real-device `screenshot` is unavailable (app-side canvas export).
  See `references/renderer-awareness.md`.
