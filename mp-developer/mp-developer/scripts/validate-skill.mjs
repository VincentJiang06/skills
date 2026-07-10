#!/usr/bin/env node
// validate-skill.mjs — structural validation of the mp-developer skill.
// Verifies the vendored official content + the merge's added files are all present and well-formed,
// the tool registry parses, and (informationally) that the wechatide backend is on PATH.
//
//   node scripts/validate-skill.mjs

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []
const pass = (n, d = '') => results.push({ ok: true, n, d })
const fail = (n, d = '') => results.push({ ok: false, n, d })

function fileHas(rel, ...needles) {
  const p = join(root, rel)
  if (!existsSync(p)) { fail(`missing ${rel}`); return false }
  const s = readFileSync(p, 'utf8')
  for (const nd of needles) if (!s.includes(nd)) { fail(`${rel} missing "${nd}"`); return false }
  pass(`${rel}`)
  return true
}

// 1. Root skill + frontmatter
if (existsSync(join(root, 'SKILL.md'))) {
  const s = readFileSync(join(root, 'SKILL.md'), 'utf8')
  const fm = s.startsWith('---') ? s.slice(3, s.indexOf('\n---', 3)) : ''
  if (/name:\s*mp-developer/.test(fm)) pass('SKILL.md name: mp-developer'); else fail('SKILL.md frontmatter name != mp-developer')
  if (/description:/.test(fm)) pass('SKILL.md has description'); else fail('SKILL.md missing description')
  if (/version:/.test(fm)) pass('SKILL.md has version'); else fail('SKILL.md missing version')
  if (/check_devtools_status/.test(s)) pass('SKILL.md documents the mandatory preflight'); else fail('SKILL.md missing check_devtools_status preflight')
} else fail('missing SKILL.md')

// 2. Vendored official scenes (the 7)
const SCENES = ['initializer', 'automator', 'debugger', 'compiler', 'previewer', 'project-manager', 'cloudbase-operator']
for (const sc of SCENES) {
  const p = join(root, 'skills', sc, 'SKILL.md')
  if (!existsSync(p)) { fail(`missing scene skills/${sc}/SKILL.md`); continue }
  if (/^---[\s\S]*?name:\s*/m.test(readFileSync(p, 'utf8'))) pass(`scene ${sc}`); else fail(`scene ${sc} missing frontmatter name`)
}

// 3. Tool registry parses + expected size (vendored v0.2.5 = 41 tools)
const toolsPath = join(root, 'miniprogram-tools/references/tools.yaml')
if (existsSync(toolsPath)) {
  try {
    const reg = JSON.parse(readFileSync(toolsPath, 'utf8'))
    const n = Array.isArray(reg.tools) ? reg.tools.length : 0
    if (n >= 40) pass(`tools.yaml parses, ${n} tools`); else fail(`tools.yaml only ${n} tools (expected ~41)`)
    // spot-check a few canonical tool ids across groups
    const ids = new Set((reg.tools || []).map(t => t.id))
    for (const id of ['check_devtools_status', 'automation_element_action', 'cloud_fn_deploy', 'auto_preview'])
      if (ids.has(id)) pass(`tool ${id} present`); else fail(`tool ${id} missing from registry`)
  } catch (e) { fail(`tools.yaml does not parse: ${e.message}`) }
} else fail('missing miniprogram-tools/references/tools.yaml')

// 4. The merge's added supplement files
fileHas('rules/supplements.md', 'doctor', 'Camera-less scan')
fileHas('references/two-transports.md', 'Door A', 'Door B')
fileHas('references/renderer-awareness.md', 'Skyline', 'WebView')
fileHas('references/debug-discipline.md', 'Evidence-first', 'Safe defaults')
fileHas('references/approval-policy.md', '交互')
fileHas('references/map-skill-index.md', 'tencentmap')
fileHas('SECURITY.md')
// skill.yaml version pin (must stay = vendored official version for runtime reconciliation)
if (fileHas('skill.yaml', 'version:')) {
  const v = readFileSync(join(root, 'skill.yaml'), 'utf8').match(/version:\s*([^\s]+)/)
  if (v) pass(`skill.yaml pinned to official ${v[1]}`)
}

// 5. Scripts present + doctor self-test discriminates
for (const sc of ['doctor.mjs', 'check_skill_version.mjs', 'validate-skill.mjs', 'automator-escape-hatch.mjs'])
  existsSync(join(root, 'scripts', sc)) ? pass(`scripts/${sc}`) : fail(`missing scripts/${sc}`)
const st = spawnSync('node', [join(root, 'scripts/doctor.mjs'), '--self-test'], { encoding: 'utf8' })
if (st.status === 0) pass('doctor.mjs --self-test discriminates'); else fail(`doctor.mjs --self-test failed: ${(st.stdout || '') + (st.stderr || '')}`)

// 6. Informational: wechatide backend on PATH (Door A)
const which = spawnSync('command', ['-v', 'wechatide'], { shell: true, encoding: 'utf8' })
if (which.status === 0 && (which.stdout || '').trim()) results.push({ ok: true, n: 'wechatide backend on PATH', info: true })
else results.push({ ok: true, n: 'wechatide NOT on PATH (Door A needs 微信开发者工具 installed — informational)', info: true, warn: true })

// ---- report ----
const failed = results.filter(r => !r.ok)
for (const r of results) console.log(`${r.ok ? (r.warn ? 'warn' : 'PASS') : 'FAIL'}  ${r.n}${r.d ? ' — ' + r.d : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `, ${failed.length} FAILED` : ''}`)
process.exit(failed.length ? 1 : 0)
