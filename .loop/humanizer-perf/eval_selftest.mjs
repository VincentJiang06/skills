#!/usr/bin/env node
// eval_selftest.mjs — NON-VACUITY gate for the PER-MODE blind-judge eval (Stage harden_eval).
// Proves: (1) the rubric is per-mode with a completeness dim; (2) the popsci worked
// exemplar + the 4 paired discrimination fixtures exist; (3) a RECORDED 4-item blind-judge
// run discriminates good vs bad for BOTH modes (good->pass, bad->fail). A green here means
// the test set can actually measure popsci, not just academic.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SK = 'skills/humanizer-academic';
const fails = [];
const ok = (c, m) => { if (c) { console.log('PASS ' + m); } else { fails.push(m); console.log('FAIL ' + m); } };

// 1. rubric is per-mode + has a completeness dimension
const rub = fs.readFileSync(path.join(ROOT, SK, 'references/blind-judge-rubric.md'), 'utf8');
ok(/Track A/.test(rub) && /Track B/.test(rub), 'rubric has Track A (academic) + Track B (popsci)');
ok(/popsci/i.test(rub), 'rubric names popsci');
ok(/完成度|completeness/i.test(rub), 'rubric has a completeness / 完成度 dimension');
ok(/2B\b/.test(rub) && /register/i.test(rub), 'rubric has a popsci-specific register dim (2B)');
ok(/6B\b/.test(rub), 'rubric has a popsci-specific completeness dim (6B)');

// 2. fixtures + popsci exemplar present
const disc = 'evals/fixtures/discrimination';
for (const f of ['good_academic', 'bad_academic', 'good_popsci', 'bad_popsci']) {
  ok(fs.existsSync(path.join(ROOT, SK, disc, f + '.md')), 'discrimination fixture exists: ' + f);
}
const worked = fs.existsSync(path.join(ROOT, SK, 'evals/worked')) ? fs.readdirSync(path.join(ROOT, SK, 'evals/worked')) : [];
ok(worked.some(f => /pop/i.test(f) && /rewrite/.test(f)), '>=1 popsci worked exemplar (evals/worked/*pop*rewrite*.md)');

// 3. recorded judge discrimination: good->pass, bad->fail for BOTH modes
const jp = path.join(ROOT, '.loop/humanizer-perf/selftest-judge.json');
if (!fs.existsSync(jp)) {
  ok(false, 'selftest-judge.json exists (run the 4-item blind-judge discrimination first)');
} else {
  const j = JSON.parse(fs.readFileSync(jp, 'utf8'));
  const by = Object.fromEntries((j.results || []).map(r => [r.fixture, r.verdict]));
  ok(by.good_academic === 'pass', 'good_academic judged PASS on academic track');
  ok(by.bad_academic === 'fail', 'bad_academic judged FAIL on academic track');
  ok(by.good_popsci === 'pass', 'good_popsci judged PASS on popsci track (an academic-copy rubric would WRONGLY fail this)');
  ok(by.bad_popsci === 'fail', 'bad_popsci judged FAIL on popsci track');
}

console.log('');
console.log(fails.length ? `FAIL eval_selftest: ${fails.length} fail(s)` : 'PASS eval_selftest: the per-mode eval is non-vacuous (discriminates both modes)');
process.exit(fails.length ? 1 : 0);
