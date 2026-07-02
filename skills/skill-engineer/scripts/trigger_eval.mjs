#!/usr/bin/env node
// trigger_eval — empirically measure whether a skill TRIGGERS on the right prompts.
//
// The rest of the pipeline reasons about a skill's description STATICALLY (guidance
// scores it, zipper rewrites it). This runner closes that gap the way Anthropic's
// skill-creator does (scripts/run_eval.py + improve_description.py): it feeds labeled
// prompts to a judge and measures trigger precision/recall against the labels.
//
// Two judges:
//   mock  — deterministic; triggers iff the prompt contains a sentinel substring.
//           Used by this skill's own evals to verify the runner's MATH without
//           spending tokens or needing an authenticated CLI.
//   cli   — live; asks `claude -p` whether the description would invoke the skill.
//           Spends tokens + needs an authenticated `claude` CLI. The real measurement.
//
// Usage:
//   node scripts/trigger_eval.mjs <skill-dir> <cases.json> [--judge mock|cli]
//        [--threshold 0.9] [--runs 3] [--mock-rule <substring>] [--model <id>] [--json]
//
// cases.json: { "cases": [ { "id": "t1", "prompt": "…", "should_trigger": true,
//                            "holdout": true? }, … ] }   (a bare array also accepted)
//
// --runs N     judge each case N times and take the majority — a single LLM-judge
//              call is noisy; Anthropic's skill-creator uses 3 runs per query for
//              a reliable trigger rate.
// holdout      mark ~40% of cases "holdout": true and never tune the description
//              against them; the gate then ALSO requires the held-out slice to
//              clear the threshold, which is what stops description overfitting
//              (skill-creator's 60/40 train/held-out split).
//
// Exit 0 iff passed: combined precision AND recall >= threshold, and — when any
// holdout cases exist — held-out precision AND recall >= threshold too.

import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

// --- frontmatter (tolerant: inline or folded `>` / `|` description) ---
export function parseFrontmatter(skillMd) {
  const m = String(skillMd).match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  const lines = (m ? m[1] : "").split(/\r?\n/);
  let name = "";
  let description = "";
  for (let i = 0; i < lines.length; i += 1) {
    const nameMatch = lines[i].match(/^name:\s*(.+?)\s*$/);
    if (nameMatch) { name = nameMatch[1]; continue; }
    if (/^description:\s*[>|][-+]?\s*$/.test(lines[i])) {   // folded/literal block — check before inline
      const collected = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^\s+\S/.test(lines[j]) || lines[j].trim() === "") collected.push(lines[j].trim());
        else break;
      }
      description = collected.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }
    const descInline = lines[i].match(/^description:\s*(.+?)\s*$/);
    if (descInline) { description = descInline[1]; continue; }
  }
  return { name, description };
}

// --- judges: (description, name, prompt) => boolean ---
export function mockJudge(rule = "YES") {
  return (_description, _name, prompt) => String(prompt).includes(rule);
}

export function cliJudge({ model } = {}) {
  return (description, name, prompt) => {
    const ask = [
      "You decide whether to load a specialized skill for a user request.",
      "",
      `SKILL name: ${name}`,
      `SKILL description: ${description}`,
      "",
      `USER REQUEST: "${prompt}"`,
      "",
      "Based ONLY on the description, would this skill be invoked for this request?",
      "Answer with exactly one word: TRIGGER or SKIP."
    ].join("\n");
    const args = ["-p", ask];
    if (model) args.push("--model", model);
    const proc = childProcess.spawnSync("claude", args, { encoding: "utf8" });
    if (proc.error) throw new Error(`cli judge could not spawn 'claude': ${proc.error.message}`);
    const out = String(proc.stdout || "").toUpperCase();
    const t = out.lastIndexOf("TRIGGER");
    const s = out.lastIndexOf("SKIP");
    if (t === -1 && s === -1) throw new Error(`cli judge got no TRIGGER/SKIP verdict: ${proc.stdout || proc.stderr}`);
    return t > s;
  };
}

// --- metrics (confusion matrix vs the should_trigger labels) ---
export function computeMetrics(cases, predictions) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  cases.forEach((c, i) => {
    const want = c.should_trigger === true;
    const got = predictions[i] === true;
    if (want && got) tp += 1;
    else if (!want && got) fp += 1;
    else if (want && !got) fn += 1;
    else tn += 1;
  });
  const precision = (tp + fp) === 0 ? 1 : tp / (tp + fp);
  const recall = (tp + fn) === 0 ? 1 : tp / (tp + fn);
  const accuracy = cases.length === 0 ? 1 : (tp + tn) / cases.length;
  return { confusion: { tp, fp, fn, tn }, precision, recall, accuracy };
}

function outcomeOf(want, got) {
  if (want && got) return "TP";
  if (!want && got) return "FP";
  if (want && !got) return "FN";
  return "TN";
}

const round3 = (n) => Math.round(n * 1000) / 1000;

function resolveJudge(name, opts = {}) {
  if (name === "mock") return mockJudge(opts.mockRule);
  if (name === "cli") return cliJudge(opts);
  throw new Error(`unknown judge '${name}' (use mock|cli, or pass a function)`);
}

// --- runner: returns a report conforming to assets/trigger-eval.schema.json ---
export function runTriggerEval({ skillDir, description, name, cases, judge, threshold = 0.9, runs = 1 }) {
  if (skillDir && (!description || !name)) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8"));
    name = name || fm.name;
    description = description || fm.description;
  }
  const judgeFn = typeof judge === "function" ? judge : resolveJudge(judge);
  const votes = cases.map((c) => {
    let v = 0;
    for (let r = 0; r < runs; r += 1) if (judgeFn(description, name, c.prompt) === true) v += 1;
    return v;
  });
  const predictions = votes.map((v) => v * 2 > runs); // majority; tie counts as SKIP
  const { confusion, precision, recall, accuracy } = computeMetrics(cases, predictions);

  const sub = (want) => {
    const idx = cases.map((c, i) => [c, i]).filter(([c]) => (c.holdout === true) === want).map(([, i]) => i);
    if (!idx.length) return null;
    const m = computeMetrics(idx.map((i) => cases[i]), idx.map((i) => predictions[i]));
    return {
      total: idx.length,
      confusion: m.confusion,
      metrics: { precision: round3(m.precision), recall: round3(m.recall), accuracy: round3(m.accuracy) },
      passed: m.precision >= threshold && m.recall >= threshold
    };
  };
  const holdout = sub(true);
  const split = holdout ? { train: sub(false), holdout } : null;

  const passed = precision >= threshold && recall >= threshold && (holdout ? holdout.passed : true);
  return {
    skill: name || "(unknown)",
    judge: typeof judge === "string" ? judge : "custom",
    threshold,
    runs,
    total: cases.length,
    confusion,
    metrics: { precision: round3(precision), recall: round3(recall), accuracy: round3(accuracy) },
    ...(split ? { split } : {}),
    cases: cases.map((c, i) => ({
      id: c.id ?? `case-${i + 1}`,
      should_trigger: c.should_trigger === true,
      triggered: predictions[i],
      votes: votes[i],
      ...(c.holdout === true ? { holdout: true } : {}),
      outcome: outcomeOf(c.should_trigger === true, predictions[i])
    })),
    passed
  };
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  let skillDir = null, casesPath = null, judge = "cli", threshold = 0.9, runs = 1, mockRule = "YES", model = null, asJson = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--judge") judge = args[++i];
    else if (a === "--threshold") threshold = Number(args[++i]);
    else if (a === "--runs") runs = Math.max(1, Number(args[++i]) || 1);
    else if (a === "--mock-rule") mockRule = args[++i];
    else if (a === "--model") model = args[++i];
    else if (a === "--json") asJson = true;
    else if (!skillDir) skillDir = a;
    else if (!casesPath) casesPath = a;
  }
  if (!skillDir || !casesPath) {
    console.error("Usage: node scripts/trigger_eval.mjs <skill-dir> <cases.json> [--judge mock|cli] [--threshold 0.9] [--runs 3] [--mock-rule <substr>] [--model <id>] [--json]");
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(path.resolve(casesPath), "utf8"));
  const cases = Array.isArray(raw) ? raw : raw.cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("cases file must be a non-empty array (or { cases: [...] })");
    process.exit(2);
  }
  const judgeFn = resolveJudge(judge, { mockRule, model });
  const report = runTriggerEval({ skillDir, cases, judge: judgeFn, threshold, runs });
  report.judge = judge; // record the named judge, not "custom"
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`skill: ${report.skill}   judge: ${judge}   threshold: ${threshold}   runs/case: ${runs}`);
    console.log(`precision ${report.metrics.precision}  recall ${report.metrics.recall}  accuracy ${report.metrics.accuracy}  (TP ${report.confusion.tp} FP ${report.confusion.fp} FN ${report.confusion.fn} TN ${report.confusion.tn})`);
    if (report.split) {
      console.log(`  train:   precision ${report.split.train.metrics.precision}  recall ${report.split.train.metrics.recall}  (${report.split.train.total} cases)`);
      console.log(`  holdout: precision ${report.split.holdout.metrics.precision}  recall ${report.split.holdout.metrics.recall}  (${report.split.holdout.total} cases) ${report.split.holdout.passed ? "ok" : "BELOW THRESHOLD"}`);
    }
    for (const c of report.cases) {
      const ok = c.outcome === "TP" || c.outcome === "TN";
      console.log(`  ${ok ? "ok  " : "MISS"} [${c.outcome}] ${c.id}${c.holdout ? " (holdout)" : ""}: want ${c.should_trigger ? "TRIGGER" : "SKIP"}, got ${c.triggered ? "TRIGGER" : "SKIP"} (${c.votes}/${runs})`);
    }
    console.log(report.passed ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  }
  process.exit(report.passed ? 0 : 1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
