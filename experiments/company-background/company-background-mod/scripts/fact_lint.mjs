#!/usr/bin/env node
// fact_lint.mjs — executable fact/citation linter for the company-background-mod skill.
//
// Scans the skill's OWN authored content (SKILL.md + references/*.md) and asserts
// the dossier-sourced invariants from _research/cli-im-sources.md (S1–S5):
//   - founding year is 2011 everywhere a founding year appears (never 2012)
//   - the unsourced precise figure "43亿"/"43 亿" appears nowhere
//   - key facts match the dossier (legal entity, 1600万+ users, 80%+ tech staff, 甬水桥)
//   - every precise quantified factual claim in references/company-facts.md carries an S-id
//
// This is the MECHANISM. The eval harness (evals/run_all.mjs) imports `lintSkill`
// and runs it as the file-scannable test cases. Do not reimplement it there.
//
// ── MATCHING DISCIPLINE (the ENFORCED SCOPE — keep SKILL.md / company-facts.md §九 in sync)
// The founding-year and user-scale checks match facts ROBUSTLY, not by a fixed
// character window. Four properties (this is the documented promise):
//   (a) CLAUSE-BOUNDED — text is split into clauses on sentence/clause punctuation
//       (。！？；;\n + markdown table/bullet delimiters). For the founding check
//       「，,、」are ALSO soft clause boundaries, so a cue and a year in DIFFERENT
//       comma-clauses do NOT match (e.g. "自成立以来…，2020 年…" is not a founding-year
//       claim). The user-scale check uses sentence-level clauses so a figure anywhere
//       in the SAME sentence as a 用户/规模 cue is compared (no narrow char window).
//   (b) ORDER-AGNOSTIC — a cue may appear BEFORE or AFTER the number within a clause
//       ("2013 年成立" and "成立于 2013" both match).
//   (c) CHINESE-NUMERAL-AWARE — a small normalizer maps Chinese-numeral years &
//       magnitudes to arabic before comparison: 二〇/二零/二○…→ 2013; 一千五百万→ 1500万;
//       一千六百万→ 1600万 (digits 〇零○一二三四五六七八九 and 十百千万亿).
//   (d) COMMA-TOLERANT — thousands separators are stripped ("1,500万"→ 1500万) before
//       comparing.
// NON-FOUNDING SENSE GUARD: a 成立 cue immediately followed by 了 ("成立了新部门")
// or the since-founding idiom 自成立以来 / 成立以来 / 成立至今 is treated as NOT a
// founding-year claim — these describe "established a thing" / "since founding",
// not "the company was founded in year Y", so they never false-positive.
// Scope is deliberately bounded: only the founding YEAR and the user-scale MAGNITUDE
// get numeral-aware/clause-bounded treatment (the two facts adversarial batteries
// mutate); other checks remain simple substring/exact-token assertions appropriate
// to a lite knowledge skill.
//
// Usage (CLI): node scripts/fact_lint.mjs [skillRoot]
//   exits 0 if all checks pass, 1 otherwise.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- content collection -------------------------------------------------

// Files whose authored prose must obey the invariants.
const SCANNED_FILES = [
  "SKILL.md",
  "references/product-detail.md",
  "references/company-facts.md",
];

function readIfExists(absPath) {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

// Normalize full-width digits + spacing so "43 亿", "43亿", "４３亿" all collapse.
// (Thousands separators are stripped here too: "1,500万" → "1500万".)
function normalize(text) {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/(?<=\d),(?=\d)/g, "") // strip thousands separators between digits
    .replace(/[ \t 　]+/g, "");
}

// ---- Chinese-numeral normalizer ----------------------------------------
// Maps Chinese-numeral YEARS and MAGNITUDES to arabic so the founding-year and
// user-scale checks compare apples to apples. Two shapes are handled:
//   • POSITIONAL year digit-strings: 二〇一三 / 二零一三 / 二○一三 → "2013"
//     (a run of ≥3 single digit-chars, treating 〇零○ as 0, before an optional 年).
//   • STRUCTURED numbers w/ place words: 一千五百万 → "1500万", 一千六百万 → "1600万",
//     一千五百 → "1500", 三千 → "3000" (units 十百千; myriad words 万亿 kept as a
//     trailing 万/亿 token so downstream "<N>万" matching still works).
// Anything it does not recognize is left untouched. It runs on already-normalized
// (space-stripped, full-width-folded) text.
const CN_DIGIT = { "〇": 0, "零": 0, "○": 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 两: 2 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };

// Convert a pure sub-myriad Chinese numeral (digits + 十百千) to a Number.
// e.g. 一千五百 → 1500, 十 → 10, 一百零五 → 105. Returns null if not parseable.
function cnSection(s) {
  if (!s) return null;
  let total = 0;
  let current = 0;
  let sawAny = false;
  for (const ch of s) {
    if (ch in CN_DIGIT) {
      current = CN_DIGIT[ch];
      sawAny = true;
    } else if (ch in CN_UNIT) {
      const unit = CN_UNIT[ch];
      total += (current === 0 ? 1 : current) * unit; // 十=10, 一十=10
      current = 0;
      sawAny = true;
    } else {
      return null;
    }
  }
  return sawAny ? total + current : null;
}

function normalizeCnNumerals(text) {
  let out = text;

  // (1) Positional year strings: ≥3 consecutive Chinese single-digits (incl. 〇零○),
  // NOT followed by a place word (those are structured numbers, handled below).
  // Map each char to its digit and concatenate. e.g. 二〇一三 → 2013.
  out = out.replace(/[〇零○一二三四五六七八九]{3,}/g, (m, offset, str) => {
    const next = str[offset + m.length];
    if (next && "十百千万亿".includes(next)) return m; // structured number, leave for (2)/(3)
    let digits = "";
    for (const ch of m) digits += CN_DIGIT[ch];
    return digits;
  });

  // (2) Structured magnitudes ending in a myriad word 万/亿: <section>万 / <section>亿.
  // e.g. 一千五百万 → 1500万, 一千六百万 → 1600万, 两千万 → 2000万.
  out = out.replace(/([〇零○一二三四五六七八九两十百千]+)([万亿])/g, (m, sec, myr) => {
    const v = cnSection(sec);
    if (v == null) return m;
    return `${v}${myr}`;
  });

  // (3) Bare structured numbers containing a place word (no myriad), e.g. 一千五百 → 1500.
  out = out.replace(/[〇零○一二三四五六七八九两十百千]*[十百千][〇零○一二三四五六七八九两十百千]*/g, (m) => {
    const v = cnSection(m);
    return v == null ? m : String(v);
  });

  return out;
}

// ---- clause splitting ---------------------------------------------------
// Split a single normalized line into clauses on punctuation. `soft` adds the
// comma family 「，,、」as boundaries (used by the founding check so a cue and a
// year in different comma-clauses don't pair). Markdown table cell pipes "|" are
// always boundaries (a table row has independent cells).
function splitClauses(normLine, { soft } = {}) {
  const hard = soft ? /[。！？!?；;、，,|]/ : /[。！？!?；;|]/;
  return normLine
    .split(hard)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- the checks ---------------------------------------------------------
//
// Each check: { id, edge, ok, detail }. `edge` ties it to the spec's
// adversarial_checklist so the harness can map coverage 1:1.

// Citation coverage targets precise quantified MAGNITUDE claims (万 / 亿 / %) —
// exactly the edge's examples ("a bare 生成超 N 亿, a user/percentage number").
// Bare year tokens are deliberately EXCLUDED here: the founding year is enforced
// positively by check (1) and time figures by the as-of check (11); a year mentioned
// in procedural prose (e.g. the "run the linter (成立年=2011…)" step) is not a sourced
// magnitude claim.
const CITATION_CLAIM_PATTERNS = [
  /\d+\s*万/, // 用户/场景 magnitudes e.g. 1600万, 500万
  /\d+\s*亿/, // 累计生码量级 e.g. N 亿
  /\d+\s*%|\d+\s*％/, // 占比 e.g. 80%
  /\d+\s*家(?!庭)/, // 客户/企业 counts e.g. 2000 家企业 (not 家庭)
];

// Lines explicitly framed as marketing positioning / non-data are, by the skill's own
// taxonomy (dossier §八), NOT sourced facts — so they are exempt from citation (check 8
// independently forbids presenting them as hard data). This is NOT a loophole for real
// stats: an untagged bare quantified assertion is still required to carry an S-id.
const POSITIONING_EXEMPT = /(定位|非硬数据|不作为硬数据|不是来源化|营销化|positioning)/;

const CITATION_TOKEN = /\bS[1-5]\b/;

function buildChecks(skillRoot) {
  const files = {};
  for (const rel of SCANNED_FILES) {
    files[rel] = readIfExists(path.join(skillRoot, rel));
  }
  const present = Object.entries(files).filter(([, v]) => v !== null);
  const allText = present.map(([, v]) => v).join("\n");
  const allNorm = normalize(allText);

  const checks = [];

  // (1) founding year must be 2011 — asserted POSITIVELY, CLAUSE-BOUNDED, ORDER-AGNOSTIC,
  // CHINESE-NUMERAL-AWARE. For each line we normalize (folds full-width digits, strips
  // thousands separators), map Chinese numerals to arabic, then SOFT-split into clauses
  // (comma family are boundaries). A clause is a founding-year claim iff it carries a
  // founding cue (成立/创立/创建/创办/founded/founding) in its FOUNDING sense — i.e. NOT the
  // since-founding idiom (自成立以来 / 成立以来 / 成立至今) and NOT "成立了…" (established a
  // thing). Within such a clause we extract EVERY plausible year (20\d\d, with or WITHOUT
  // a 年 suffix — so "成立于2013", "成立时间：2013", "2013年成立", and a cue-after-year bullet
  // all match) and FAIL on any != 2011. A stray-correct "2011 年" elsewhere CANNOT mask a
  // wrong 成立 statement, and a non-founding year (截至约 2025 年; a "2011 年：…上线" timeline
  // bullet; "成立了新部门…2018 年") carries no in-clause founding cue, so it never fires.
  {
    const FOUNDING_CUE = /(成立|创立|创建|创办|founded|founding)/;
    // Since-founding idiom / established-a-thing sense — these 成立 uses are NOT a
    // "founded in year Y" claim and must not be examined for a founding year.
    const NON_FOUNDING_SENSE = /(自成立以来|成立以来|成立至今|成立了)/;
    const YEAR_TOKEN = /(?<!\d)(20\d\d)(?!\d)/g; // 4-digit 20xx, not part of a longer run
    const wrongHits = []; // founding cue paired (in-clause) with a year != 2011
    const goodHits = []; // founding cue paired (in-clause) with 2011
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        const n = normalizeCnNumerals(normalize(line));
        for (const clause of splitClauses(n, { soft: true })) {
          if (!FOUNDING_CUE.test(clause)) continue;
          if (NON_FOUNDING_SENSE.test(clause)) continue; // since-idiom / 成立了 → skip
          let m;
          YEAR_TOKEN.lastIndex = 0;
          while ((m = YEAR_TOKEN.exec(clause)) !== null) {
            if (m[1] === "2011") goodHits.push(`${rel}:${i + 1}`);
            else wrongHits.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    const sawFoundingYear = goodHits.length > 0 || wrongHits.length > 0;
    const has2011 = /2011\s*年/.test(normalize(allText));
    checks.push({
      id: "founding_year_2011",
      edge: "Founding year stated as 2012 (or any year != 2011) → linter FAILS; correct value is 2011 (S1,S5).",
      // FAIL on ANY in-clause founding year != 2011; also FAIL if the founding year is
      // never asserted at all (no founding-cue year AND no bare "2011 年" anywhere).
      ok: wrongHits.length === 0 && (sawFoundingYear || has2011),
      detail:
        wrongHits.length > 0
          ? `founding year stated as != 2011:\n  ${[...new Set(wrongHits)].join("\n  ")}`
          : goodHits.length > 0
          ? "founding year asserted as 2011 (no founding-cue year != 2011)"
          : has2011
          ? "founding year 2011 present"
          : "founding year never asserted (no 成立/创立 … 20XX, no '2011 年')",
    });
  }

  // (2) the unsourced "43亿" must not appear.
  {
    const ok = !allNorm.includes("43亿");
    // locate for a useful message
    const hits = [];
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        if (normalize(line).includes("43亿")) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    checks.push({
      id: "no_unsourced_43yi",
      edge:
        'The unsourced figure "43亿"/"43 亿" appears anywhere → linter FAILS; must be dropped or replaced with source-traceable "累计生成数亿个二维码" (S1).',
      ok,
      detail: ok
        ? 'no "43亿"/"43 亿" present'
        : `forbidden "43亿" found:\n  ${hits.join("\n  ")}`,
    });
  }

  // (4) legal entity present AND exact — not a naive substring match. Two failure
  // modes are checked independently:
  //   (a) SUBSTITUTION: any "…有限公司" entity token (the run of company-name chars
  //       ending in 有限公司, walking back to a boundary particle/delimiter) that is
  //       not EXACTLY 宁波邻家网络科技有限公司 → FAIL (e.g. 杭州…, 上海冒牌…, fused 北京假冒宁波…).
  //   (b) WRAPPING SPOOF: the exact name demoted inside parens with extra entity
  //       material before the paren, e.g. "北京假冒（宁波邻家网络科技有限公司）" → FAIL.
  // A legitimate mention ("由宁波邻家网络科技有限公司运营", "**宁波…公司**", a table cell)
  // walks back to a boundary and yields the exact token, so it passes. Missing entity
  // (no token at all) also FAILs.
  {
    const EXPECTED = "宁波邻家网络科技有限公司";
    // Boundary chars that delimit a company-name token (not part of the name).
    const BOUNDARY = "由为是和与及、：，。「」“”\"|*（）()";
    const isBoundary = (ch) => ch === undefined || BOUNDARY.includes(ch);
    const isNameChar = (ch) => /[一-鿿A-Za-z0-9]/.test(ch);

    // (a) extract every entity token ending in 有限公司 by walking back over name chars.
    const tokens = [];
    const SUFFIX = "有限公司";
    let from = 0;
    for (;;) {
      const end = allNorm.indexOf(SUFFIX, from);
      if (end === -1) break;
      const tail = end + SUFFIX.length;
      let start = end;
      while (start > 0 && isNameChar(allNorm[start - 1]) && !isBoundary(allNorm[start - 1])) {
        start -= 1;
      }
      tokens.push(allNorm.slice(start, tail));
      from = tail;
    }
    const wrong = tokens.filter((t) => t !== EXPECTED);

    // (b) wrapping spoof: （EXPECTED） or (EXPECTED) preceded by name material.
    const wrapSpoofs = [];
    for (const open of ["（", "("]) {
      const close = open === "（" ? "）" : ")";
      const needle = `${open}${EXPECTED}${close}`;
      let idx = allNorm.indexOf(needle);
      while (idx !== -1) {
        const before = allNorm[idx - 1];
        if (before !== undefined && isNameChar(before) && !isBoundary(before)) {
          wrapSpoofs.push(allNorm.slice(Math.max(0, idx - 6), idx + needle.length));
        }
        idx = allNorm.indexOf(needle, idx + 1);
      }
    }

    const ok = tokens.length > 0 && wrong.length === 0 && wrapSpoofs.length === 0;
    checks.push({
      id: "legal_entity",
      edge: 'Legal entity wrong or missing → expected exactly "宁波邻家网络科技有限公司" (S1,S5).',
      ok,
      detail:
        tokens.length === 0
          ? "legal entity 宁波邻家网络科技有限公司 missing"
          : wrong.length > 0
          ? `legal entity token(s) != exact "${EXPECTED}": ${[...new Set(wrong)].join(", ")}`
          : wrapSpoofs.length > 0
          ? `legal entity wrapped/spoofed: ${[...new Set(wrapSpoofs)].join(", ")}`
          : "legal entity 宁波邻家网络科技有限公司 present (exact)",
    });
  }

  // (5) user scale = 1600万 (+) — CLAUSE-BOUNDED, ORDER-AGNOSTIC, CHINESE-NUMERAL-AWARE.
  // For each line: normalize → map Chinese numerals (一千五百万 → 1500万) → split into
  // SENTENCE clauses (no comma soft-split — a scale claim may span commas, e.g.
  // "用户数量…早已远远超过了 1500 万这个量级"). In any clause carrying a 用户/规模 cue, flag
  // every "<N>万" with N != 1600 as a conflict — works whether the figure precedes or
  // follows the cue, and however far apart they sit IN THE SAME SENTENCE. A non-user
  // "<N>万" (e.g. price "10万+") lives in a clause with no 用户/规模 cue, so it never
  // false-positives.
  {
    const allNum = normalizeCnNumerals(normalize(allText));
    const has1600 = allNum.includes("1600万");
    const SCALE_CUE = /用户|规模/;
    const conflicts = [];
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        const n = normalizeCnNumerals(normalize(line));
        for (const clause of splitClauses(n)) {
          if (!SCALE_CUE.test(clause)) continue;
          const numWanRe = /(\d+)万/g;
          let m;
          while ((m = numWanRe.exec(clause)) !== null) {
            if (m[1] !== "1600") conflicts.push(`${rel}:${i + 1}: ${m[1]}万 (用户/规模 clause: …${clause}…)`);
          }
        }
      });
    }
    checks.push({
      id: "user_scale_1600w",
      edge: 'User-scale stated as other than 1600万+ → expected "超过 1600 万用户" (S1,S2,S5).',
      ok: has1600 && conflicts.length === 0,
      detail:
        conflicts.length > 0
          ? `conflicting user-scale figure(s): ${[...new Set(conflicts)].join("; ")}`
          : has1600
          ? "user scale 1600万 present; no conflicting <N>万 in a 用户/规模 clause"
          : "user scale 1600万 missing",
    });
  }

  // (6) tech-staff ratio 80%+ present.
  {
    const ok = /80\s*%\+?|80\s*％\+?/.test(allNorm) || allNorm.includes("80%");
    checks.push({
      id: "tech_staff_80pct",
      edge: "Tech-staff ratio wrong or absent → expected \"80%+ 技术人员\" (S1,S5).",
      ok,
      detail: ok ? "80% 技术人员 present" : "80% 技术人员 missing",
    });
  }

  // (7) office location 宁波甬水桥科创中心 present.
  {
    const ok = allNorm.includes("甬水桥");
    checks.push({
      id: "office_location",
      edge: 'Office location wrong/missing → expected "宁波甬水桥科创中心" (S1,S5).',
      ok,
      detail: ok ? "甬水桥科创中心 present" : "甬水桥科创中心 missing",
    });
  }

  // (8) marketing-as-data leakage: "30分钟上线" must be framed as positioning,
  // not stated as a bare measured figure. We pass when, wherever the phrase
  // appears, it is tagged on the same line with a positioning marker (定位/理念/
  // 非硬数据) — i.e. not presented as a sourced metric.
  {
    const lines = [];
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        if (normalize(line).includes("30分钟上线")) lines.push({ rel, i: i + 1, line });
      });
    }
    const POSITIONING = /(定位|非硬数据|不作为硬数据|营销|理念支撑|positioning)/;
    const untagged = lines.filter((l) => !POSITIONING.test(l.line));
    checks.push({
      id: "marketing_positioning_framing",
      edge:
        'Marketing-as-data leakage: "30分钟上线" or price deltas (¥几百/年 vs 10万+) presented as measured hard data → expected: framed as positioning, not a sourced figure (dossier §八).',
      // Vacuously ok if the phrase is absent (the skill chose not to make the claim).
      ok: untagged.length === 0,
      detail:
        untagged.length === 0
          ? lines.length === 0
            ? '"30分钟上线" not asserted (ok)'
            : '"30分钟上线" framed as positioning'
          : `"30分钟上线" presented without positioning framing:\n  ${untagged
              .map((l) => `${l.rel}:${l.i}: ${l.line.trim()}`)
              .join("\n  ")}`,
    });
  }

  // (11) stale frozen time-figure: a hardcoded "运行 N 年" / "N 年持续运营" with a
  // concrete N is a number that silently rots → must use dossier phrasing/as-of.
  {
    const hits = [];
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        const n = normalize(line);
        // concrete "14年" (etc.) bound to 运行/运营/持续 with NO as-of cue (截至/约/年份)
        if (/(运行|运营|持续)\d+年/.test(n) || /\d+年(持续)?(稳定)?运营/.test(n)) {
          const hasAsOf = /(截至|约20\d\d|S1|as-of|当前)/.test(line);
          if (!hasAsOf) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    checks.push({
      id: "no_frozen_time_figure",
      edge:
        'Stale time-sensitive figure hardcoded (e.g. "运行 14 年" frozen) → expected: use dossier phrasing/as-of (S1), not a number that silently rots.',
      ok: hits.length === 0,
      detail:
        hits.length === 0
          ? "no frozen 运行N年 figure without as-of"
          : `frozen time figure without as-of:\n  ${hits.join("\n  ")}`,
    });
  }

  // (3) citation coverage: every precise quantified MAGNITUDE claim line in ANY
  // scanned file (not just company-facts.md) must carry an S-id on the same line.
  // The canonical facts table (company-facts.md) must also exist.
  {
    const factsRel = "references/company-facts.md";
    const facts = files[factsRel];
    const uncited = [];
    let scanned = 0;
    for (const [rel, content] of present) {
      content.split(/\r?\n/).forEach((line, i) => {
        // Only consider table/bullet/prose lines that assert a fact (skip headers,
        // separators, the source-roster list itself, blockquotes, and code fences).
        const isStructural =
          /^\s*#/.test(line) ||
          /^\s*\|?\s*-{2,}/.test(line) ||
          /^\s*```/.test(line) ||
          /^\s*>/.test(line);
        // The source roster lines DEFINE S-ids (e.g. "- S1 关于我们 — ...");
        // they are not claims-to-cite.
        const isRosterDef = /^\s*[-*]?\s*\*{0,2}S[1-5]\b/.test(line.trim());
        if (isStructural || isRosterDef) return;
        const hasQuantClaim = CITATION_CLAIM_PATTERNS.some((re) => re.test(line));
        if (!hasQuantClaim) return;
        // Positioning / non-data statements are exempt (governed by check 8 instead).
        if (POSITIONING_EXEMPT.test(line)) return;
        scanned += 1;
        if (!CITATION_TOKEN.test(line)) {
          uncited.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    checks.push({
      id: "citation_coverage",
      edge:
        'A precise quantified claim with no source id (e.g. a bare "生成超 N 亿", a user/percentage number) → flagged as uncited; expected: carries an S-id or is removed.',
      // Require the facts file to exist AND every quantified claim (in any file) cited.
      ok: facts != null && uncited.length === 0,
      detail:
        facts == null
          ? `${factsRel} missing (canonical claim→source table required)`
          : uncited.length === 0
          ? `all ${scanned} quantified magnitude claim line(s) across scanned files carry an S-id`
          : `uncited quantified claim line(s):\n  ${uncited.join("\n  ")}`,
    });
  }

  return checks;
}

// Public API consumed by the harness.
export function lintSkill(skillRoot) {
  const checks = buildChecks(skillRoot);
  return {
    ok: checks.every((c) => c.ok),
    checks,
  };
}

// ---- CLI ----------------------------------------------------------------

function isMain() {
  try {
    return (
      fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
}

if (isMain()) {
  const skillRoot = path.resolve(
    process.argv[2] ||
      path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  );
  const { ok, checks } = lintSkill(skillRoot);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.id} — ${c.detail.split("\n")[0]}`);
  }
  console.log(`\nfact_lint: ${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
  process.exit(ok ? 0 : 1);
}
