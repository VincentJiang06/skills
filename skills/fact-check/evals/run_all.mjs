#!/usr/bin/env node
// Re-runnable eval harness for fact-check.
// Imports the shipped mechanism from ../scripts/check_answer.mjs (never re-implements it)
// and runs every fixture answer document against it. Prints one PASS/FAIL line per case
// and exits non-zero if any case fails. The conductor re-executes this file directly.
import { checkAnswer } from "../scripts/check_answer.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, "fixtures");
const SCRIPT = join(__dirname, "..", "scripts", "check_answer.mjs");
const read = (f) => readFileSync(join(FIX, f), "utf8");

// Each case: id, fixture file, expected ok, and (for failures) an error code that MUST appear.
// Asserting the SPECIFIC error code (not just ok=false) is what keeps the wrong-sentinel
// stub red: the stub emits only __STUB_NOT_IMPLEMENTED__, so every code assertion fails.
const CASES = [
  { id: "D1_good_simple",            file: "good_simple.md",            ok: true },
  { id: "D2_good_complex_conflict",  file: "good_complex_conflict.md",  ok: true },
  { id: "D3_zero_sources",           file: "zero_sources.md",           ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D4_dangling_citation",      file: "dangling_citation.md",      ok: false, code: "E_DANGLING_CITATION" },
  { id: "D5_missing_confidence",     file: "missing_confidence.md",     ok: false, code: "E_NO_CONFIDENCE" },
  { id: "D6_complex_one_source",     file: "complex_one_source.md",     ok: false, code: "E_SOURCE_BAR" },
  { id: "D7_uncertain_good",         file: "uncertain_good.md",         ok: true },
  { id: "D8_uncertain_no_disclaimer",file: "uncertain_no_disclaimer.md",ok: false, code: "E_UNCERTAIN_NO_DISCLAIMER" },
  { id: "D9_volatile_no_date",       file: "volatile_no_date.md",       ok: false, code: "E_VOLATILE_NO_DATE" },
  { id: "D10_volatile_with_date",    file: "volatile_with_date.md",     ok: true },
  { id: "D11_cjk_answer",            file: "cjk_answer.md",             ok: true },
  { id: "D13_missing_tier",          file: "missing_tier.md",           ok: false, code: "E_NO_TIER" },
  { id: "D14_bad_confidence",        file: "bad_confidence.md",         ok: false, code: "E_BAD_CONFIDENCE" },
  // --- regression cases from the independent battery (loop 1) ---
  { id: "D16_crlf_valid",            file: "crlf_valid.md",             ok: true },
  { id: "D17_bluf_uncited_in_src",   file: "bluf_uncited_marker_in_sources.md", ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D18_marker_in_caveats",     file: "marker_in_caveats.md",      ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D19_answer_only_citation",  file: "answer_only_citation.md",   ok: false, code: "E_NO_ANSWER" },
  { id: "D20_dup_url_complex",       file: "dup_url_complex.md",        ok: false, code: "E_SOURCE_BAR" },
  // --- regression cases from the 2nd independent battery (loop 2): traceability must count
  //     real citations in Answer/evidence, not any [n]-shaped substring ---
  { id: "D21_cite_in_url",           file: "cite_in_url.md",            ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D22_cite_in_code_block",    file: "cite_in_code_block.md",     ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D23_caveats_before_sources",file: "caveats_before_sources.md", ok: false, code: "E_UNSOURCED_CLAIM" },
  // --- regression from the 3rd battery (loop 3): an invisible [n] in an HTML comment is not a citation ---
  { id: "D24_cite_in_html_comment",  file: "cite_in_html_comment.md",   ok: false, code: "E_UNSOURCED_CLAIM" },
  // --- regression from the 4th battery: invisible [n] in an HTML attribute / a markdown ref-def ---
  { id: "D25_cite_in_html_attr",     file: "cite_in_html_attr.md",      ok: false, code: "E_UNSOURCED_CLAIM" },
  { id: "D26_cite_in_refdef",        file: "cite_in_refdef.md",         ok: false, code: "E_UNSOURCED_CLAIM" },
];

let passed = 0, failed = 0;
const fail = (id, why) => { console.log(`FAIL ${id} :: ${why}`); failed++; };
const pass = (id, why) => { console.log(`PASS ${id} :: ${why}`); passed++; };

for (const c of CASES) {
  let v;
  try { v = checkAnswer(read(c.file)); }
  catch (e) { fail(c.id, `threw ${e.message}`); continue; }
  if (typeof v !== "object" || v === null || typeof v.ok !== "boolean") {
    fail(c.id, `verdict not an {ok:boolean} object (got ${JSON.stringify(v)})`); continue;
  }
  if (v.ok !== c.ok) { fail(c.id, `expected ok=${c.ok}, got ok=${v.ok} errors=${JSON.stringify(v.errors)}`); continue; }
  if (c.code && !(Array.isArray(v.errors) && v.errors.includes(c.code))) {
    fail(c.id, `expected error code ${c.code}, got ${JSON.stringify(v.errors)}`); continue;
  }
  pass(c.id, `ok=${v.ok}${c.code ? " code=" + c.code : ""} tier=${v.tier} conf=${v.confidence}`);
}

// D12 — idempotency / determinism: same input twice -> byte-identical verdict, and the
// good fixture must validate (ok=true). The ok=true half keeps this case red on the stub.
{
  const id = "D12_idempotency";
  try {
    const a = checkAnswer(read("good_simple.md"));
    const b = checkAnswer(read("good_simple.md"));
    if (JSON.stringify(a) !== JSON.stringify(b)) fail(id, "two runs differ");
    else if (a.ok !== true) fail(id, `good fixture should be ok=true, got ${a.ok} errors=${JSON.stringify(a.errors)}`);
    else pass(id, "two runs identical and ok=true");
  } catch (e) { fail(id, `threw ${e.message}`); }
}

// D15 — CLI entry point: invoke the shipped script via its documented CLI with an ABSOLUTE
// path. Catches the macOS run-as-main symlink bug (would silently exit 0 with no output).
{
  const id = "D15_cli_entry_point";
  const abs = join(FIX, "good_simple.md");
  const r = spawnSync("node", [SCRIPT, abs], { encoding: "utf8" });
  if (r.status !== 0) fail(id, `CLI exit ${r.status}; stderr=${(r.stderr || "").trim()}`);
  else if (!/VALID/.test(r.stdout || "")) fail(id, `CLI did not print VALID; stdout=${JSON.stringify((r.stdout || "").trim())}`);
  else pass(id, "CLI on absolute path exits 0 and prints VALID");
}

const total = passed + failed;
console.log(`\nTOTALS ${passed}/${total} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
