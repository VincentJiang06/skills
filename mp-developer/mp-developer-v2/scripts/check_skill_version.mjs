#!/usr/bin/env node
// check_skill_version.mjs — reconcile the vendored official skill against the IDE's built-in copy.
// The vendored skills/ + tools.yaml are a point-in-time copy; DevTools ships the authoritative one and
// self-updates. When they drift, `check_devtools_status --skill-version` warns at runtime; this script
// catches the drift statically (no DevTools connection needed — it reads the built-in skill.yaml on disk).
//
//   node scripts/check_skill_version.mjs [--json]
//   WECHAT_DEVTOOLS_SKILL_DIR=/path/to/miniprogram-dev-skill node scripts/check_skill_version.mjs
//
// Exit: 0 = in sync (or IDE copy not found -> unknown, non-fatal); 1 = drift/error.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// minimal `version: x.y.z` reader (skill.yaml is a one-liner; avoid a YAML dep)
export function readVersion(yamlPath) {
  if (!existsSync(yamlPath)) return null
  const m = readFileSync(yamlPath, 'utf8').match(/^\s*version:\s*['"]?([^'"\s]+)['"]?\s*$/m)
  return m ? m[1] : null
}

// Pure reconciliation: given the two version strings, decide status/message/exit.
export function reconcile(vendored, ideVersion, ideDir = null) {
  if (!vendored) return { status: 'error', vendored, ideVersion, ideDir, message: 'vendored skill.yaml has no version', exit: 1 }
  if (!ideVersion) return { status: 'unknown', vendored, ideVersion, ideDir, message: `IDE built-in skill not found; cannot reconcile — vendored=${vendored}`, exit: 0 }
  if (ideVersion === vendored) return { status: 'in-sync', vendored, ideVersion, ideDir, message: `vendored=${vendored} == IDE=${ideVersion}`, exit: 0 }
  return { status: 'drift', vendored, ideVersion, ideDir, message: `vendored=${vendored} != IDE=${ideVersion} — re-sync skills/, miniprogram-tools/, references/, skill.yaml from ${ideDir}, then bump vendored-official-skill in SKILL.md`, exit: 1 }
}

// Candidate IDE-skill dirs to reconcile against. If the override env is set, honor it EXCLUSIVELY —
// a bad/empty override path must resolve to `unknown`, never silently fall back to the auto-discovered
// /Applications install and emit a false `in-sync` (that would mask real drift). No override → default.
export function resolveCandidates(env) {
  if (env) return [env]
  return ['/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/miniprogram-dev-skill']
}

export function reconcileFromDisk(skillRoot, candidateDirs) {
  const vendored = readVersion(join(skillRoot, 'skill.yaml'))
  let ideDir = null, ideVersion = null
  for (const d of candidateDirs) {
    const v = readVersion(join(d, 'skill.yaml'))
    if (v) { ideDir = d; ideVersion = v; break }
  }
  return reconcile(vendored, ideVersion, ideDir)
}

function isMain() {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] } catch { return false }
}
if (isMain()) {
  const here = dirname(fileURLToPath(import.meta.url))
  const skillRoot = join(here, '..')
  const r = reconcileFromDisk(skillRoot, resolveCandidates(process.env.WECHAT_DEVTOOLS_SKILL_DIR))
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2))
  else console.log(`skill-version: ${r.status.toUpperCase()} — ${r.message}`)
  process.exit(r.exit)
}
