#!/usr/bin/env node
// validate_spec.mjs — the executable G gate for a guidance handoff spec.
//
// Why a script: the spec's consistency rules (7 pillars, score↔status, the
// required-pillar cap, checklist format, gap→action mapping) used to live only
// in prose, so nothing enforced them — the shipped example itself violated the
// cap rule for months without anyone noticing. A gate that can't run can't bite.
// skill-guidance runs this before emitting; skill-conductor runs it AS Stage G's
// gate instead of copying a node -e one-liner out of markdown.
//
// Usage:
//   node scripts/validate_spec.mjs <target-dir | spec.json> [--audit] [--json]
//   node scripts/validate_spec.mjs --selftest
//
// <target-dir> resolves to <target>/.skill-guidance/handoff-spec.json
// (or post-build-audit.json with --audit). Exit 0 = schema-valid + internally
// consistent; 1 = gate fails; 2 = usage/IO error.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(HERE, "..", "assets", "handoff-spec.schema.json");

const PILLARS = ["design", "research", "testing", "tdd", "metrics", "low_context_kb", "lifecycle"];

// Required-pillar table by altitude. Human rationale lives in rules/altitude.md;
// this constant is the enforcement point (altitude.md names this script so the
// two can't drift silently — round6 asserts they agree).
export const REQUIRED_AT = {
  lite: ["design", "low_context_kb"],
  full: ["design", "low_context_kb", "testing", "tdd", "metrics"],
};

// --- minimal JSON-schema subset validator (covers what the handoff schema uses) ---
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

export function validateSchema(schema, value, at = "$", errs = []) {
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length) {
    const actual = typeOf(value);
    const ok = types.some((t) => t === actual || (t === "number" && actual === "integer"));
    if (!ok) { errs.push(`${at}: expected ${types.join("|")}, got ${actual}`); return errs; }
  }
  if ("const" in schema && value !== schema.const) errs.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at}: must be one of ${schema.enum.join("|")}, got ${JSON.stringify(value)}`);
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) errs.push(`${at}: shorter than minLength ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: does not match pattern /${schema.pattern}/`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${at}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${at}: above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${at}: fewer than minItems ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${at}: more than maxItems ${schema.maxItems}`);
    if (schema.items) value.forEach((v, i) => validateSchema(schema.items, v, `${at}[${i}]`, errs));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) errs.push(`${at}: missing required '${k}'`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) validateSchema(schema.properties[k], v, `${at}.${k}`, errs);
      else if (schema.additionalProperties === false && schema.properties) errs.push(`${at}: unknown property '${k}'`);
    }
  }
  return errs;
}

// --- consistency checks beyond the schema (the rules prose used to only describe) ---
export function checkConsistency(spec) {
  const errs = [];
  const warns = [];
  const sc = Array.isArray(spec.scorecard) ? spec.scorecard : [];
  const seen = sc.map((e) => e.pillar);
  for (const p of PILLARS) if (!seen.includes(p)) errs.push(`scorecard: missing pillar '${p}'`);
  if (new Set(seen).size !== seen.length) errs.push("scorecard: duplicate pillar entries");

  const SCORE_FOR = { present: 2, partial: 1, absent: 0 };
  for (const e of sc) {
    if (e.status === "na") {
      if (e.score !== null) errs.push(`scorecard.${e.pillar}: status 'na' requires score null, got ${e.score}`);
    } else if (e.score !== SCORE_FOR[e.status]) {
      errs.push(`scorecard.${e.pillar}: status '${e.status}' requires score ${SCORE_FOR[e.status]}, got ${e.score}`);
    }
  }

  const scored = sc.filter((e) => e.status !== "na");
  const sum = scored.reduce((a, e) => a + (e.score ?? 0), 0);
  const denom = 2 * scored.length;
  const ratio = denom ? sum / denom : 0;
  const or = spec.overall_readiness ?? {};
  if (denom && typeof or.ratio === "number" && Math.abs(or.ratio - ratio) > 0.005) {
    errs.push(`overall_readiness.ratio ${or.ratio} != computed ${(ratio).toFixed(3)} (${sum}/${denom})`);
  }

  const required = REQUIRED_AT[spec.altitude] ?? [];
  const band = ratio >= 0.85 ? "industrial" : ratio >= 0.55 ? "candidate" : "draft";
  const cappingPillars = scored.filter((e) => required.includes(e.pillar) && e.status === "absent").map((e) => e.pillar);
  const expected = cappingPillars.length ? "draft" : band;
  if (denom && or.verdict && or.verdict !== expected) {
    errs.push(`verdict '${or.verdict}' inconsistent: ratio band '${band}'${cappingPillars.length ? ` capped to 'draft' by required-absent [${cappingPillars.join(",")}]` : ""} => expected '${expected}'`);
  }
  for (const e of sc) {
    if (required.includes(e.pillar) && e.status === "na") {
      errs.push(`scorecard.${e.pillar}: required at altitude '${spec.altitude}', may not be 'na'`);
    }
  }

  for (const [i, entry] of (spec.recommended_design?.adversarial_checklist ?? []).entries()) {
    const parts = String(entry).split("→");
    if (parts.length !== 2 || !parts[0].trim() || parts[1].trim().length < 3) {
      const hint = /->/.test(String(entry)) ? " (use the literal Unicode arrow → U+2192, not ASCII '->')" : "";
      errs.push(`adversarial_checklist[${i}]: need 'input/hazard → expected output'${hint}, got '${entry}'`);
    }
  }

  const actions = Array.isArray(spec.prioritized_actions) ? spec.prioritized_actions : [];
  const actionPillars = new Set(actions.map((a) => a.pillar));
  for (const e of scored) {
    if ((e.status === "absent" || e.status === "partial") && !actionPillars.has(e.pillar)) {
      errs.push(`pillar '${e.pillar}' is ${e.status} but no prioritized_action targets it`);
    }
  }
  for (const p of cappingPillars) {
    if (!actions.some((a) => a.pillar === p && a.priority === "P0")) {
      errs.push(`required pillar '${p}' is absent but has no P0 action`);
    }
  }

  const ids = actions.map((a) => a.id);
  if (new Set(ids).size !== ids.length) errs.push("prioritized_actions: duplicate action ids");

  if (/\bTBD\b|\bTODO\b|<fill|<add /i.test(JSON.stringify(spec.recommended_design ?? {}))) {
    errs.push("recommended_design: contains TODO/TBD/<placeholder> — every unit must be concretely filled");
  }

  const blocking = spec.handoff?.blocking_unknowns ?? [];
  if (blocking.length > 2) {
    warns.push(`handoff.blocking_unknowns has ${blocking.length} entries — decision gaps belong in questions/assumptions, not here (rules/elicitation.md)`);
  }
  return { errs, warns, evidence: { ratio: Number(ratio.toFixed(3)), points: `${sum}/${denom}`, verdict: or.verdict, altitude: spec.altitude, capped_by: cappingPillars } };
}

export function validateSpec(spec, schema) {
  const schemaErrs = validateSchema(schema, spec);
  const { errs, warns, evidence } = checkConsistency(spec);
  return { ok: schemaErrs.length === 0 && errs.length === 0, schemaErrs, errs, warns, evidence };
}

// --- selftest: prove the gate discriminates (good passes, each trap fails) ---
function selftest(schema) {
  const example = JSON.parse(fs.readFileSync(path.join(HERE, "..", "assets", "handoff-spec.example.json"), "utf8"));
  const clone = () => JSON.parse(JSON.stringify(example));
  let fails = 0;
  const expect = (name, result, wantOk, wantErrLike) => {
    const gotOk = result.ok;
    const errText = [...result.schemaErrs, ...result.errs].join(" | ");
    const matched = wantErrLike ? errText.includes(wantErrLike) : true;
    if (gotOk === wantOk && matched) console.log(`PASS ${name}`);
    else { console.log(`FAIL ${name} -- ok=${gotOk} want=${wantOk}${wantErrLike ? ` errLike='${wantErrLike}' in '${errText}'` : ""}`); fails++; }
  };

  expect("example spec passes the gate", validateSpec(example, schema), true);

  const m1 = clone(); m1.scorecard = m1.scorecard.slice(0, 6);
  expect("trap: missing pillar fails", validateSpec(m1, schema), false, "missing pillar");

  const m2 = clone(); m2.overall_readiness.verdict = "industrial";
  expect("trap: inflated verdict fails", validateSpec(m2, schema), false, "inconsistent");

  const m3 = clone(); m3.recommended_design.adversarial_checklist[0] = "empty key";
  expect("trap: checklist entry without expected output fails", validateSpec(m3, schema), false, "adversarial_checklist");

  const m4 = clone();
  const metrics = m4.scorecard.find((e) => e.pillar === "metrics");
  metrics.status = "absent"; metrics.score = 0;
  // keep ratio consistent with the new score so ONLY the cap rule trips
  const scored4 = m4.scorecard.filter((e) => e.status !== "na");
  const sum4 = scored4.reduce((a, e) => a + (e.score ?? 0), 0);
  m4.overall_readiness.ratio = sum4 / (2 * scored4.length);
  m4.overall_readiness.points = `${sum4}/${2 * scored4.length}`;
  expect("trap: required-pillar-absent without draft cap fails", validateSpec(m4, schema), false, "capped to 'draft'");

  const m5 = clone();
  m5.scorecard.find((e) => e.pillar === "research").score = 2; // status partial, score 2
  expect("trap: status/score mismatch fails", validateSpec(m5, schema), false, "requires score");

  const m6 = clone(); m6.recommended_design.protocol = "TODO: decide later";
  expect("trap: TODO placeholder in design fails", validateSpec(m6, schema), false, "TODO/TBD");

  console.log("");
  console.log(fails === 0 ? "PASS validate_spec selftest" : `FAIL ${fails} assertion(s)`);
  process.exit(fails === 0 ? 0 : 1);
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  if (args.includes("--selftest")) return selftest(schema);

  const audit = args.includes("--audit");
  const asJson = args.includes("--json");
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Usage: node scripts/validate_spec.mjs <target-dir | spec.json> [--audit] [--json] | --selftest");
    process.exit(2);
  }
  let specPath = path.resolve(target);
  if (fs.existsSync(specPath) && fs.statSync(specPath).isDirectory()) {
    specPath = path.join(specPath, ".skill-guidance", audit ? "post-build-audit.json" : "handoff-spec.json");
  }
  if (!fs.existsSync(specPath)) { console.error(`No spec at ${specPath}`); process.exit(2); }

  let spec;
  try { spec = JSON.parse(fs.readFileSync(specPath, "utf8")); }
  catch (e) { console.error(`FAIL spec does not parse -- ${e.message}\nRESULT: RED`); process.exit(1); }

  const result = validateSpec(spec, schema);
  if (asJson) { console.log(JSON.stringify(result, null, 2)); process.exit(result.ok ? 0 : 1); }

  for (const e of result.schemaErrs) console.log(`FAIL schema -- ${e}`);
  for (const e of result.errs) console.log(`FAIL consistency -- ${e}`);
  for (const w of result.warns) console.log(`warn ${w}`);
  const ev = result.evidence;
  console.log(`${result.ok ? "G gate ok" : "G gate FAIL"}: ${spec.target?.name ?? specPath} | altitude ${ev.altitude} | verdict ${ev.verdict} (${ev.points}, ratio ${ev.ratio}${ev.capped_by?.length ? `, capped by ${ev.capped_by.join(",")}` : ""})`);
  console.log(result.ok ? "RESULT: GREEN" : "RESULT: RED");
  process.exit(result.ok ? 0 : 1);
}

const invokedDirectly = process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
