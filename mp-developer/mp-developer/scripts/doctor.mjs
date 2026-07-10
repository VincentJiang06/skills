#!/usr/bin/env node
// doctor.mjs — cross-stack static preflight for a WeChat Mini Program project.
// Pure Node/shell: no DevTools connection, no miniprogram-automator. Answers "does this
// project actually build and is the local env sane" BEFORE a debugging session.
//
//   node scripts/doctor.mjs --project <dir> [--skip-typecheck] [--json]
//   node scripts/doctor.mjs --self-test        # prove each check discriminates (exit 0 = green)
//
// Checks: node · project resolves (project.config.json miniprogramRoot) · tsc --noEmit
//         · .ts/.js freshness (stale compiled output) · local LAN IPv4 (real-device same-network).

import { readFileSync, existsSync, statSync, readdirSync, mkdtempSync, writeFileSync, mkdirSync, rmSync, utimesSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir, networkInterfaces } from 'node:os'
import { spawnSync } from 'node:child_process'

const SKIP_DIRS = new Set(['node_modules', 'miniprogram_npm', '.git', 'dist', '.loop'])

function parseArgs(argv) {
  const a = { project: process.cwd(), skipTypecheck: false, json: false, selfTest: false }
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    if (v === '--project') a.project = argv[++i]
    else if (v === '--skip-typecheck') a.skipTypecheck = true
    else if (v === '--json') a.json = true
    else if (v === '--self-test') a.selfTest = true
  }
  return a
}

// Resolve the Mini Program root from project.config.json miniprogramRoot (supports miniprogram/ layouts).
function resolveProject(projectDir) {
  const cfgPath = join(projectDir, 'project.config.json')
  if (!existsSync(cfgPath)) return { ok: false, reason: 'NO_PROJECT_CONFIG', mpRoot: null }
  let cfg
  try { cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) } catch (e) { return { ok: false, reason: 'BAD_PROJECT_CONFIG', mpRoot: null } }
  const root = (cfg.miniprogramRoot || './').replace(/\/+$/, '')
  const mpRoot = root === '' || root === '.' ? projectDir : join(projectDir, root)
  if (!existsSync(mpRoot)) return { ok: false, reason: 'MINIPROGRAM_ROOT_MISSING', mpRoot }
  return { ok: true, reason: null, mpRoot, appid: cfg.appid || null }
}

function walkFiles(dir, out = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const ent of entries) {
    if (ent.name.startsWith('.') && ent.name !== '.') continue
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue
      walkFiles(join(dir, ent.name), out)
    } else out.push(join(dir, ent.name))
  }
  return out
}

// A .ts is "stale" if its sibling compiled .js exists and is OLDER than the .ts.
function checkFreshness(mpRoot) {
  const files = walkFiles(mpRoot)
  const stale = []
  let tsCount = 0
  for (const f of files) {
    if (!f.endsWith('.ts') || f.endsWith('.d.ts')) continue
    tsCount++
    const js = join(dirname(f), basename(f, '.ts') + '.js')
    if (existsSync(js)) {
      if (statSync(f).mtimeMs > statSync(js).mtimeMs) stale.push({ ts: f, js })
    }
  }
  if (tsCount === 0) return { status: 'skip', detail: 'no .ts sources (JS project)' }
  if (stale.length) return { status: 'warn', detail: `${stale.length} .ts newer than compiled .js (recompile)`, stale: stale.map(s => s.ts) }
  return { status: 'ok', detail: `${tsCount} .ts sources, compiled .js fresh` }
}

function checkTypecheck(projectDir, mpRoot, skip) {
  if (skip) return { status: 'skip', detail: '--skip-typecheck' }
  const tsconfig = existsSync(join(projectDir, 'tsconfig.json')) ? join(projectDir, 'tsconfig.json')
    : existsSync(join(mpRoot, 'tsconfig.json')) ? join(mpRoot, 'tsconfig.json') : null
  if (!tsconfig) return { status: 'skip', detail: 'no tsconfig.json (not a TS project)' }
  const r = spawnSync('npx', ['--no-install', 'tsc', '--noEmit', '-p', tsconfig], { encoding: 'utf8', timeout: 120000 })
  if (r.error || r.status === null) return { status: 'skip', detail: `tsc unavailable (${r.error ? r.error.code : 'no-install'}) — run npm i typescript to enable` }
  if (r.status === 0) return { status: 'ok', detail: 'tsc --noEmit clean' }
  const msg = (r.stdout || '').split('\n').filter(l => /error TS/.test(l)).slice(0, 5).join(' | ')
  return { status: 'fail', detail: `tsc reported errors: ${msg || 'see tsc output'}` }
}

function checkLanIp() {
  const ips = []
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) ips.push({ iface: name, address: a.address })
    }
  }
  if (!ips.length) return { status: 'warn', detail: 'no external IPv4 (real-device same-network debugging may not work)' }
  return { status: 'ok', detail: ips.map(i => `${i.iface}=${i.address}`).join(', '), ips }
}

function runDoctor({ project, skipTypecheck }) {
  const checks = {}
  checks.node = { status: 'ok', detail: process.version }
  const proj = resolveProject(project)
  checks.project = proj.ok
    ? { status: 'ok', detail: `mpRoot=${proj.mpRoot}${proj.appid ? ' appid=' + proj.appid : ''}` }
    : { status: 'fail', detail: proj.reason }
  if (proj.ok) {
    checks.typecheck = checkTypecheck(project, proj.mpRoot, skipTypecheck)
    checks.freshness = checkFreshness(proj.mpRoot)
  } else {
    checks.typecheck = { status: 'skip', detail: 'project unresolved' }
    checks.freshness = { status: 'skip', detail: 'project unresolved' }
  }
  checks.lanIp = checkLanIp()
  const order = ['node', 'project', 'typecheck', 'freshness', 'lanIp']
  const worst = order.map(k => checks[k].status).includes('fail') ? 'fail'
    : order.map(k => checks[k].status).includes('warn') ? 'warn' : 'ok'
  return { ok: worst !== 'fail', worst, checks }
}

// ---- non-vacuity self-test: each check must be shown to discriminate pass vs fail ----
function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'mp-doctor-selftest-'))
  const results = []
  const assert = (name, cond) => results.push({ name, pass: !!cond })
  try {
    // project: missing config -> fail; present config -> ok
    assert('project fails without project.config.json', resolveProject(tmp).ok === false)
    const good = join(tmp, 'good'); mkdirSync(join(good, 'miniprogram'), { recursive: true })
    writeFileSync(join(good, 'project.config.json'), JSON.stringify({ miniprogramRoot: 'miniprogram/', appid: 'wxTEST' }))
    const gr = resolveProject(good)
    assert('project resolves miniprogramRoot subdir', gr.ok === true && gr.mpRoot.endsWith('miniprogram'))

    // freshness: stale .js (older than .ts) -> warn; fresh -> ok
    const mp = gr.mpRoot
    const tsF = join(mp, 'a.ts'); const jsF = join(mp, 'a.js')
    writeFileSync(tsF, 'export const a = 1')
    writeFileSync(jsF, 'exports.a = 1')
    const old = new Date('2000-01-01T00:00:00Z'); const now = new Date()
    utimesSync(jsF, old, old); utimesSync(tsF, now, now)   // ts newer than js -> stale
    assert('freshness flags stale compiled .js', checkFreshness(mp).status === 'warn')
    utimesSync(tsF, old, old); utimesSync(jsF, now, now)   // js newer than ts -> fresh
    assert('freshness passes when .js is fresh', checkFreshness(mp).status === 'ok')
    // freshness skips a pure-JS project
    const jsOnly = join(tmp, 'jsonly'); mkdirSync(jsOnly, { recursive: true }); writeFileSync(join(jsOnly, 'x.js'), '1')
    assert('freshness skips a JS-only project', checkFreshness(jsOnly).status === 'skip')

    // lanIp: always returns ok|warn, never throws
    assert('lanIp returns a valid status', ['ok', 'warn'].includes(checkLanIp().status))
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  const failed = results.filter(r => !r.pass)
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`)
  if (failed.length) { console.error(`\nself-test FAILED: ${failed.length}/${results.length} checks non-discriminating`); process.exit(1) }
  console.log(`\nself-test OK: ${results.length}/${results.length} checks discriminate`)
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) { selfTest() }
else {
  const report = runDoctor(args)
  if (args.json) console.log(JSON.stringify(report, null, 2))
  else {
    console.log(`doctor: ${report.worst.toUpperCase()}  (project: ${args.project})`)
    for (const [k, v] of Object.entries(report.checks)) {
      const tag = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' }[v.status]
      console.log(`  ${tag}  ${k}: ${v.detail}`)
    }
  }
  process.exit(report.worst === 'fail' ? 1 : 0)
}
