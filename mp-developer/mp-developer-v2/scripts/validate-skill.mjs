#!/usr/bin/env node
// validate-skill.mjs — structural validation of the mp-developer skill.
// Verifies the optimized official content + the merge's added files are present and well-formed,
// the tool registry parses, the eval harness re-runs green, and (informationally) that wechatide is on PATH.
//
//   node scripts/validate-skill.mjs

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []
const check = (cond, name) => results.push({ ok: !!cond, name })
const warnCheck = (cond, name) => results.push({ ok: true, warn: !cond, name })

function fileHas(rel, ...needles) {
  const p = join(root, rel)
  if (!existsSync(p)) { check(false, `missing ${rel}`); return }
  const s = readFileSync(p, 'utf8')
  const missing = needles.find(nd => !s.includes(nd))
  check(!missing, missing ? `${rel} missing "${missing}"` : rel)
}

// 1. Root SKILL.md
if (existsSync(join(root, 'SKILL.md'))) {
  const s = readFileSync(join(root, 'SKILL.md'), 'utf8')
  const fm = s.startsWith('---') ? s.slice(3, s.indexOf('\n---', 3)) : ''
  check(/name:\s*mp-developer/.test(fm), 'SKILL.md name: mp-developer')
  check(/description:/.test(fm), 'SKILL.md has description')
  check(/version:/.test(fm), 'SKILL.md has version')
  check(/check_devtools_status/.test(s), 'SKILL.md documents the preflight')
  check(/wechatide/.test(s), 'SKILL.md is wechatide-first')
} else check(false, 'missing SKILL.md')

// 2. The 7 official scene lanes
for (const sc of ['initializer', 'automator', 'debugger', 'compiler', 'previewer', 'project-manager', 'cloudbase-operator']) {
  const p = join(root, 'skills', sc, 'SKILL.md')
  check(existsSync(p) && /^---[\s\S]*?name:\s*/m.test(readFileSync(p, 'utf8')), `scene ${sc}`)
}

// 3. Tool registry (authoritative, 41 tools)
const toolsPath = join(root, 'miniprogram-tools/references/tools.yaml')
if (existsSync(toolsPath)) {
  try {
    const reg = JSON.parse(readFileSync(toolsPath, 'utf8'))
    const n = Array.isArray(reg.tools) ? reg.tools.length : 0
    check(n >= 40, `tools.yaml parses, ${n} tools`)
    const ids = new Set((reg.tools || []).map(t => t.id))
    for (const id of ['check_devtools_status', 'automation_element_action', 'cloud_fn_deploy', 'auto_preview'])
      check(ids.has(id), `tool ${id}`)
  } catch (e) { check(false, `tools.yaml parse: ${e.message}`) }
} else check(false, 'missing tools.yaml')

// 4. Merge's added files
// per-tool guardrails: exist, parse, cover all 41 tools with complete fields
if (existsSync(toolsPath) && existsSync(join(root, 'references/tool-guardrails.json'))) {
  try {
    const reg = JSON.parse(readFileSync(toolsPath, 'utf8'))
    const g = JSON.parse(readFileSync(join(root, 'references/tool-guardrails.json'), 'utf8'))
    const fields = ['preconditions', 'common_mistakes', 'verify', 'failure']
    const missing = (reg.tools || []).filter(t => {
      const e = g[t.id]
      return !e || !['read', 'write', 'confirm'].includes(e.side_effect) || !fields.every(f => Array.isArray(e[f]) && e[f].length)
    }).map(t => t.id)
    check(missing.length === 0, missing.length ? `tool-guardrails incomplete for: ${missing.join(', ')}` : `tool-guardrails.json covers all ${reg.tools.length} tools`)
  } catch (e) { check(false, `tool-guardrails.json parse: ${e.message}`) }
} else check(false, 'missing references/tool-guardrails.json')
fileHas('rules/supplements.md', 'lint_request', 'doctor', 'Camera-less scan')
fileHas('references/two-transports.md', 'Door A', 'no CLI')
fileHas('references/renderer-awareness.md', 'Skyline', 'WebView')
fileHas('references/debug-discipline.md', 'Evidence-first', 'lint_request')
fileHas('references/approval-policy.md', '交互')
fileHas('references/map-skill-index.md', 'tencentmap')
fileHas('SECURITY.md')
if (existsSync(join(root, 'skill.yaml'))) {
  const v = readFileSync(join(root, 'skill.yaml'), 'utf8').match(/version:\s*([^\s]+)/)
  check(!!v, v ? `skill.yaml pinned to official ${v[1]}` : 'skill.yaml missing version')
} else check(false, 'missing skill.yaml')

// 5. Scripts + eval harness re-run green
for (const sc of ['doctor.mjs', 'lint_request.mjs', 'check_skill_version.mjs', 'validate-skill.mjs'])
  check(existsSync(join(root, 'scripts', sc)), `scripts/${sc}`)
check(existsSync(join(root, 'evals/run_all.mjs')), 'evals/run_all.mjs')
const ev = spawnSync('node', [join(root, 'evals/run_all.mjs')], { encoding: 'utf8' })
check(ev.status === 0, ev.status === 0 ? 'evals/run_all.mjs re-runs green' : `eval harness failed: ${(ev.stdout || '').split('\n').slice(-3).join(' ')}`)
const st = spawnSync('node', [join(root, 'scripts/doctor.mjs'), '--self-test'], { encoding: 'utf8' })
check(st.status === 0, 'doctor.mjs --self-test discriminates')

// 6. Informational: wechatide backend on PATH
const which = spawnSync('command', ['-v', 'wechatide'], { shell: true, encoding: 'utf8' })
warnCheck(which.status === 0 && (which.stdout || '').trim(), which.status === 0 ? 'wechatide backend on PATH' : 'wechatide NOT on PATH (informational — needs 微信开发者工具)')

const failed = results.filter(r => !r.ok)
for (const r of results) console.log(`${r.ok ? (r.warn ? 'warn' : 'PASS') : 'FAIL'}  ${r.name}`)
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `, ${failed.length} FAILED` : ''}`)
process.exit(failed.length ? 1 : 0)
