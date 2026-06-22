#!/usr/bin/env node
/**
 * Deterministic eval harness for the mp-cli-sup skill.
 *
 * Theme: the skill's DOCUMENTED contract (commands / shorthands / workflow steps /
 * error codes / version pins) must stay consistent with the REAL `vince-mp` CLI,
 * read live from `vince-mp capabilities --json`, plus internal cross-reference and
 * asset integrity. This is the machine-checkable core the skill was missing — its
 * eval-cases.json are judgment-based trajectory cases, not runnable.
 *
 * Modes:
 *   node run_all.mjs                 # check the real skill dir; exit 0 iff all checks pass
 *   node run_all.mjs --target <dir>  # check an arbitrary skill copy
 *   node run_all.mjs --self-test     # PROVE non-vacuity: for every check, seed a passing
 *                                    #   and a failing copy of the real skill and confirm the
 *                                    #   check flips. exit 0 iff every check discriminates.
 *   node run_all.mjs --json          # machine-readable result
 *
 * Grounding: requires the system `vince-mp` CLI (capabilities). If it is unavailable
 * the harness FAILS CLOSED (exit 2) rather than silently passing a hollow run.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const CLI = process.env.VINCE_MP_CLI_BIN || "vince-mp";
const SKILL_DIR = path.resolve(import.meta.dirname, "..");

// ---------- small fs helpers ----------
const exists = (dir, rel) => { try { return fs.statSync(path.join(dir, rel)).isFile(); } catch { return false; } };
const read = (dir, rel) => { try { return fs.readFileSync(path.join(dir, rel), "utf8"); } catch { return ""; } };
const write = (dir, rel, s) => fs.writeFileSync(path.join(dir, rel), s);
function parseJsonSafe(dir, rel) {
  try { return JSON.parse(read(dir, rel)); } catch { return null; }
}
function editJson(dir, rel, fn) {
  const j = parseJsonSafe(dir, rel) || {};
  fn(j);
  write(dir, rel, JSON.stringify(j, null, 2));
}
function editText(dir, rel, fn) {
  if (!exists(dir, rel)) return;
  write(dir, rel, fn(read(dir, rel)));
}

// ---------- the external ground truth ----------
function loadCapabilities() {
  const r = spawnSync(CLI, ["capabilities", "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    return { ok: false, error: r.stderr || r.error?.message || "vince-mp capabilities failed" };
  }
  try {
    return { ok: true, caps: JSON.parse(r.stdout) };
  } catch (e) {
    return { ok: false, error: "capabilities did not return JSON: " + e.message };
  }
}

// ---------- doc/contract context built from a skill dir ----------
const DOC_FILES = [
  "SKILL.md",
  "references/cli-contract.md",
  "references/evidence-and-failures.md",
  "references/skyline-media.md",
  "rules/runtime-protocol.md",
  "rules/ui-element-workflow.md",
];
function buildCtx(dir, caps) {
  const docText = DOC_FILES.filter((f) => exists(dir, f)).map((f) => read(dir, f)).join("\n");
  return {
    dir,
    caps,
    skillMd: exists(dir, "SKILL.md") ? read(dir, "SKILL.md") : "",
    cliContract: exists(dir, "references/cli-contract.md") ? read(dir, "references/cli-contract.md") : "",
    docText,
    manifest: parseJsonSafe(dir, "assets/release-manifest.json"),
    metricPlan: parseJsonSafe(dir, "assets/metric-plan.json"),
    evalCases: parseJsonSafe(dir, "assets/eval-cases.json"),
  };
}

// every `vince-mp <token>` first-token mentioned in text (placeholders like
// `vince-mp <command>` are skipped because "<" is not [a-z]).
function documentedInvocations(text) {
  const set = new Set();
  const re = /vince-mp\s+([a-z][a-z0-9-]*)/gi;
  let m;
  while ((m = re.exec(text))) set.add(m[1].toLowerCase());
  return set;
}
// only the code-span / fenced-block parts of a doc, so a prose heading like
// "session-first vince-mp execution" is NOT mistaken for a `vince-mp execution`
// command. Real CLI invocations in the skill always live in `code` / ```fences```.
function codeContexts(text) {
  const parts = [];
  for (const m of text.matchAll(/```[\s\S]*?```/g)) parts.push(m[0]);
  for (const m of text.matchAll(/`[^`\n]+`/g)) parts.push(m[0]);
  return parts.join("\n");
}
function validCommandTokens(caps) {
  return new Set([...(caps.commands || []), ...(caps.shorthands || [])]);
}
// the cli-contract "Supported step types: `...`" fenced list, as a set
function documentedStepSet(cliContract) {
  const m = cliContract.match(/Supported step types:\s*`([\s\S]*?)`/);
  if (!m) return null;
  return new Set(m[1].split(/[^A-Za-z]+/).filter(Boolean));
}

const REQUIRED_FILES = [
  "SKILL.md",
  "agents/openai.yaml",
  "rules/runtime-protocol.md",
  "rules/ui-element-workflow.md",
  "references/cli-contract.md",
  "references/skyline-media.md",
  "references/evidence-and-failures.md",
  "assets/eval-cases.json",
  "assets/skill-design-record.json",
  "assets/metric-plan.json",
  "assets/release-manifest.json",
  "scripts/validate-skill.mjs",
  "scripts/live-smoke-existing.mjs",
];

// ---------- the checks ----------
// Each check: { id, title, run(ctx) -> {ok, msg}, mkPass(dir,caps), mkFail(dir,caps) }
// mkPass produces a state where the check PASSES (identity when the real skill already
// passes); mkFail produces a state where it FAILS. --self-test verifies both directions.
const CHECKS = [
  {
    id: "required_files",
    title: "all required skill files exist",
    run(ctx) {
      const missing = REQUIRED_FILES.filter((f) => !exists(ctx.dir, f));
      return { ok: missing.length === 0, msg: missing.length ? `missing: ${missing.join(", ")}` : "all present" };
    },
    mkPass() {},
    mkFail(dir) { fs.rmSync(path.join(dir, "references/cli-contract.md")); },
  },
  {
    id: "skill_frontmatter",
    title: "SKILL.md frontmatter: name=mp-cli-sup, description >=80 chars, references the 5 module docs",
    run(ctx) {
      const fm = ctx.skillMd.match(/^---\n([\s\S]*?)\n---\n/);
      if (!fm) return { ok: false, msg: "no YAML frontmatter" };
      if (!/^name:\s*mp-cli-sup\s*$/m.test(fm[1])) return { ok: false, msg: "name is not mp-cli-sup" };
      const dm = fm[1].match(/^description:\s*(?:>\s*\n([\s\S]*)|(.+))$/m);
      const desc = dm ? (dm[1] || dm[2] || "").replace(/\s+/g, " ").trim() : "";
      if (desc.length < 80) return { ok: false, msg: `description too short (${desc.length})` };
      const refs = ["rules/runtime-protocol.md", "rules/ui-element-workflow.md", "references/cli-contract.md", "references/skyline-media.md", "references/evidence-and-failures.md"];
      const missing = refs.filter((r) => !ctx.skillMd.includes(r));
      return { ok: missing.length === 0, msg: missing.length ? `SKILL.md does not reference: ${missing.join(", ")}` : "ok" };
    },
    mkPass() {},
    mkFail(dir) { editText(dir, "SKILL.md", (s) => s.replace(/^name:\s*mp-cli-sup\s*$/m, "name: wrong-name")); },
  },
  {
    id: "assets_identify_skill",
    title: "the 4 asset JSONs parse and identify mp-cli-sup",
    run(ctx) {
      const files = ["assets/skill-design-record.json", "assets/metric-plan.json", "assets/release-manifest.json", "assets/eval-cases.json"];
      const bad = [];
      for (const f of files) {
        const j = parseJsonSafe(ctx.dir, f);
        if (!j) { bad.push(`${f}: invalid JSON`); continue; }
        const id = String(j.skill_id || j.skill?.id || "");
        if (!id.includes("mp-cli-sup")) bad.push(`${f}: skill id "${id}" missing mp-cli-sup`);
      }
      return { ok: bad.length === 0, msg: bad.length ? bad.join("; ") : "all identify mp-cli-sup" };
    },
    mkPass() {},
    mkFail(dir) { editJson(dir, "assets/release-manifest.json", (j) => { j.skill.id = "skill.other"; }); },
  },
  {
    id: "documented_commands_real",
    title: "every `vince-mp <cmd>` documented in the skill exists in `capabilities` (no fabricated commands)",
    run(ctx) {
      const valid = validCommandTokens(ctx.caps);
      const used = documentedInvocations(ctx.docText);
      const bad = [...used].filter((t) => !valid.has(t));
      return { ok: bad.length === 0, msg: bad.length ? `documented but not in capabilities: ${bad.join(", ")}` : `${used.size} tokens, all real` };
    },
    mkPass() {},
    mkFail(dir) { editText(dir, "SKILL.md", (s) => s + "\n\nTo reset everything, run vince-mp nukeall before debugging.\n"); },
  },
  {
    id: "workflow_steps_match_capabilities",
    title: "the cli-contract Supported-step-types list equals `capabilities.workflowSteps` exactly",
    run(ctx) {
      const documented = documentedStepSet(ctx.cliContract);
      if (!documented) return { ok: false, msg: "could not locate the 'Supported step types:' list in cli-contract.md" };
      const real = new Set(ctx.caps.workflowSteps || []);
      const extra = [...documented].filter((s) => !real.has(s));
      const missing = [...real].filter((s) => !documented.has(s));
      const ok = extra.length === 0 && missing.length === 0;
      return { ok, msg: ok ? `${real.size} steps match` : `extra(doc-only): [${extra.join(",")}] missing(cli-only): [${missing.join(",")}]` };
    },
    mkPass() {},
    mkFail(dir) { editText(dir, "references/cli-contract.md", (s) => s.replace(/mediaAction`/, "mediaAction, bogusStep`")); },
  },
  {
    id: "step_count_claim_matches",
    title: "any 'N step types' claim equals the real workflowSteps count",
    run(ctx) {
      const real = (ctx.caps.workflowSteps || []).length;
      const claims = [...ctx.docText.matchAll(/(\d+)\s+step types/g)].map((m) => Number(m[1]));
      if (claims.length === 0) return { ok: true, msg: "no explicit count claim (ok)" };
      const wrong = claims.filter((n) => n !== real);
      return { ok: wrong.length === 0, msg: wrong.length ? `claims ${wrong.join(",")} but capabilities has ${real} steps` : `claim matches ${real}` };
    },
    mkPass(dir, caps) { editText(dir, "SKILL.md", (s) => s.replace(/\d+\s+step types/g, "").trimEnd() + `\n\n(There are ${(caps.workflowSteps || []).length} step types.)\n`); },
    mkFail(dir) { editText(dir, "SKILL.md", (s) => s.replace(/\d+\s+step types/g, "").trimEnd() + "\n\n(There are 999 step types.)\n"); },
  },
  {
    id: "important_errors_covered",
    title: "every `capabilities.importantErrors` code is documented in the skill",
    run(ctx) {
      const codes = ctx.caps.importantErrors || [];
      const m = ctx.cliContract.match(/##\s*Error contract[\s\S]*?(?=\n##\s|$)/);
      const section = m ? m[0] : "";
      if (!section) return { ok: false, msg: "no '## Error contract' section in cli-contract.md" };
      const missing = codes.filter((c) => !section.includes(c));
      return { ok: missing.length === 0, msg: missing.length ? `important errors missing from the cli-contract error section: ${missing.join(", ")}` : `all ${codes.length} covered in the error contract` };
    },
    mkPass() {},
    mkFail(dir) { editText(dir, "references/cli-contract.md", (s) => s.replaceAll("CAMERA_MOCK_REQUIRES_FIXTURE", "REMOVED_CODE")); },
  },
  {
    id: "contract_coverage_complete",
    title: "every capabilities command + shorthand is documented somewhere in the skill (no real surface silently dropped)",
    run(ctx) {
      const need = [...(ctx.caps.commands || []), ...(ctx.caps.shorthands || [])];
      const invoked = documentedInvocations(ctx.docText);
      const documented = (t) => invoked.has(t) || ctx.docText.includes("`" + t + "`") || ctx.docText.includes("`" + t + " ") || ctx.docText.includes("`" + t + "<") || ctx.docText.includes("`" + t + " [");
      const missing = need.filter((t) => !documented(t));
      return { ok: missing.length === 0, msg: missing.length ? `CLI commands/shorthands not documented: ${missing.join(", ")}` : `all ${need.length} commands+shorthands documented` };
    },
    mkPass() {},
    mkFail(dir) { for (const f of DOC_FILES) editText(dir, f, (s) => s.replaceAll("sysinfo", "REMOVEDsh")); },
  },
  {
    id: "safety_contract_documented",
    title: "the CLI safety contract (attach-forbidden fields + no-implicit side effects) is reflected in the docs with correct polarity",
    run(ctx) {
      const problems = [];
      const forbidden = ctx.caps.connectionModes?.attach?.forbidden || [];
      for (const f of forbidden) if (!ctx.docText.includes(f)) problems.push(`attach-forbidden field "${f}" not documented`);
      if (forbidden.length && !/must not include/i.test(ctx.docText)) problems.push("attach 'must not include <field>' contract not stated");
      const sd = ctx.caps.safeDefaults || {};
      const implicitFalse = Object.entries(sd).filter(([k, v]) => k.startsWith("implicit") && v === false);
      if (implicitFalse.length && !/no implicit/i.test(ctx.docText)) problems.push("safeDefaults 'no implicit ...' side-effect contract not stated");
      return { ok: problems.length === 0, msg: problems.length ? problems.join("; ") : "attach-forbidden + no-implicit safety contract reflected" };
    },
    mkPass() {},
    mkFail(dir) { for (const f of DOC_FILES) editText(dir, f, (s) => s.replace(/must not include/i, "may freely include")); },
  },
  {
    id: "design_record_eval_ids_match",
    title: "skill-design-record eval_case_ids match the eval-cases.json case ids exactly",
    run(ctx) {
      const rec = parseJsonSafe(ctx.dir, "assets/skill-design-record.json");
      const ids = new Set((ctx.evalCases?.cases || []).map((c) => c.id));
      const recIds = new Set(rec?.test_assets?.eval_case_ids || []);
      const missingInRec = [...ids].filter((i) => !recIds.has(i));
      const extraInRec = [...recIds].filter((i) => !ids.has(i));
      const ok = missingInRec.length === 0 && extraInRec.length === 0 && ids.size > 0;
      return { ok, msg: ok ? `${ids.size} eval ids match the design record` : `record-missing: [${missingInRec.join(",")}] record-extra: [${extraInRec.join(",")}]` };
    },
    mkPass() {},
    mkFail(dir) { editJson(dir, "assets/skill-design-record.json", (j) => { j.test_assets.eval_case_ids = (j.test_assets.eval_case_ids || []).slice(0, 2); }); },
  },
  {
    id: "cli_compat_pin_current",
    title: "release-manifest `vince-mp-cli@X` pins match the installed CLI version",
    run(ctx) {
      const real = ctx.caps.package?.version;
      if (!real) return { ok: false, msg: "capabilities did not report package.version" };
      const text = JSON.stringify(ctx.manifest || {});
      const pins = [...text.matchAll(/vince-mp-cli@([0-9][0-9.]*)/g)].map((m) => m[1]);
      if (pins.length === 0) return { ok: false, msg: "release-manifest pins no vince-mp-cli@<version>" };
      const stale = pins.filter((p) => p !== real);
      return { ok: stale.length === 0, msg: stale.length ? `pins ${stale.join(",")} but installed CLI is ${real}` : `pin matches ${real}` };
    },
    mkPass(dir, caps) { editText(dir, "assets/release-manifest.json", (s) => s.replace(/vince-mp-cli@[0-9][0-9.]*/g, `vince-mp-cli@${caps.package.version}`)); },
    mkFail(dir) { editText(dir, "assets/release-manifest.json", (s) => s.replace(/vince-mp-cli@[0-9][0-9.]*/g, "vince-mp-cli@9.9.9")); },
  },
  {
    id: "skill_version_coherent",
    title: "release-manifest skill.version equals metric-plan candidate.new_skill_version",
    run(ctx) {
      const mv = ctx.manifest?.skill?.version;
      const cv = ctx.metricPlan?.candidate?.new_skill_version;
      if (!mv || !cv) return { ok: false, msg: `missing version (manifest=${mv}, metric-plan=${cv})` };
      return { ok: mv === cv, msg: mv === cv ? `both ${mv}` : `manifest ${mv} != metric-plan candidate ${cv}` };
    },
    mkPass(dir) { const cv = parseJsonSafe(dir, "assets/metric-plan.json")?.candidate?.new_skill_version; editJson(dir, "assets/release-manifest.json", (j) => { j.skill.version = cv; }); },
    mkFail(dir) { editJson(dir, "assets/release-manifest.json", (j) => { j.skill.version = "0.0.0-bad"; }); },
  },
  {
    id: "eval_cases_integrity",
    title: "eval-cases.json shape valid AND every command it references is real",
    run(ctx) {
      const ec = ctx.evalCases;
      if (!ec || !Array.isArray(ec.cases)) return { ok: false, msg: "eval-cases.json missing cases[]" };
      if (ec.cases.length < 4) return { ok: false, msg: `only ${ec.cases.length} cases (<4)` };
      const types = new Set(ec.cases.map((c) => c.case_type));
      const needType = ["happy_path", "boundary_path", "negative_path", "adversarial_path"].filter((t) => !types.has(t));
      if (needType.length) return { ok: false, msg: `missing case types: ${needType.join(", ")}` };
      const badShape = ec.cases.filter((c) => !c.id || !c.task_zh || !Array.isArray(c.acceptance_criteria)).map((c) => c.id || "<no id>");
      if (badShape.length) return { ok: false, msg: `bad case shape: ${badShape.join(", ")}` };
      const valid = validCommandTokens(ctx.caps);
      const blob = ec.cases.map((c) => [c.task_zh, ...(c.acceptance_criteria || [])].join(" ")).join(" ");
      const bad = [...documentedInvocations(blob)].filter((t) => !valid.has(t));
      return { ok: bad.length === 0, msg: bad.length ? `eval cases reference unknown commands: ${bad.join(", ")}` : `${ec.cases.length} cases, commands real` };
    },
    mkPass() {},
    mkFail(dir) {
      editJson(dir, "assets/eval-cases.json", (j) => { j.cases[0].acceptance_criteria[0] += " Use vince-mp fakecmd here."; });
    },
  },
];

// ---------- runners ----------
function freshCopy(srcDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mpcli-selftest-"));
  const dst = path.join(tmp, "skill");
  fs.cpSync(srcDir, dst, { recursive: true });
  return { tmp, dst };
}

function runAll(targetDir, caps) {
  const ctx = buildCtx(targetDir, caps);
  return CHECKS.map((c) => { const r = c.run(ctx); return { id: c.id, title: c.title, ok: !!r.ok, msg: r.msg }; });
}

function selfTest(caps, baseDir) {
  const results = [];
  for (const c of CHECKS) {
    let passOk = null, failOk = null, err = null;
    try {
      const a = freshCopy(baseDir);
      try { (c.mkPass || (() => {}))(a.dst, caps); passOk = c.run(buildCtx(a.dst, caps)).ok; }
      finally { fs.rmSync(a.tmp, { recursive: true, force: true }); }
      const b = freshCopy(baseDir);
      try { c.mkFail(b.dst, caps); failOk = c.run(buildCtx(b.dst, caps)).ok; }
      finally { fs.rmSync(b.tmp, { recursive: true, force: true }); }
    } catch (e) { err = e.message; }
    const discriminates = err === null && passOk === true && failOk === false;
    results.push({ id: c.id, discriminates, passOk, failOk, err });
  }
  return results;
}

// ---------- main ----------
const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const wantSelfTest = argv.includes("--self-test");
const ti = argv.indexOf("--target");
if (ti >= 0 && !argv[ti + 1]) { console.error("FAIL: --target requires a directory argument"); process.exit(2); }
const targetDir = ti >= 0 ? path.resolve(argv[ti + 1]) : SKILL_DIR;

const capRes = loadCapabilities();
if (!capRes.ok) {
  if (wantJson) console.log(JSON.stringify({ ok: false, error: `cannot ground against the vince-mp CLI — ${capRes.error}` }));
  else {
    console.error(`FAIL: cannot ground against the vince-mp CLI — ${capRes.error}`);
    console.error("(the harness fails closed: a contract check with no contract is not a check)");
  }
  process.exit(2);
}
const caps = capRes.caps;

if (wantSelfTest) {
  const results = selfTest(caps, targetDir);
  const broken = results.filter((r) => !r.discriminates);
  if (wantJson) console.log(JSON.stringify({ mode: "self-test", results }, null, 2));
  else {
    for (const r of results) {
      console.log(`${r.discriminates ? "DISCRIMINATES" : "VACUOUS      "} ${r.id}` +
        (r.discriminates ? "" : `  (pass=${r.passOk} fail=${r.failOk}${r.err ? " err=" + r.err : ""})`));
    }
    console.log(`\nself-test: ${results.length - broken.length}/${results.length} checks proven to discriminate (pass-clean + fail-on-seeded-defect)`);
  }
  process.exit(broken.length === 0 ? 0 : 1);
}

const results = runAll(targetDir, caps);
const failed = results.filter((r) => !r.ok);
if (wantJson) console.log(JSON.stringify({ mode: "run", target: targetDir, results }, null, 2));
else {
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.id}: ${r.msg}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? ` — FAILING: ${failed.map((f) => f.id).join(", ")}` : ""));
}
process.exit(failed.length === 0 ? 0 : 1);
