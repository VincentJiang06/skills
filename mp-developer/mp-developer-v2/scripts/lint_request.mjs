#!/usr/bin/env node
// lint_request.mjs — deterministic routing / tool-name / discipline self-check for mp-developer.
// Given a user request (and optionally a tool/action the agent is about to call), it returns the
// correct lane, whether it's in/out of scope, tool-name validity against the AUTHORITATIVE
// tools.yaml registry, and the debug-discipline flags that apply. The agent runs it to sanity-check
// its routing before acting; the eval harness imports analyzeRequest() to test that routing.
//
//   node scripts/lint_request.mjs "把小程序从 skyline 迁移到 webview"
//   node scripts/lint_request.mjs "点一下提交按钮" --tool automation_tap
//   node scripts/lint_request.mjs --json "刷新模拟器后就算编译通过了吧"
//
// It is an ADVISOR, not the router: the agent still reasons. It reliably catches the known hazard
// patterns (out-of-scope redirects, invented tool names, discipline slips); it does not claim to
// classify every possible phrasing.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const TOOLS_PATH = join(HERE, '..', 'miniprogram-tools', 'references', 'tools.yaml')
const GUARDRAILS_PATH = join(HERE, '..', 'references', 'tool-guardrails.json')

let GUARDRAILS = null
// Per-tool guardrail (preconditions / common mistakes / verify / failure). Loaded on demand;
// graceful null if the file is absent so routing/discipline still work without it.
export function guardrailFor(id) {
  if (GUARDRAILS === null) {
    try { GUARDRAILS = JSON.parse(readFileSync(GUARDRAILS_PATH, 'utf8')) } catch { GUARDRAILS = {} }
  }
  return (id && GUARDRAILS[id]) || null
}

let TOOL_IDS = null
function toolIds() {
  if (TOOL_IDS) return TOOL_IDS
  try {
    const reg = JSON.parse(readFileSync(TOOLS_PATH, 'utf8'))
    TOOL_IDS = new Set((reg.tools || []).map(t => t.id))
  } catch { TOOL_IDS = new Set() }
  return TOOL_IDS
}

// Common wrong tool names → the real registered tool (the coarse action-dispatch tools).
const TOOL_SUGGESTIONS = {
  automation_tap: 'automation_element_action',
  automation_click: 'automation_element_action',
  automation_input: 'automation_element_action',
  automation_longpress: 'automation_element_action',
  automation_screenshot: 'automation_viewport_action',
  automation_scroll: 'automation_viewport_action',
  automation_getdata: 'automation_page_action',
  automation_setdata: 'automation_page_action',
  automation_query: 'automation_page_action',
  automation_eval: 'automation_evaluate',
  console_log: 'get_app_console_content',
  network_log: 'get_app_network_content',
  preview: 'auto_preview',
  upload: 'miniprogram_upload',
  tap: 'automation_element_action',
  screenshot: 'automation_viewport_action',
}

const CLOUD_WRITE_TOOLS = new Set([
  'cloud_fn_deploy', 'cloud_fn_inc_deploy', 'cloud_db_write_struct',
  'cloud_db_write_doc', 'cloud_stor_write',
])

function suggestTool(name) {
  const key = String(name || '').toLowerCase()
  if (TOOL_SUGGESTIONS[key]) return TOOL_SUGGESTIONS[key]
  // fall back to longest shared prefix against the real ids
  let best = null, bestLen = 0
  for (const id of toolIds()) {
    let n = 0
    while (n < id.length && n < key.length && id[n] === key[n]) n++
    if (n > bestLen && n >= 4) { bestLen = n; best = id }
  }
  return best
}

const OUT_OF_SCOPE = [
  { test: t => /skyline/i.test(t) && (/webview/i.test(t) || /迁移/.test(t) || /migrat/i.test(t)),
    redirect_to: 'mp-groundline (Skyline→WebView migration)' },
  { test: t => /modelcontext/i.test(t) || /wx\.modelcontext/i.test(t) || /ai\s*(开发)?\s*模式/i.test(t) || /ai\s*技能/i.test(t),
    redirect_to: 'app-side AI 开发模式 (wx.modelContext) — a different product, not IDE debugging' },
  { test: t => /草料/.test(t) || /requestid/i.test(t),
    redirect_to: 'mp-cli-sup (草料 env/logs are removed from this general skill)' },
  { test: t => (/浏览器/.test(t) || /\bbrowser\b/i.test(t) || /\bchrome\b/i.test(t)) && !/小程序|微信|wechat|miniprogram/i.test(t),
    redirect_to: 'browser automation (out of scope — not WeChat)' },
]

// Lane routing: first match wins. Specific action lanes are checked BEFORE the `supplements`
// fallback, so a mixed phrase like "部署 scan 云函数" lanes to cloudbase (云函数), not supplements (scan).
const LANES = [
  { lane: 'cloudbase-operator', test: t => /云(环境|函数|数据库|存储|开发)/.test(t) || /\bcloud\b/i.test(t) || /cloud_(env|fn|db|stor)/i.test(t) },
  { lane: 'previewer', test: t => /预览/.test(t) || /\bpreview\b/i.test(t) || /二维码/.test(t) || /\bqr\b/i.test(t) || /上传/.test(t) || /体验版/.test(t) },
  { lane: 'compiler', test: t => /编译/.test(t) || /\bcompile\b/i.test(t) || /刷新模拟器/.test(t) || /simulator_refresh/.test(t) || /单文件/.test(t) || /构建\s*npm/i.test(t) || /buildnpm/i.test(t) },
  { lane: 'project-manager', test: t => /项目列表/.test(t) || /project.?list/i.test(t) || /导入项目/.test(t) || /从列表(移除|删除)/.test(t) },
  { lane: 'initializer', test: t => /登录/.test(t) || /\blogin\b/i.test(t) || /openid/i.test(t) || /appid/i.test(t) || /打开项目/.test(t) || /open.?project/i.test(t) || /项目设置/.test(t) },
  { lane: 'automator', test: t => /点击|点一?下|轻触/.test(t) || /\btap\b/i.test(t) || /输入/.test(t) || /\binput\b/i.test(t) || /滚动/.test(t) || /\bscroll\b/i.test(t) || /截图/.test(t) || /\bscreenshot\b/i.test(t) || /断言/.test(t) || /导航|跳转页面/.test(t) || /真机/.test(t) || /\bremote\b/i.test(t) },
  { lane: 'debugger', test: t => /console/i.test(t) || /日志/.test(t) || /network|网络请求/i.test(t) || /运行时/.test(t) || /pagedata/i.test(t) || /排查/.test(t) || /\bdebug\b/i.test(t) || /清.*缓存/.test(t) || /连上/.test(t) },
  { lane: 'supplements', test: t => /doctor/i.test(t) || /预检/.test(t) || /扫码/.test(t) || /\bscan\b/i.test(t) || /canvas/i.test(t) || /新鲜度/.test(t) },
]

function disciplineFlags(t, tool) {
  const f = []
  if (/automator/i.test(t)) f.push('automator-escape-hatch-only')
  if ((/截图/.test(t) || /screenshot/i.test(t)) && (/skyline/i.test(t) || /真机/.test(t) || /device/i.test(t))) f.push('screenshot-simulator-only')
  if (/真机/.test(t) || /\bremote\b/i.test(t)) f.push('real-device-door-a')
  if (/只(看|读)|清一下|看一下|non-invasive|别(跳转|navigate|relaunch)/i.test(t)) f.push('non-invasive-no-side-effect')
  if ((/刷新模拟器|simulator_refresh|\brefresh\b/i.test(t)) && (/编译|compile|通过/i.test(t))) f.push('refresh-not-compile')
  if ((/\btap\b|点击|点一?下|输入|\binput\b|scan|扫码/i.test(t)) && (/马上|立刻|立即|之后.{0,4}读|然后.{0,4}(读|获取)/.test(t))) f.push('async-settle')
  if (/部署|\bdeploy\b|删除|\bdelete\b|上传.{0,4}云|写入.{0,4}(数据库|集合)/i.test(t) || (tool && CLOUD_WRITE_TOOLS.has(tool))) f.push('cloud-write-gate')
  return f
}

export function analyzeRequest(text, opts = {}) {
  const t = String(text || '')
  const tool = opts.tool || null

  for (const o of OUT_OF_SCOPE) {
    if (o.test(t)) {
      return { scope: 'out', lane: null, redirect_to: o.redirect_to, backend: null,
        tool_check: toolCheck(tool), discipline_flags: [] }
    }
  }
  let lane = null
  for (const l of LANES) { if (l.test(t)) { lane = l.lane; break } }
  return {
    scope: 'in',
    lane,
    redirect_to: null,
    backend: 'wechatide',              // Door A — always; never the retired vince-mp CLI
    tool_check: toolCheck(tool),
    discipline_flags: disciplineFlags(t, tool),
  }
}

function toolCheck(tool) {
  if (!tool) return null
  const valid = toolIds().has(tool)
  return { name: tool, valid, suggestion: valid ? null : suggestTool(tool), guardrail: valid ? guardrailFor(tool) : null }
}

// ---- CLI ----
function isMain() {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] } catch { return false }
}
if (isMain()) {
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  let tool = null
  const ti = args.indexOf('--tool'); if (ti !== -1) tool = args[ti + 1]
  const text = args.filter((a, i) => !a.startsWith('--') && !(ti !== -1 && i === ti + 1)).join(' ')
  const r = analyzeRequest(text, { tool })
  if (json) console.log(JSON.stringify(r, null, 2))
  else {
    console.log(`scope: ${r.scope}${r.lane ? '  lane: ' + r.lane : ''}${r.redirect_to ? '  → ' + r.redirect_to : ''}  backend: ${r.backend || '-'}`)
    if (r.tool_check) console.log(`  tool ${r.tool_check.name}: ${r.tool_check.valid ? 'VALID' : 'INVALID → ' + (r.tool_check.suggestion || '(no suggestion; check `wechatide help`)')}`)
    const g = r.tool_check && r.tool_check.guardrail
    if (g) {
      if (g.side_effect) console.log(`    side-effect: ${g.side_effect}`)
      for (const [k, label] of [['preconditions', 'preconditions'], ['common_mistakes', 'common mistakes'], ['verify', 'verify'], ['failure', 'failure']])
        for (const item of (g[k] || [])) console.log(`    ${label}: ${item}`)
    }
    if (r.discipline_flags.length) console.log(`  discipline: ${r.discipline_flags.join(', ')}`)
  }
}
