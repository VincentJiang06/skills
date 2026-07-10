#!/usr/bin/env node
// check_skill_version.mjs — reconcile the vendored official skill against the IDE's built-in copy.
// The vendored skills/ + tools.yaml are a point-in-time copy; DevTools ships the authoritative one and
// self-updates. When they drift, `check_devtools_status --skill-version` warns at runtime; this script
// catches the drift statically (no DevTools connection needed — it reads the built-in skill.yaml on disk).
//
//   node scripts/check_skill_version.mjs [--json]
//   WECHAT_DEVTOOLS_SKILL_DIR=/path/to/miniprogram-dev-skill node scripts/check_skill_version.mjs
//
// Exit: 0 = in sync (or IDE copy not found -> unknown, non-fatal); 1 = drift detected.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const skillRoot = join(here, '..')

// minimal `version: x.y.z` reader (skill.yaml is a one-liner; avoid a YAML dep)
function readVersion(yamlPath) {
  if (!existsSync(yamlPath)) return null
  const m = readFileSync(yamlPath, 'utf8').match(/^\s*version:\s*['"]?([^'"\s]+)['"]?\s*$/m)
  return m ? m[1] : null
}

const CANDIDATE_IDE_DIRS = [
  process.env.WECHAT_DEVTOOLS_SKILL_DIR,
  '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/miniprogram-dev-skill',
].filter(Boolean)

const vendored = readVersion(join(skillRoot, 'skill.yaml'))
let ideDir = null, ideVersion = null
for (const d of CANDIDATE_IDE_DIRS) {
  const v = readVersion(join(d, 'skill.yaml'))
  if (v) { ideDir = d; ideVersion = v; break }
}

const json = process.argv.includes('--json')
let status, message, exit
if (!vendored) { status = 'error'; message = 'vendored skill.yaml has no version'; exit = 1 }
else if (!ideVersion) { status = 'unknown'; message = `IDE built-in skill not found (checked ${CANDIDATE_IDE_DIRS.length} path(s)); cannot reconcile — vendored=${vendored}`; exit = 0 }
else if (ideVersion === vendored) { status = 'in-sync'; message = `vendored=${vendored} == IDE=${ideVersion}`; exit = 0 }
else { status = 'drift'; message = `vendored=${vendored} != IDE=${ideVersion} — re-sync skills/, miniprogram-tools/, references/, skill.yaml from ${ideDir}, then bump vendored-official-skill in SKILL.md`; exit = 1 }

if (json) console.log(JSON.stringify({ status, vendored, ideVersion, ideDir, message }, null, 2))
else console.log(`skill-version: ${status.toUpperCase()} — ${message}`)
process.exit(exit)
