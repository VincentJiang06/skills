#!/usr/bin/env node
// deploy_pipeline_skills.mjs — deploy repo skills to the local installs with the
// vince- prefix, SAFELY.
//
// History: a global perl rename once mangled common-word skill names ("attacker",
// "neat") and a \s*$ pattern merged frontmatter lines. Since pipeline-v2 all
// cross-skill references are PREFIX-TOLERANT by design (resolve `<name>` or
// `*-<name>`), so the deploy transform is exactly three renames and nothing else:
//   1. the installed directory name        -> vince-<name>
//   2. the frontmatter `name: <name>` line -> name: vince-<name>
//   3. the description trigger "$<name>"   -> "$vince-<name>"
// Everything else is copied verbatim; sibling references resolve at runtime.
//
// Usage:
//   node tools/deploy_pipeline_skills.mjs [--prefix vince-] [--dry-run] [name ...]
// Defaults: the four pipeline skills -> ~/.claude/skills and ~/.agents/skills.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DEFAULT_NAMES = ["skill-guidance", "skill-engineer", "skill-zipper", "skill-conductor"];
const DEST_ROOTS = [
  path.join(os.homedir(), ".claude", "skills"),
  path.join(os.homedir(), ".agents", "skills"),
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const prefixIdx = args.indexOf("--prefix");
const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : "vince-";
const names = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--prefix");
const targets = names.length ? names : DEFAULT_NAMES;

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function transformSkillMd(file, name) {
  let text = fs.readFileSync(file, "utf8");
  const before = text;
  // (2) frontmatter name line — line-anchored, exact, once
  text = text.replace(new RegExp(`^name: ${name}$`, "m"), `name: ${prefix}${name}`);
  // (3) the $-trigger token in the description — exact quoted form
  text = text.split(`"$${name}"`).join(`"$${prefix}${name}"`);
  if (text === before) throw new Error(`${file}: expected transforms did not apply`);
  fs.writeFileSync(file, text);
}

function verify(installDir, srcDir, name) {
  // the ONLY differences vs the repo must be the two SKILL.md lines we changed
  const problems = [];
  const skillMd = fs.readFileSync(path.join(installDir, "SKILL.md"), "utf8");
  if (!skillMd.includes(`name: ${prefix}${name}`)) problems.push("frontmatter name not prefixed");
  if (skillMd.includes(`"$${name}"`)) problems.push("description $-trigger not prefixed");
  if (skillMd.includes(`${prefix}${prefix}`)) problems.push("double prefix detected");
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === ".DS_Store") return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  const rel = (root, p) => path.relative(root, p);
  const srcFiles = new Set(walk(srcDir).map((p) => rel(srcDir, p)));
  const dstFiles = new Set(walk(installDir).map((p) => rel(installDir, p)));
  for (const f of srcFiles) if (!dstFiles.has(f)) problems.push(`missing in install: ${f}`);
  for (const f of dstFiles) if (!srcFiles.has(f)) problems.push(`extra in install: ${f}`);
  for (const f of srcFiles) {
    if (!dstFiles.has(f)) continue;
    const a = fs.readFileSync(path.join(srcDir, f));
    const b = fs.readFileSync(path.join(installDir, f));
    if (!a.equals(b) && f !== "SKILL.md") problems.push(`unexpected content change: ${f}`);
  }
  return problems;
}

let failed = 0;
for (const name of targets) {
  const src = path.join(REPO, "skills", name);
  if (!fs.existsSync(path.join(src, "SKILL.md"))) {
    console.error(`SKIP ${name}: no SKILL.md at ${src}`);
    failed++;
    continue;
  }
  for (const root of DEST_ROOTS) {
    const dest = path.join(root, `${prefix}${name}`);
    if (dryRun) { console.log(`DRY ${src} -> ${dest}`); continue; }
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), `deploy-${name}-`));
    const stagedSkill = path.join(staging, `${prefix}${name}`);
    copyDir(src, stagedSkill);
    transformSkillMd(path.join(stagedSkill, "SKILL.md"), name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    fs.renameSync(stagedSkill, dest);
    const problems = verify(dest, src, name);
    if (problems.length) {
      console.log(`FAIL ${dest}: ${problems.join("; ")}`);
      failed++;
    } else {
      console.log(`PASS deployed ${name} -> ${dest}`);
    }
  }
}

console.log(failed === 0 ? "\nRESULT: GREEN" : `\nRESULT: RED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
