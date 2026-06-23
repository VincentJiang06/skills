#!/usr/bin/env node
// render_loop_doc.mjs — render a (linter-valid) loop-design into a runnable
// Markdown runbook and persist it to a fixed project directory (default `.loop/`).
//
// This is the "loop docs" deliverable: the user says "here is my task, design me
// a loop", loop-constructor emits the design JSON, and this writes a self-contained
// runbook a human or a fresh agent can follow as a closed loop — WITHOUT the skill
// being installed anywhere. It is design-only: it writes its own artifact, it never
// runs the designed loop or touches the target's code.
//
// Safety: refuses to write a doc for a design the linter rejects (no runbook for a
// non-loop); sanitizes free-text (no Markdown injection / no split gate commands);
// backtick-safe code spans; slug is always slugified (no path escape); refuses to
// silently overwrite (force to replace); never emits a raw stack trace.
//
// The Markdown is a deterministic function of the design (no timestamps), so
// re-rendering the same design is byte-identical.
//
// Usage:
//   node scripts/render_loop_doc.mjs <design.json> [--out <dir>] [--slug <name>] [--force]
//
// Programmatic:
//   import { renderMarkdown, emitLoopDoc, slugify } from "./render_loop_doc.mjs"

import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { validate, isStagedShape } from "./lint_loop_design.mjs";

// ---- pure text helpers ----------------------------------------------------

export function slugify(task) {
  const s = String(task == null ? "" : task)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "loop";
}

// Collapse any internal line break / whitespace run to a single space — keeps a
// value on one Markdown line (so a multiline check can't fragment, and embedded
// "## " can't inject a heading). Folds the FULL CommonMark/Unicode line-terminator
// set (bare CR, CRLF, NEL, LS, PS) — a lone \r is a line ending too.
function oneLine(v) {
  return String(v == null ? "" : v)
    .replace(/[\r\u0085\u2028\u2029]/g, "\n")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

// Inline free-text: one line, HTML-escaped, with a leading Markdown block marker
// neutralized. HTML-escaping lives HERE (not in oneLine) on purpose: oneLine also
// feeds codeSpan() for the `check` gate command, where a literal shell `>` must
// survive verbatim \u2014 escaping it there would corrupt the command. Free-text fields
// route through mdText, so this is the single chokepoint that neutralizes raw HTML.
function mdText(v) {
  return oneLine(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^([#*+-]|\d+\.)/, "\\$1");
}

// Backtick-safe inline code span (CommonMark): fence with one more backtick than
// the longest backtick run inside the content, padding when fenced.
export function codeSpan(v) {
  const s = oneLine(v);
  const runs = s.match(/`+/g) || [];
  const n = Math.max(0, ...runs.map((r) => r.length)) + 1;
  const fence = "`".repeat(n);
  const pad = n > 1 || s.startsWith("`") || s.endsWith("`") ? " " : "";
  return `${fence}${pad}${s}${pad}${fence}`;
}

const HARD_CONSTRAINTS = [
  "Minimal viable change; don't touch unrelated files.",
  "Don't change public APIs / add deps without justification.",
  "No production resources.",
  "On a requirement contradiction → STOP and report.",
];

function list(items, bullet = "- ") {
  if (!Array.isArray(items) || items.length === 0) return `${bullet}—`;
  return items.map((i) => `${bullet}${mdText(i)}`).join("\n");
}

function renderStage(stage, idx) {
  const dep =
    Array.isArray(stage.depends_on) && stage.depends_on.length > 0
      ? stage.depends_on.map((d) => codeSpan(d)).join(", ")
      : "— (entry stage)";
  const sc = stage.stop_conditions || {};
  const fs = stage.feedback_signal || {};
  const expect = isNonEmpty(fs.expect) ? codeSpan(fs.expect) : "`pass`";
  const lines = [
    `### Stage ${idx + 1} — ${codeSpan(stage.id)}  ·  pattern: ${oneLine(stage.loop_pattern)}`,
    "",
    `- **Done when:** ${mdText(stage.definition_of_done && stage.definition_of_done.goal)}`,
    `- **Check (run — the gate):** ${codeSpan(fs.check)}  ·  expect: ${expect}`,
    `- **Falsifiable when:** ${mdText(fs.falsifiable_when)}`,
    `- **Passing-but-wrong (ruled out):** ${mdText(fs.passing_but_wrong)}`,
    `- **Depends on:** ${dep}  ·  admit downstream only once this check passes.`,
    `- **Stop:** max ${sc.max_iterations} iterations; failure branches:`,
    list(sc.failure, "    - "),
  ];
  if (sc.on_failure && sc.on_failure.action) {
    const a = sc.on_failure.action;
    const route = a === "loopback" ? `loop back to ${codeSpan(sc.on_failure.to)}` : a;
    lines.push(`- **On failure:** ${route}.`);
  }
  return lines.join("\n");
}

/**
 * Render a loop-design (flat or staged) into a Markdown runbook. Pure.
 */
export function renderMarkdown(design) {
  if (design == null || typeof design !== "object") return "";
  const staged = isStagedShape(design) && design.stages.length > 0;
  const sc = design.stop_conditions || {};
  const out = [];

  out.push(`# Loop runbook — ${mdText(design.task) || "(untitled task)"}`);
  out.push("");
  out.push(
    "> A runnable closed-loop design generated by loop-constructor. Follow it as a loop: " +
      "make a small change → run the stage check → read the result → fix → repeat until the check passes, then advance."
  );
  if (staged) {
    out.push(
      `> **Altitude:** ${oneLine(design.loop_altitude)}${
        design.loop_altitude_rationale ? ` — ${mdText(design.loop_altitude_rationale)}` : ""
      }`
    );
  }
  out.push("");

  out.push("## Hard constraints");
  out.push(list(HARD_CONSTRAINTS));
  out.push("");

  if (Array.isArray(design.selection_log) && design.selection_log.length > 0) {
    out.push("## Why this shape (decision log)");
    out.push("> The D0–D6 selection procedure that derived this loop's shape.");
    design.selection_log.forEach((e) => {
      if (e == null || typeof e !== "object") return;
      const d = oneLine(e.decision);
      const a = oneLine(e.answer);
      const why = mdText(e.why);
      out.push(`- **${d}** (${a})${why ? ` — ${why}` : ""}`);
    });
    out.push("");
  }

  if (staged) {
    out.push("## Stages (run in dependency order; each stage is its own gated loop)");
    out.push(
      "> After a stage gate goes green, commit/checkpoint it; on a loopback, reset to the last green checkpoint rather than editing forward."
    );
    out.push("");
    design.stages.forEach((stage, idx) => {
      out.push(renderStage(stage, idx));
      out.push("");
    });
    if (design.loop_altitude === "large") {
      out.push("## Orchestration (large altitude)");
      out.push(
        "> Stages with no dependency path between them MAY run as parallel agents. See loop-principle " +
          "`pattern.multi_agent_orchestra` + `templates/multi_agent_plan.template.json` for roles / isolation / a shared-state ledger."
      );
      out.push("");
    }
  } else {
    out.push("## The loop");
    out.push("");
    out.push(`- **Pattern:** ${oneLine(design.loop_pattern)}`);
    out.push(`- **Done when:** ${mdText(design.definition_of_done && design.definition_of_done.goal)}`);
    const fs = design.feedback_signal || {};
    out.push(`- **Check (run — the gate):** ${codeSpan(fs.check)}  ·  expect: ${isNonEmpty(fs.expect) ? codeSpan(fs.expect) : "`pass`"}`);
    if (isNonEmpty(fs.falsifiable_when)) out.push(`- **Falsifiable when:** ${mdText(fs.falsifiable_when)}`);
    out.push("");
  }

  out.push("## Stop conditions (overall)");
  out.push(`- **Success:** ${mdText(sc.success) || "every stage check passes in order"}`);
  out.push(`- **Max iterations (budget cap):** ${sc.max_iterations}`);
  out.push("- **Failure branches:**");
  out.push(list(sc.failure, "  - "));
  if (Array.isArray(sc.escalate) && sc.escalate.length > 0) {
    out.push("- **Escalate to a human when:**");
    out.push(list(sc.escalate, "  - "));
  }
  out.push("");

  out.push("## Terminal states");
  out.push(`- **SUCCESS** — ${mdText(sc.success) || "all gates green"} → done.`);
  const lastGreen = staged ? "stage" : "checkpoint";
  out.push(
    `- **STOPPED_UNMET** — a max-iteration cap is hit or a failure branch fires: stop, report the last green ` +
      `${lastGreen} and the unmet gate, hand back the partial diff, do NOT merge. Never relax a gate to force a pass.`
  );
  if (Array.isArray(sc.escalate) && sc.escalate.length > 0) {
    out.push("- **ESCALATE** — one of the escalate triggers above fires: hand to a human.");
  }
  out.push("");

  out.push("## Human placement");
  out.push(`- ${oneLine(design.human_placement)}`);
  out.push("");

  out.push("## Checker (separate, fresh-context)");
  const mc = design.maker_checker || {};
  out.push(`- ${mdText(mc.scope) || "a fresh-context reviewer flags correctness / stated-requirement gaps only."}`);
  out.push("");

  out.push("## Risk guards");
  if (Array.isArray(design.risk_guards) && design.risk_guards.length > 0) {
    for (const g of design.risk_guards) out.push(`- **${mdText(g.risk)}** → ${mdText(g.mitigation)}`);
  } else {
    out.push("- —");
  }
  out.push("");

  out.push("## Harness primitives");
  out.push(list(design.harness_primitives));
  out.push("");

  return out.join("\n");
}

function isNonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// ---- emit (validates first, then writes) ----------------------------------

/**
 * Validate the design and, only if it PASSes, write `<out>/<slug>.loop.md` and
 * `<out>/<slug>.loop.json`. Returns { written, ... }. Never writes an invalid
 * design, never silently overwrites (unless opts.force), never throws on a write
 * error (returns written:false with a reason).
 */
export function emitLoopDoc(design, opts = {}) {
  const verdict = validate(design);
  if (!verdict.ok) {
    return {
      written: false,
      reason: "design failed lint_loop_design; refusing to write a runbook for an invalid loop-design",
      fails: verdict.fails,
    };
  }
  // Everything after validation is inside try/catch — slugify/render/existsSync
  // included — so even a hostile toString on a field returns a graceful refusal
  // rather than a raw stack trace (the module's no-throw contract).
  try {
    const out = opts.out || ".loop";
    const slug = slugify(opts.slug || design.task || "loop"); // always slugified — no path escape
    const md = renderMarkdown(design);
    const mdPath = nodePath.join(out, `${slug}.loop.md`);
    const jsonPath = nodePath.join(out, `${slug}.loop.json`);
    if (opts.force !== true && (nodeFs.existsSync(mdPath) || nodeFs.existsSync(jsonPath))) {
      return {
        written: false,
        reason: `refusing to overwrite existing ${mdPath} — pass force to replace, or a different --slug to disambiguate`,
        slug,
        mdPath,
        jsonPath,
      };
    }
    nodeFs.mkdirSync(out, { recursive: true });
    nodeFs.writeFileSync(mdPath, md, "utf8");
    nodeFs.writeFileSync(jsonPath, JSON.stringify(design, null, 2) + "\n", "utf8");
    return { written: true, mdPath, jsonPath, slug };
  } catch (e) {
    return { written: false, reason: `could not render/write loop doc: ${e.message}` };
  }
}

// ---- CLI ------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--slug") args.slug = argv[++i];
    else if (a === "--force") args.force = true;
    else args._.push(a);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const designPath = args._[0];
  if (!designPath) {
    console.log("usage: node scripts/render_loop_doc.mjs <design.json> [--out <dir>] [--slug <name>] [--force]");
    process.exit(2);
  }
  let design;
  try {
    design = JSON.parse(nodeFs.readFileSync(designPath, "utf8"));
  } catch (e) {
    console.log(`FAIL input: could not read/parse ${JSON.stringify(designPath)}: ${e.message}`);
    process.exit(1);
  }
  const r = emitLoopDoc(design, { out: args.out, slug: args.slug, force: args.force });
  if (!r.written) {
    console.log(`REFUSED: ${r.reason}`);
    for (const f of r.fails || []) console.log(`  FAIL ${f.name}: ${f.reason}`);
    process.exit(1);
  }
  console.log(`WROTE ${r.mdPath}`);
  console.log(`WROTE ${r.jsonPath}`);
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === nodeFs.realpathSync(process.argv[1])) {
  main(process.argv);
}
