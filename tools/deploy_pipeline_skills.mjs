#!/usr/bin/env node
// deploy_pipeline_skills.mjs — deploy repo skills to the local installs with the
// vince- prefix, SAFELY.
//
// History: a global perl rename once mangled common-word skill names and a \s*$
// pattern merged frontmatter lines. Since pipeline-v2 all
// cross-skill references are PREFIX-TOLERANT by design (resolve `<name>` or
// `*-<name>`), so the deploy transform is exactly three renames and nothing else:
//   1. the installed directory name        -> vince-<install-name>
//   2. the frontmatter `name: <name>` line -> name: vince-<install-name>
//   3. the description trigger "$<name>"   -> "$vince-<install-name>"
// Everything else is copied verbatim; sibling references resolve at runtime.
//
// Usage:
//   node tools/deploy_pipeline_skills.mjs [--all] [--prefix vince-] [--dry-run] [--remove name ...] [name ...]
// Defaults: the four pipeline skills -> ~/.claude/skills and ~/.agents/skills.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DEFAULT_NAMES = ["skill-guidance", "skill-engineer", "skill-zipper", "skill-conductor"];
const INSTALL_NAME_ALIASES = {
  "test-driven-development": "tdd",
};
// Local install roots. Claude Code reads ~/.claude/skills; ~/.agents/skills is
// the vendor-neutral location several runtimes honor; OpenAI Codex reads its own
// ~/.codex/skills. All get the vince- prefix so a re-deploy keeps the three in
// sync. Roots whose parent dir is absent are skipped (that runtime isn't set up).
const DEST_ROOTS = [
  path.join(os.homedir(), ".claude", "skills"),
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".codex", "skills"),
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const prefixIdx = args.indexOf("--prefix");
const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : "vince-";
const removeIdx = args.indexOf("--remove");
const removeNames = removeIdx >= 0 ? args.slice(removeIdx + 1).filter((a) => !a.startsWith("--")) : [];
const names = args.filter((a, i) => (
  !a.startsWith("--") &&
  args[i - 1] !== "--prefix" &&
  (removeIdx < 0 || i <= removeIdx)
));
const allSkillNames = fs.readdirSync(path.join(REPO, "skills"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(REPO, "skills", e.name, "SKILL.md")))
  .map((e) => e.name)
  .sort();
const targets = all ? allSkillNames : (names.length ? names : DEFAULT_NAMES);

function installNameFor(name) {
  return INSTALL_NAME_ALIASES[name] || name;
}

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

function transformSkillMd(file, name, installName) {
  let text = fs.readFileSync(file, "utf8");
  const before = text;
  // (2) frontmatter name line — line-anchored, exact, once
  text = text.replace(new RegExp(`^name: ${name}$`, "m"), `name: ${prefix}${installName}`);
  // (3) the $-trigger token in the description — exact quoted form
  text = text.split(`"$${name}"`).join(`"$${prefix}${installName}"`);
  if (text === before) throw new Error(`${file}: expected transforms did not apply`);
  fs.writeFileSync(file, text);
}

function verify(installDir, srcDir, name, installName) {
  // the ONLY differences vs the repo must be the two SKILL.md lines we changed
  const problems = [];
  const skillMd = fs.readFileSync(path.join(installDir, "SKILL.md"), "utf8");
  if (!skillMd.includes(`name: ${prefix}${installName}`)) problems.push("frontmatter name not prefixed");
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
for (const name of removeNames) {
  const installName = installNameFor(name);
  for (const root of DEST_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const dest = path.join(root, `${prefix}${installName}`);
    if (!fs.existsSync(dest)) continue;
    if (dryRun) {
      console.log(`DRY remove ${dest}`);
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    console.log(`PASS removed ${dest}`);
  }
}

for (const name of targets) {
  const src = path.join(REPO, "skills", name);
  if (!fs.existsSync(path.join(src, "SKILL.md"))) {
    console.error(`SKIP ${name}: no SKILL.md at ${src}`);
    failed++;
    continue;
  }
  const installName = installNameFor(name);
  for (const root of DEST_ROOTS) {
    // Skip a runtime that isn't set up on this machine — don't create its home.
    if (!fs.existsSync(path.dirname(root))) {
      console.log(`skip ${path.dirname(root)} (runtime not installed)`);
      continue;
    }
    const dest = path.join(root, `${prefix}${installName}`);
    if (dryRun) { console.log(`DRY ${src} -> ${dest}`); continue; }
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), `deploy-${name}-`));
    const stagedSkill = path.join(staging, `${prefix}${installName}`);
    copyDir(src, stagedSkill);
    transformSkillMd(path.join(stagedSkill, "SKILL.md"), name, installName);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    fs.renameSync(stagedSkill, dest);
    const problems = verify(dest, src, name, installName);
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
