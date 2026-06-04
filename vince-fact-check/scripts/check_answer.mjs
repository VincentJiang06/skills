#!/usr/bin/env node
// vince-fact-check answer-contract validator (the executable-acceptance mechanism).
//
// Deterministic, side-effect-free check of a fact-check ANSWER DOCUMENT against the
// output contract in rules/output-contract.md. It does NOT do any searching or judge
// factual truth — it enforces the structural + citation-integrity contract that makes a
// fast answer trustworthy and self-consistent. Pure function of its input string:
// checkAnswer(text) -> verdict, so running it twice yields a byte-identical verdict.
//
// CLI:  node scripts/check_answer.mjs <answer.md>   ->  prints VALID/INVALID, exits 0/1.

const TIERS = ["simple", "complex", "uncertain"];
const CONFS = ["high", "medium", "low"];

// Per-tier minimum count of DISTINCT URL-bearing sources. uncertain has no floor.
const SOURCE_BAR = { simple: 1, complex: 2, uncertain: 0 };

const VOLATILE_RE = /\b(current(?:ly)?|latest|most recent|right now|as of (?:now|today)|nowadays|present[- ]day|incumbent|sitting)\b|最新|目前|现在|当前|现任|今天/i;
const DATE_RE = /\b(?:19|20)\d{2}\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\d{4}\s*年/i;
const DISCLAIMER_RE = /\b(?:could ?n['o]t|can ?not|can['o]t|un(?:able|confirmed)|not (?:be )?confirmed?|no reliable source|insufficient evidence|unverified|inconclusive)\b|无法确认|未能确认|无法核实|缺乏可靠来源|未经证实/i;

function field(text, name) {
  // value form: **Name:** value   (colon may sit inside the bold)
  const val = text.match(new RegExp(`\\*{0,2}${name}\\*{0,2}[ \\t]*[:：][ \\t]*\\*{0,2}[ \\t]*([^\\n*]+)`, "i"));
  const loose = new RegExp(`\\*{0,2}${name}\\*{0,2}[ \\t]*[:：]`, "i").test(text);
  return { value: val ? val[1].trim() : null, present: loose };
}

// Extract a section's body text from its label up to the next known section heading (or EOF).
function section(text, name, stops) {
  const stop = stops.length ? `(?=\\n[ \\t]*\\*{0,2}(?:${stops.join("|")})\\b|$)` : "(?=$)";
  const m = text.match(new RegExp(`\\*{0,2}${name}\\*{0,2}[ \\t]*[:：]([\\s\\S]*?)${stop}`, "i"));
  return m ? m[1] : "";
}

export function checkAnswer(text) {
  const errors = [];
  if (typeof text !== "string") text = String(text == null ? "" : text);
  text = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"); // strip BOM; normalize CRLF / lone-CR

  // --- Tier ---
  const tf = field(text, "Tier");
  const tier = tf.value ? tf.value.toLowerCase().split(/\s/)[0] : null;
  const tierValid = TIERS.includes(tier);
  if (!tierValid) errors.push(tf.present ? "E_BAD_TIER" : "E_NO_TIER");

  // --- Confidence ---
  const cf = field(text, "Confidence");
  const confidence = cf.value ? cf.value.toLowerCase().split(/\s/)[0] : null;
  const confValid = CONFS.includes(confidence);
  if (!confValid) errors.push(cf.present ? "E_BAD_CONFIDENCE" : "E_NO_CONFIDENCE");

  // --- Answer / BLUF (must lead with a non-empty bottom line that has real content) ---
  const answerText = section(text, "Answer", ["Key evidence", "Sources", "Caveats"]).replace(/^[*\s]+/, "").trim();
  // strip citation markers before testing for content, so a bare "[1]" is not a bottom line
  if (!/[\p{L}\p{N}]/u.test(answerText.replace(/\[\d+\]/g, ""))) errors.push("E_NO_ANSWER");

  // --- Sources block: numbered entries; the bar counts DISTINCT URLs (two entries that
  //     share a URL are one origin, not independent corroboration). ---
  const sh = text.match(/\*{0,2}Sources\*{0,2}[ \t]*[:：]/i);
  const sourcesBlock = sh ? text.slice(sh.index + sh[0].length) : "";
  const sourceNumbers = new Set();
  const distinctUrls = new Set();
  for (const line of sourcesBlock.split("\n")) {
    const m = line.match(/^[ \t]*(\d+)[.)][ \t]+(.+)$/);
    if (!m) continue;
    sourceNumbers.add(Number(m[1]));
    const u = line.match(/https?:\/\/\S+/i);
    if (u) distinctUrls.add(u[0].replace(/[.,;)\]]+$/, "").toLowerCase());
  }
  const sourcedCount = distinctUrls.size;

  // --- Citations count ONLY where load-bearing claims live: the Answer + Key-evidence
  //     regions, with code spans/blocks and URLs stripped. A [n] in Caveats, in the
  //     Sources list, inside a URL, or inside a code block does NOT make the bottom line
  //     traceable (rules/output-contract.md). This is "is the claim cited", not "does a
  //     [n]-shaped substring exist somewhere". ---
  const keyEv = section(text, "Key evidence", ["Sources", "Caveats"]);
  // A citation must be a VISIBLE [n] in the prose. Strip every construct that renders to
  // nothing (or hides the marker) before counting, so an invisible [n] cannot launder an
  // uncited bottom line: HTML comments, markdown reference-link definitions ([1]: url),
  // fenced/inline code, HTML tags (a [n] inside an attribute), and URLs.
  const citable = (answerText + "\n" + keyEv)
    .replace(/<!--[\s\S]*?-->/g, " ")               // HTML comments
    .replace(/^[ \t]*\[[^\]]+\]:\s*\S.*$/gm, " ")   // reference-link definitions: [1]: https://...
    .replace(/```[\s\S]*?```/g, " ")                // fenced code blocks
    .replace(/`[^`]*`/g, " ")                       // inline code spans
    .replace(/<\/?[a-zA-Z][^>]*>/g, " ")            // HTML tags (a [n] in an attribute is not visible)
    .replace(/https?:\/\/\S+/gi, " ");              // URLs (a [n] inside a link is not a citation)
  const citationNumbers = [];
  for (const m of citable.matchAll(/\[(\d+)\]/g)) citationNumbers.push(Number(m[1]));
  const citationCount = citationNumbers.length;

  // --- Dangling citation: a real (Answer/evidence) [n] with no matching listed source ---
  if (citationNumbers.some((n) => !sourceNumbers.has(n))) errors.push("E_DANGLING_CITATION");

  // --- Per-tier source bar + sourced-claim requirement (skipped for uncertain) ---
  if (tier === "simple" || tier === "complex") {
    if (sourcedCount < SOURCE_BAR[tier]) errors.push("E_SOURCE_BAR");
    if (citationCount === 0) errors.push("E_UNSOURCED_CLAIM");
  }

  // --- Uncertain path must be honest: Low confidence + an explicit disclaimer ---
  if (tier === "uncertain") {
    if (confValid && confidence !== "low") errors.push("E_UNCERTAIN_NOT_LOW");
    if (!DISCLAIMER_RE.test(text)) errors.push("E_UNCERTAIN_NO_DISCLAIMER");
  }

  // --- Freshness: a volatile bottom line must carry a date ---
  if (answerText && VOLATILE_RE.test(answerText) && !DATE_RE.test(answerText)) {
    errors.push("E_VOLATILE_NO_DATE");
  }

  return {
    ok: errors.length === 0,
    tier: tierValid ? tier : null,
    confidence: confValid ? confidence : null,
    sourceCount: sourcedCount,
    citationCount,
    errors,
    stats: { distinctSources: sourceNumbers.size, distinctUrls: sourcedCount, citationCount },
  };
}

// --- CLI (macOS-safe run-as-main guard: realpath both sides) ---
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
const isMain = (() => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();
if (isMain) {
  const { readFileSync } = await import("node:fs");
  const path = process.argv[2];
  if (!path) { console.error("usage: check_answer.mjs <answer.md>"); process.exit(2); }
  let src;
  try { src = readFileSync(path, "utf8"); }
  catch (e) { console.error(`cannot read ${path}: ${e.code || e.message}`); process.exit(2); }
  const v = checkAnswer(src);
  console.log(v.ok ? "VALID" : "INVALID", JSON.stringify(v.errors));
  console.log(JSON.stringify(v, null, 2));
  process.exit(v.ok ? 0 : 1);
}
