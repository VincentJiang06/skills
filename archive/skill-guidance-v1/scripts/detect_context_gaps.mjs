// detect_context_gaps.mjs — deterministic context-sufficiency detector.
//
// Seeds skill-guidance's TRIGGER-BASED elicitation: it flags which decision-
// critical slots the input fails to specify. The skill turns each MISSING slot
// into one targeted, domain-specific clarifying question (it phrases them; this
// script only decides WHICH to ask). A near-complete input yields ~0 missing ->
// the skill does not over-ask; a bare idea yields many -> the skill must ask.
//
//   node scripts/detect_context_gaps.mjs <path-to-idea-or-SKILL.md>
//   node scripts/detect_context_gaps.mjs --idea "merge a bunch of csv files"
//   node scripts/detect_context_gaps.mjs --selftest   # discrimination self-test
//
// Output (normal): JSON { slots:[{slot,present,ask_about}], missing:[...], sufficient:bool }

import fs from "node:fs";

// Decision-critical slots: the absence of any one materially changes the design.
const SLOTS = [
  { slot: "scope_boundary",
    ask_about: "what is explicitly IN vs OUT of scope",
    re: /in[- ]scope|out[- ]of[- ]scope|not for|excludes?\b|only handles?|does ?n'?o?t|will ?n'?o?t|won'?t|limited to|rather than|omits?\b|focus(es|ing|ed)? (solely |only )?on|solely on/i },
  { slot: "input_domain",
    ask_about: "the concrete input format / shape / standard / variants",
    re: /\brfc ?\d|utf-?8|gbk|encoding|delimiter|dialect|schema|canonical|\bversions?\b|\d-\d-\d|format:?|structured|plain ?text|syslog|commonmark|markdown|\bhtml|\bjson|takes? (a |an )|input is/i },
  { slot: "acceptance_criterion",
    ask_about: "how correctness is judged (accept/reject rules, invariants, expected output)",
    re: /reject|accept|valid(ate|ity|ates)?|must (return|be|reject|not)|invariant|expected (output|result)|correct(ness)?|success criteri|produces?|outputs?\b|yields?|returns? (a |an |true|false)|deterministic/i },
  { slot: "edge_hazards",
    ask_about: "the edge / hazard cases the skill must handle",
    re: /edge case|hazard|malformed|empty|null|collision|duplicate|whitespace|boundary|\bnil\b|\bmax\b|overflow|injection/i },
  { slot: "user_or_triggers",
    ask_about: "the primary user and the phrases that should trigger the skill",
    re: /primary user|triggers?:|invoked? (when|by)|when the user|use[- ]when|"[^"]+"|'[^']+'/i },
];

const MISSING_SUFFICIENT_MAX = 1; // sufficient iff <=1 decision-critical slot missing

export function detectGaps(text) {
  const t = String(text || "");
  const slots = SLOTS.map((s) => ({ slot: s.slot, ask_about: s.ask_about, present: s.re.test(t) }));
  const missing = slots.filter((s) => !s.present).map((s) => ({ slot: s.slot, ask_about: s.ask_about }));
  return { slots, missing, sufficient: missing.length <= MISSING_SUFFICIENT_MAX };
}

function readInput() {
  const i = process.argv.indexOf("--idea");
  if (i >= 0) return process.argv[i + 1] || "";
  const p = process.argv[2];
  if (p && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  return "";
}

// --- self-test: prove the detector discriminates (both polarities) ---
function selftest() {
  const bare = "make a skill that merges a bunch of CSV files together";
  const rich =
    "Validate whether a string is a canonical RFC-4122 UUID (versions 1-5, lowercase 8-4-4-4-12 hex). " +
    "In scope: validation only. Out of scope: generating UUIDs. Reject braces/urn-prefix/uppercase/wrong-length. " +
    "Primary user: a developer linting ids. Triggers: 'is this a valid uuid'. Edge cases: nil UUID, max UUID, trailing whitespace.";
  // synonym-rich spec (paraphrases the wordlists missed before broadening): must be sufficient
  const synonym =
    "A name-splitter. It will not guess gender or title (out of scope); it omits honorific parsing. " +
    "Input is a UTF-8 full-name string; it produces {first,last}. Rejects empty input. " +
    "Edge cases: mononyms, three-part names, trailing whitespace. Primary user: a CRM importer; triggers: 'split these names'.";
  let fails = 0;
  const a = detectGaps(bare);
  const b = detectGaps(rich);
  const c = detectGaps(synonym);
  if (a.sufficient !== false) { console.log(`FAIL bare-idea should be INSUFFICIENT (missing=${a.missing.length})`); fails++; }
  else console.log(`PASS bare-idea insufficient (missing ${a.missing.length}/5: ${a.missing.map(m=>m.slot).join(",")})`);
  if (b.sufficient !== true) { console.log(`FAIL rich-spec should be SUFFICIENT (missing=${b.missing.length}: ${b.missing.map(m=>m.slot).join(",")})`); fails++; }
  else console.log(`PASS rich-spec sufficient (missing ${b.missing.length}/5)`);
  if (c.sufficient !== true) { console.log(`FAIL synonym-rich should be SUFFICIENT (missing=${c.missing.map(m=>m.slot).join(",")})`); fails++; }
  else console.log(`PASS synonym-rich sufficient (broadened wordlists catch omits/will-not/produces)`);
  // NOTE: a pure-keyword detector cannot catch adversarial token-salad ("validate empty version...").
  // That is by design the agent's judgment (rules/elicitation.md: seed, not verdict), not this seed's job.
  console.log("");
  console.log(fails === 0 ? "PASS detect_context_gaps selftest" : `FAIL ${fails} assertion(s)`);
  process.exit(fails === 0 ? 0 : 1);
}

if (process.argv.includes("--selftest")) {
  selftest();
} else {
  console.log(JSON.stringify(detectGaps(readInput()), null, 2));
}
