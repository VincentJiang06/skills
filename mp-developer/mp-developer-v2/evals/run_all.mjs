#!/usr/bin/env node
// run_all.mjs — the committed, re-runnable eval harness for mp-developer.
// It IMPORTS the real mechanisms (scripts/lint_request.mjs, scripts/doctor.mjs,
// scripts/check_skill_version.mjs) and runs one case per adversarial-checklist entry, plus
// idempotency + happy-path. Prints PASS/FAIL <case>; exits non-zero if any case fails.
//
//   node evals/run_all.mjs
//   MP_LINT_MODULE=evals/stubs/lint_request.mjs MP_DOCTOR_MODULE=evals/stubs/doctor.mjs \
//     MP_VER_MODULE=evals/stubs/check_skill_version.mjs node evals/run_all.mjs   # RED (wrong stubs)

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'

function modUrl(envVar, rel) {
  const v = process.env[envVar]
  return v ? pathToFileURL(resolve(v)).href : new URL(rel, import.meta.url).href
}
const { analyzeRequest, guardrailFor } = await import(modUrl('MP_LINT_MODULE', '../scripts/lint_request.mjs'))
const { resolveProject, checkFreshness } = await import(modUrl('MP_DOCTOR_MODULE', '../scripts/doctor.mjs'))
const { reconcile, resolveCandidates, reconcileFromDisk } = await import(modUrl('MP_VER_MODULE', '../scripts/check_skill_version.mjs'))
const skillRoot = fileURLToPath(new URL('..', import.meta.url))

const results = []
const run = (id, name, fn) => {
  let ok = false, note = ''
  try { const r = fn(); ok = r === true || (r && r.ok); note = (r && r.note) || '' }
  catch (e) { ok = false; note = 'threw: ' + e.message }
  results.push({ id, name, passed: ok, note })
}
const has = (arr, x) => Array.isArray(arr) && arr.includes(x)

// ---- doctor fixtures (created fresh each run) ----
const tmp = mkdtempSync(join(tmpdir(), 'mp-dev-eval-'))
function proj(name, cfg) { const d = join(tmp, name); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'project.config.json'), JSON.stringify(cfg)); return d }

// ---- routing / discipline (lint_request) ----
run('C1', 'skyline→webview migration routes OUT to mp-groundline', () => {
  const r = analyzeRequest('把小程序从 skyline 迁移到 webview')
  return r.scope === 'out' && /mp-groundline/.test(r.redirect_to || '')
})
run('C2', '连上小程序看 pageData → in-scope via wechatide (not the retired CLI)', () => {
  const r = analyzeRequest('连上小程序看 pageData')
  return r.scope === 'in' && r.backend === 'wechatide'
})
run('C3', 'debug with automator script → in-scope, escape-hatch-only flag', () => {
  const r = analyzeRequest('帮我 debug 但想用 automator 脚本')
  return r.scope === 'in' && r.backend === 'wechatide' && has(r.discipline_flags, 'automator-escape-hatch-only')
})
run('C4', 'invented tool automation_tap → invalid, suggests automation_element_action', () => {
  const r = analyzeRequest('点一下按钮', { tool: 'automation_tap' })
  return r.tool_check && r.tool_check.valid === false && r.tool_check.suggestion === 'automation_element_action'
})
run('C5', '截图 Skyline 页面 → automator + screenshot-simulator-only flag', () => {
  const r = analyzeRequest('截图当前 Skyline 页面')
  return r.scope === 'in' && r.lane === 'automator' && has(r.discipline_flags, 'screenshot-simulator-only')
})
run('C6', '真机自动化点按钮 → automator + real-device-door-a flag', () => {
  const r = analyzeRequest('真机自动化点一个按钮')
  return r.scope === 'in' && r.lane === 'automator' && has(r.discipline_flags, 'real-device-door-a')
})
run('C7', '清一下 console 再看 → non-invasive-no-side-effect flag', () => {
  const r = analyzeRequest('清一下 console 再看')
  return r.scope === 'in' && has(r.discipline_flags, 'non-invasive-no-side-effect')
})
run('C8', '刷新模拟器≠编译通过 → refresh-not-compile flag', () => {
  const r = analyzeRequest('刷新模拟器后就算编译通过了吧')
  return r.scope === 'in' && r.lane === 'compiler' && has(r.discipline_flags, 'refresh-not-compile')
})
run('C9', 'tap 后马上读 pageData → async-settle flag', () => {
  const r = analyzeRequest('tap 之后马上读 pageData')
  return r.scope === 'in' && has(r.discipline_flags, 'async-settle')
})
run('C10', '部署云函数 → cloudbase + cloud-write-gate flag', () => {
  const r = analyzeRequest('部署这个云函数')
  return r.scope === 'in' && r.lane === 'cloudbase-operator' && has(r.discipline_flags, 'cloud-write-gate')
})
run('C11', 'wx.modelContext AI 技能 → OUT (app-side AI 开发模式)', () => {
  const r = analyzeRequest('用 wx.modelContext 做 AI 技能')
  return r.scope === 'out' && /AI 开发模式/.test(r.redirect_to || '')
})
run('C12', '草料 dev 环境拉 requestId 日志 → OUT (mp-cli-sup)', () => {
  const r = analyzeRequest('切到草料 dev 环境拉 requestId 日志')
  return r.scope === 'out' && /mp-cli-sup/.test(r.redirect_to || '')
})

// ---- doctor edges ----
run('C13', 'doctor resolves miniprogramRoot subdir', () => {
  const d = proj('sub', { miniprogramRoot: 'miniprogram/', appid: 'wxTEST' }); mkdirSync(join(d, 'miniprogram'), { recursive: true })
  const r = resolveProject(d)
  return r.ok === true && r.mpRoot.endsWith('miniprogram')
})
run('C14', 'doctor FAILs a dir with no project.config.json', () => {
  const d = join(tmp, 'noconfig'); mkdirSync(d, { recursive: true })
  const r = resolveProject(d)
  return r.ok === false && r.reason === 'NO_PROJECT_CONFIG'
})
run('C15', 'doctor freshness WARNs stale compiled .js (.ts newer)', () => {
  const d = join(tmp, 'stale'); mkdirSync(d, { recursive: true })
  const ts = join(d, 'a.ts'), js = join(d, 'a.js'); writeFileSync(ts, 'x'); writeFileSync(js, 'x')
  const old = new Date('2000-01-01'), now = new Date()
  utimesSync(js, old, old); utimesSync(ts, now, now)
  return checkFreshness(d).status === 'warn'
})
run('C16', 'doctor freshness SKIPs a JS-only project', () => {
  const d = join(tmp, 'jsonly'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'x.js'), '1')
  return checkFreshness(d).status === 'skip'
})
run('C17', 'doctor freshness excludes .d.ts (not a compilable .ts)', () => {
  const d = join(tmp, 'dts'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'a.d.ts'), 'x'); writeFileSync(join(d, 'a.js'), '1')
  return checkFreshness(d).status === 'skip'   // .d.ts excluded → tsCount 0 → skip, not warn
})
run('C21', 'doctor treats a null/non-object project.config.json as BAD_PROJECT_CONFIG, no crash (F2)', () => {
  const d = join(tmp, 'nullcfg'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'project.config.json'), 'null')
  const r = resolveProject(d)   // must NOT throw
  return r.ok === false && r.reason === 'BAD_PROJECT_CONFIG'
})
run('C22', 'doctor rejects a non-string miniprogramRoot (number/array/object) as BAD_PROJECT_CONFIG, no crash (F3)', () => {
  let allOk = true
  for (const bad of ['{"miniprogramRoot":123}', '{"miniprogramRoot":["a","b"]}', '{"miniprogramRoot":{"x":1}}']) {
    const d = join(tmp, 'badroot-' + bad.length); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'project.config.json'), bad)
    const r = resolveProject(d)   // must NOT throw
    if (!(r.ok === false && r.reason === 'BAD_PROJECT_CONFIG')) allOk = false
  }
  return allOk
})

// ---- check_skill_version edges ----
run('C18', 'version UNKNOWN (exit 0) when IDE built-in absent', () => {
  const r = reconcile('0.2.5', null)
  return r.status === 'unknown' && r.exit === 0
})
run('C19', 'version DRIFT (exit 1) when vendored 0.2.5 != IDE 0.2.6', () => {
  const r = reconcile('0.2.5', '0.2.6', '/ide')
  return r.status === 'drift' && r.exit === 1
})
run('C20', 'version override honored EXCLUSIVELY: a bad WECHAT_DEVTOOLS_SKILL_DIR → unknown, never a false in-sync via /Applications fallback (F1)', () => {
  const cands = resolveCandidates('/nonexistent-mp-override-xyz')
  const r = reconcileFromDisk(skillRoot, cands)   // skillRoot has a real skill.yaml 0.2.5
  return cands.length === 1 && cands[0] === '/nonexistent-mp-override-xyz' && r.status === 'unknown'
})

// ---- metamorphic + happy path ----
run('I1', 'analyzeRequest is idempotent (run twice → identical)', () => {
  const a = JSON.stringify(analyzeRequest('部署这个云函数'))
  const b = JSON.stringify(analyzeRequest('部署这个云函数'))
  return a === b && !/__stub/.test(a)   // guard: a stub sentinel is not a real green
})
run('H1', 'happy path: 点一下提交按钮 → automator via wechatide, no false flags', () => {
  const r = analyzeRequest('点一下提交按钮')
  return r.scope === 'in' && r.lane === 'automator' && r.backend === 'wechatide' && r.tool_check === null
})
run('C23', 'every one of the 41 tools has a complete guardrail (side_effect + 4 non-empty fields)', () => {
  const reg = JSON.parse(readFileSync(join(skillRoot, 'miniprogram-tools/references/tools.yaml'), 'utf8'))
  const fields = ['preconditions', 'common_mistakes', 'verify', 'failure']
  for (const t of reg.tools) {
    const g = guardrailFor(t.id)
    if (!g) return { ok: false, note: `no guardrail for ${t.id}` }
    if (!['read', 'write', 'confirm'].includes(g.side_effect)) return { ok: false, note: `${t.id} bad side_effect` }
    for (const f of fields) if (!Array.isArray(g[f]) || g[f].length === 0) return { ok: false, note: `${t.id} empty ${f}` }
  }
  return reg.tools.length >= 41
})
// tap into lint_request surfacing the guardrail on a valid tool
run('C24', 'lint_request attaches the guardrail to a valid tool_check (surfaced to the agent)', () => {
  const r = analyzeRequest('部署云函数', { tool: 'cloud_fn_deploy' })
  return r.tool_check.valid === true && r.tool_check.guardrail && r.tool_check.guardrail.side_effect === 'confirm'
    && Array.isArray(r.tool_check.guardrail.preconditions) && r.tool_check.guardrail.preconditions.length > 0
})

// ---- report ----
rmSync(tmp, { recursive: true, force: true })
let failed = 0
for (const r of results) { if (!r.passed) failed++; console.log(`${r.passed ? 'PASS' : 'FAIL'} ${r.id} ${r.name}${r.note ? ' — ' + r.note : ''}`) }
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`)
process.exit(failed ? 1 : 0)
