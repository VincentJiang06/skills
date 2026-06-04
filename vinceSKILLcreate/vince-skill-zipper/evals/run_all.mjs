#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(__dirname, "..");
const diffScript = path.join(skillDir, "scripts/diff_lossless.py");
const failures = [];

function check(name, predicate, detail) {
  if (predicate) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(`${name}: ${detail}`);
    console.log(`FAIL ${name} -- ${detail}`);
  }
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function runDiff(before, after) {
  const proc = childProcess.spawnSync("python3", [diffScript, before, after, "--json"], {
    encoding: "utf8"
  });
  return {
    status: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    json: proc.stdout ? JSON.parse(proc.stdout) : null
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "zipper-eval-"));

const unchangedBefore = path.join(root, "unchanged-before");
const unchangedAfter = path.join(root, "unchanged-after");
mkdirp(path.join(unchangedBefore, "rules"));
mkdirp(path.join(unchangedAfter, "rules"));
fs.writeFileSync(path.join(unchangedBefore, "SKILL.md"), "Preserve this exact fact.\n");
fs.writeFileSync(path.join(unchangedAfter, "SKILL.md"), "Preserve this exact fact.\n");
fs.writeFileSync(path.join(unchangedBefore, "rules/a.md"), "Moved detail stays verbatim.\n");
fs.writeFileSync(path.join(unchangedAfter, "rules/a.md"), "Moved detail stays verbatim.\n");

let result = runDiff(unchangedBefore, unchangedAfter);
check(
  "diff_lossless exits 0 for verbatim preservation",
  result.status === 0 && result.json.counts.lost === 0 && result.json.counts.rewritten === 0,
  result.stderr || result.stdout
);

const rewriteBefore = path.join(root, "rewrite-before");
const rewriteAfter = path.join(root, "rewrite-after");
mkdirp(rewriteBefore);
mkdirp(rewriteAfter);
fs.writeFileSync(path.join(rewriteBefore, "SKILL.md"), "Always ask before writing files.\n");
fs.writeFileSync(path.join(rewriteAfter, "SKILL.md"), "Always ask before editing files.\n");

result = runDiff(rewriteBefore, rewriteAfter);
check(
  "diff_lossless exits 1 for unclassified rewrite",
  result.status === 1 && result.json.counts.rewritten === 1,
  result.stderr || result.stdout
);

const scriptBefore = path.join(root, "script-before");
const scriptAfter = path.join(root, "script-after");
mkdirp(path.join(scriptBefore, "scripts"));
mkdirp(path.join(scriptAfter, "scripts"));
fs.writeFileSync(path.join(scriptBefore, "scripts/guard.py"), "def guard():\n    return 'script fact'\n");
fs.writeFileSync(path.join(scriptAfter, "scripts/guard.py"), "def guard():\n    return 'script fact, hardened'\n");

result = runDiff(scriptBefore, scriptAfter);
check(
  "diff_lossless scans script files",
  result.status === 1 && result.json.counts.rewritten >= 1,
  result.stderr || result.stdout
);

if (failures.length) {
  console.error(`\nRESULT: RED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("\nRESULT: GREEN");
