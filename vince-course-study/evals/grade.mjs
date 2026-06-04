#!/usr/bin/env node
// Behavioral acceptance checker for the course-study skill (lite, pure LLM-behavioral).
//
// This is NOT the skill's mechanism — course-study has no deterministic script; it is an
// LLM-behavioral skill. This file is an eval-grading aid: for each eval case it evaluates
// the `red_probe` predicates by reading the skill's OWN authored rules (SKILL.md + rules/*)
// and confirming the design AUTHORIZES the behavior the case's `acceptance` requires.
// Run it against the OLD design (no Feynman capsule, no coverage checklist, ships exam-Q&A)
// to get real FAIL lines (RED), and against the NEW design to confirm every case is GREEN.
//
//   node evals/grade.mjs <skill-dir>
//
// The eval cases are always read from THIS file's own directory (evals/eval-cases.json),
// while the skill content being graded is read from <skill-dir> (the OLD backup for RED,
// the live repo for GREEN).
//
// Each predicate below is behavior-distinguishing: it would flip to FAIL if the protocol
// step it protects were deleted (e.g. drop the reconciliation step -> reconciliation_step FAILs).
// Grading of the actual notes output is done by behavioral reasoning against written-acceptance.md;
// this checker pins the design invariants those cases depend on so they cannot silently regress.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) { console.error('usage: node evals/grade.mjs <skill-dir>'); process.exit(2); }
const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));

const read = (p) => { try { return fs.readFileSync(path.join(dir, p), 'utf8'); } catch { return ''; } };
// Lowercase AND strip markdown/punctuation noise (**bold**, "quotes", 'quotes') so
// predicates assert on the WORDS the design uses, not on incidental formatting —
// e.g. `**do not** silently "correct"` normalizes to `do not silently correct`.
const lc = (s) => s.toLowerCase().replace(/[*"'`]/g, '').replace(/[ \t]+/g, ' ');

const SKILL = read('SKILL.md');
const intake = read('rules/phase-intake.md');
const cover = read('rules/phase-cover.md') || read('rules/phase-extract.md');
const distill = read('rules/phase-distill.md') || read('rules/phase-study.md');
const synth = read('rules/phase-synthesize.md');
const supplement = read('rules/phase-supplement.md') || read('rules/phase-expand.md');
const templates = read('rules/templates.md');
const pdfexport = read('rules/pdf-export.md');
const subject = read('rules/subject-coverage.md');
// Distill content may live across the folded modules; concat what the design uses for "phase 2".
const distillAll = distill + '\n' + synth;
const ALL = [SKILL, intake, cover, distill, synth, supplement, templates, pdfexport, subject].join('\n');

// --- predicate library: name -> (returns true when the NEW design authorizes the behavior) ---
const P = {
  // Feynman block order with the plain-language capsule FIRST (the defining new pedagogy).
  // OLD phase-study leads with "What it is" (definition), capsule is absent -> FAIL.
  distill_feynman_capsule_first: () => {
    const t = lc(distillAll);
    const hasCapsule = /(plain[- ]language|explain it simply)\s*(capsule)?/.test(t);
    // capsule must be ordered FIRST: it appears before "intuition" and before "formal"
    const ci = t.indexOf('capsule') >= 0 ? t.indexOf('capsule') : t.search(/plain[- ]language|explain it simply/);
    const ii = t.indexOf('intuition');
    const fi = t.search(/formal treatment|formal\b/);
    const orderedFirst = ci >= 0 && ii > ci && (fi < 0 || fi > ci);
    return hasCapsule && orderedFirst;
  },

  // Phase-1 Cover emits a coverage checklist (the completeness ledger) as a first-class artifact.
  // OLD phase-extract has no "coverage checklist" ledger -> FAIL.
  cover_emits_checklist: () => {
    const t = lc(cover) + lc(SKILL);
    return /coverage checklist|topic ledger|completeness ledger/.test(t) && /every topic|all topics|enumerat/.test(t);
  },

  // Phase-2 reconciles notes against the Phase-1 checklist before finalizing.
  // OLD phase-study only "spot-checks"; no reconcile-against-checklist invariant -> FAIL.
  reconciliation_step: () => {
    const t = lc(distillAll) + lc(SKILL);
    return /reconcil/.test(t) && /(coverage )?checklist|ledger/.test(t) && /(flag|fill)/.test(t) && /before finaliz/.test(t);
  },

  // All PDF reading routes through /pdf; raw file I/O / Python on PDFs forbidden.
  pdf_routing: () => {
    const t = lc(ALL);
    return /\/pdf/.test(t) && /(never|do not|don't|no).{0,40}(raw file i\/o|python|direct file)/.test(t);
  },

  // Scanned / image-only PDFs explicitly still go through /pdf (not OCR'd by hand / raw read).
  pdf_routing_scanned: () => {
    const t = lc(cover) + lc(SKILL);
    return /(scanned|image-only|image only)/.test(t) && /\/pdf/.test(t);
  },

  // Course-name-only path: search a standard syllabus to build the outline.
  course_name_path: () => {
    const t = lc(subject) + lc(intake) + lc(SKILL);
    return /course name/.test(t) && /(standard )?syllabus/.test(t) && /(outline|build)/.test(t);
  },

  // Never fabricate a specific lecture's slide content on the course-name path.
  no_fabricate_slide_content: () => {
    const t = lc(ALL);
    return /(never|not|no|forbid).{0,60}(fabricat|invent).{0,60}(slide|lecture)/.test(t)
        || /(fabricat|invent).{0,40}(specific lecture|slide content)/.test(t);
  },

  // Offline supplement marks [Standard curriculum knowledge].
  offline_marker: () => lc(supplement).includes('[standard curriculum knowledge]'),

  // Offline supplement invents no URLs/papers/authors.
  no_invented_sources: () => {
    const t = lc(supplement) + lc(ALL);
    return /(no|never|zero|do not|don't).{0,40}(invent|fabricat).{0,40}(url|paper|author|source)/.test(t)
        || /(invent|fabricat).{0,20}(no )?(url|paper|author)/.test(t);
  },

  // Trivial topic still covered but at minimal depth, not padded into a full block.
  trivial_minimal_not_padded: () => {
    const t = lc(distillAll);
    return /(trivial|minor|minimal depth)/.test(t) && /(capsule|one[- ]liner|minimal)/.test(t) && /(not pad|no pad|not.*full block|minimal depth)/.test(t);
  },

  // Completeness invariant: extracted topics are never silently dropped.
  completeness_invariant: () => {
    const t = lc(ALL);
    return /(complete|completeness)/.test(t) && /(never|not) (silently )?(drop|skip)/.test(t);
  },

  // Scale guard: >400 pages -> split-by-module.
  split_over_400: () => {
    const t = lc(intake) + lc(SKILL);
    return /400/.test(t) && /(split|per-module|per module)/.test(t);
  },
  no_silent_drop: () => /(never|not) (silently )?(drop|skip)/.test(lc(ALL)),

  // Slide↔curriculum discrepancy is flagged, NOT silently corrected.
  flag_discrepancy_not_correct: () => {
    const t = lc(ALL);
    return /(discrepanc|contradict)/.test(t) && /flag/.test(t) && /(not|never|without) (silently )?(correct|overwrit|fix)/.test(t);
  },

  // CJK/bilingual PDF: xelatex + CJKmainfont.
  cjk_xelatex_config: () => {
    const t = lc(pdfexport);
    return t.includes('xelatex') && t.includes('cjkmainfont');
  },

  // Worked-example invariant: mandatory for every non-trivial concept.
  worked_example_mandatory: () => {
    const t = lc(distillAll) + lc(SKILL);
    return /worked example/.test(t) && /(mandator|every non-trivial|required)/.test(t);
  },

  // Pure-definition escape hatch: capsule + a note instead of a fake example.
  no_fake_example_escape_hatch: () => {
    const t = lc(distillAll) + lc(SKILL);
    return /(pure[- ]definition|definitional|no feasible)/.test(t) && /(no (fake|fabricat|forced) example|capsule \+ (a )?note|note instead)/.test(t);
  },

  // Scope guard: do not solve the user's graded homework/exam.
  scope_guard_homework: () => {
    const t = lc(ALL);
    return /(homework|graded|assessment|exam question)/.test(t) && /(do not|don't|never|refus|not solv).{0,40}(solv|answer|do)/.test(t);
  },

  // Description carries Do-NOT / adjacent negatives.
  donot_negatives: () => {
    const t = lc(SKILL);
    return /(do not|not for|don't use)/.test(t) && /(album|music)/.test(t) && /(homework|exam question|solve)/.test(t);
  },

  // quick-reference.md is one line per entry, ordered by exam relevance.
  quickref_one_line: () => {
    const t = lc(templates) + lc(distillAll);
    return /quick[- ]reference/.test(t) && /(one line per|one-line|single line)/.test(t) && /exam relevance/.test(t);
  },

  // The standalone exam-Q&A bank product has been removed (no exam-qa.md deliverable).
  no_exam_qa_bank: () => {
    const t = lc(ALL);
    // FAIL (return false) if the design still ships an exam-qa.md bank or an "Exam Q&A" appendix/step.
    const shipsBank = /exam-qa\.md/.test(t) || /exam q&a (bank|appendix)/.test(t) || /step 6b/.test(t);
    return !shipsBank;
  },

  // Supplement capped at <=~10 targets (down from OLD 15).
  supplement_cap_10: () => {
    const t = lc(supplement) + lc(SKILL);
    const caps10 = /(cap|maximum|<=|≤|up to).{0,20}10/.test(t) || /10 (target|supplement)/.test(t);
    const stillsays15 = /maximum 15|15 targets|cap.{0,10}15/.test(t);
    return caps10 && !stillsays15;
  },

  // --- iteration-2 regression predicates (lock the 5 adjudicated bug fixes) ---

  // BUG 1: OUTPUT PDF is generated with pandoc/xelatex (per pdf-export.md), and the
  // OLD contradiction "convert/export the OUTPUT via /pdf, not pandoc" is GONE.
  // pdf-export.md must name pandoc/xelatex as the output engine; and NO file may tell
  // the model to do OUTPUT conversion via /pdf instead of pandoc. (/pdf stays for INPUT.)
  pdf_output_via_pandoc: () => {
    const t = lc(pdfexport);
    const pandocIsOutputEngine = /pandoc/.test(t) && /xelatex/.test(t)
      && /(output|generat|engine|convert)/.test(t);
    // the contradiction phrasings that route OUTPUT generation through /pdf instead of
    // pandoc. Distinguishing signature: a conversion verb tied to the /pdf skill AS THE
    // EXECUTOR ("convert via the /pdf skill", "use the /pdf skill to execute the
    // conversion"), or an explicit "not pandoc, use /pdf". A bare mention of /pdf for
    // INPUT reading near the word "export"/"pandoc" is NOT a contradiction.
    const contradictionFiles = [pdfexport, templates, distillAll];
    const stillContradicts = contradictionFiles.some(f => {
      const x = lc(f);
      return /(convert|execute the conversion).{0,30}(via|use|with|through) (the )?\/pdf skill/.test(x)
          || /(use|via) (the )?\/pdf skill.{0,30}(to )?(convert|execute the conversion|export)/.test(x)
          || /\/pdf.{0,40}(not|never|do not|don't|instead of).{0,20}(raw )?(pandoc|python)/.test(x)
          || /(not|never|do not|don't).{0,20}(raw )?(pandoc|python).{0,30}(use|via) (the )?\/pdf/.test(x)
          || /never raw pandoc/.test(x);
    });
    return pandocIsOutputEngine && !stillContradicts;
  },

  // BUG 1b: /pdf is still the INPUT reader (must NOT have been collateral-damaged).
  pdf_input_still_via_pdf_skill: () => {
    const t = lc(cover) + lc(SKILL);
    return /\/pdf/.test(t) && /(read|extract|input).{0,40}\/pdf|\/pdf.{0,40}(read|extract|scanned|image)/.test(t)
        && /(never|do not|don't|no).{0,40}(raw file i\/o|python|direct file)/.test(t);
  },

  // BUG 1c: pdf-export distinguishes INPUT (read course PDFs via /pdf) vs OUTPUT (pandoc/xelatex).
  pdf_export_input_output_note: () => {
    const t = lc(pdfexport);
    return /input/.test(t) && /output/.test(t) && /\/pdf/.test(t) && /pandoc/.test(t);
  },

  // BUG 2: a SIZE tier keyed to TOPIC / CONCEPT count exists (for Path B/C page-less inputs),
  // in addition to the page-count tier. OLD keyed tier to page count only -> FAIL.
  topic_count_tier: () => {
    const t = lc(intake) + lc(SKILL);
    const hasTopicTier = /(topic|concept)[s]? count/.test(t) || /(by|keyed to|per).{0,15}(topic|concept)[s]? count/.test(t);
    const tiersByTopics = /(topic|concept).{0,60}(light|medium|heavy|split)/.test(t)
      || /(light|medium|heavy|split).{0,80}(topic|concept)/.test(t);
    return hasTopicTier && tiersByTopics;
  },

  // BUG 2b: SKILL scale guard says SIZE picks the tier — page count (PDF) OR topic count (list/syllabus).
  scale_guard_size_pages_or_topics: () => {
    const t = lc(SKILL);
    return /size/.test(t) && /page count/.test(t) && /(topic count|topic[- ]list|syllabus)/.test(t);
  },

  // BUG 2c: Path B/C apply the topic-count tier + batch large + keep whole-course checklist.
  pathBC_apply_topic_tier: () => {
    const t = lc(cover);
    const mentionsTopicTier = /(topic|concept)[- ]count tier|tier (by|keyed to|on) (topic|concept)/.test(t)
      || /(path b|path c).{0,200}(topic|concept)[s]? count/.test(t);
    const batchesAndChecklist = /(batch|split)/.test(t) && /(whole|entire|across batches).{0,30}(course|checklist)|checklist.{0,40}(whole|entire|across batches)/.test(t);
    return mentionsTopicTier && batchesAndChecklist;
  },

  // BUG 3: web mode is decided at INTAKE by whether WebSearch/WebFetch is actually
  // AVAILABLE IN YOUR TOOLS; if uncertain, DEFAULT to no-web; user may override.
  web_detection_by_tool_availability: () => {
    const t = lc(intake);
    const byTools = /(websearch|webfetch).{0,40}(available|in your tools|is in your tools)|available in your tools/.test(t);
    const defaultOffline = /(cannot tell|uncertain|unsure|can[- ]?t tell).{0,60}(default|assume).{0,30}(no[- ]web|offline)/.test(t)
      || /(default|assume).{0,30}(no[- ]web|offline)/.test(t);
    const userOverride = /(user|they).{0,30}(grant|deny|override)/.test(t);
    return byTools && defaultOffline && userOverride;
  },

  // BUG 3b: supplement AGREES — mode determined at intake by tool availability; user can override
  // (no implication that the two files disagree on who decides).
  supplement_agrees_on_web_decider: () => {
    const t = lc(supplement);
    return /(determined|decided|set).{0,30}(at|in|during)?.{0,15}(intake|phase 0)/.test(t)
        && /(tool availability|available in your tools|websearch|webfetch)/.test(t)
        && /(user|they).{0,30}(override|grant|deny)/.test(t);
  },

  // BUG 4: NO materials AND no identifiable standard syllabus -> STOP and ask for
  // materials/reference syllabus; do NOT generate an outline from thin air.
  // (Still generates when a standard syllabus IS identifiable.)
  no_syllabus_refusal: () => {
    const t = lc(subject) + lc(cover) + lc(SKILL);
    const refuses = /(stop|ask|decline|do not generate|don['’]?t generate).{0,120}(material|syllabus)/.test(t)
      || /(no material|without material).{0,120}(no|cannot|can['’]?t).{0,40}(identif|find).{0,40}syllabus.{0,160}(stop|ask|decline|do not generate)/.test(t);
    const conditionedOnBoth = /(no material).{0,80}(no|cannot|can['’]?t).{0,40}(identif|find|standard).{0,40}syllabus/.test(t)
      || /(no material).{0,40}(and).{0,40}(no).{0,40}syllabus/.test(t);
    return refuses && conditionedOnBoth;
  },

  // BUG 5: completeness of coverage is non-negotiable — never drop a topic to be brief;
  // brevity is satisfied via depth calibration + the quick-reference cheat sheet.
  brevity_never_drops_topic: () => {
    const t = lc(SKILL) + lc(distillAll);
    const completenessNonNeg = /(completeness|coverage).{0,40}(non-negotiable|never)/.test(t)
      || /never (drop|omit) (a )?topic.{0,30}(brief|short|brevity)/.test(t)
      || /(brief|short|brevity).{0,40}never (drop|omit)/.test(t);
    const viaCalibrationOrCheatsheet = /(depth calibration|minimal (capsule )?depth|quick[- ]reference|cheat sheet)/.test(t);
    return completenessNonNeg && viaCalibrationOrCheatsheet;
  },
};

const ev = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'eval-cases.json'), 'utf8'));
let pass = 0, fail = 0;
const lines = [];
for (const c of ev.cases) {
  const probes = c.red_probe || {};
  const keys = Object.keys(probes);
  const results = keys.map(k => {
    const fn = P[k];
    if (!fn) return { k, ok: false, err: 'UNKNOWN_PREDICATE' };
    let ok = false; try { ok = !!fn(); } catch (e) { ok = false; }
    // probes are all expected-true assertions of authorized behavior
    return { k, ok };
  });
  const ok = results.every(r => r.ok);
  const failed = results.filter(r => !r.ok).map(r => r.k);
  if (ok) { pass++; lines.push(`PASS ${c.id}`); }
  else { fail++; lines.push(`FAIL ${c.id} — unmet predicate(s): ${failed.join(', ')} [edge: ${c.covers_checklist_edge ?? 'n/a'}]`); }
}
const summary = `\n${pass}/${pass + fail} cases satisfied design-acceptance against: ${dir}`;
console.log(lines.join('\n') + summary);
process.exit(fail === 0 ? 0 : 1);
