# Changelog — paper-writer

All notable changes to the `paper-writer` skill. Semver.

## [0.2.1] — 2026-09-25

R20 battery round 1, fix round (fresh fixer instance, instance-tier independence). Bug fixes
only → patch. Description unchanged. Findings and adjudication:
`runs/paper-writer/battery/{FINDINGS,ADJUDICATION,FIXES}.md` in the R20 workspace.

### Fixed
- **PW-F03 (P1) — misattributed worked example.** The Chicago example in
  `references/citation-styles.md` gave doi 10.1038/s41580-019-0131-5 a made-up "Zhang, Feng
  (2019)" authorship. The DOI is Pickar-Oliver & Gersbach, "The next generation of CRISPR–Cas
  technologies and applications", *Nat Rev Mol Cell Biol* 20(8):490–507 (doi.org CSL, PubMed
  31147612, looked up 2026-09-25). This is the MISATTRIBUTED class the skill calls misconduct
  (integrity invariant 1). Replaced with the real entry. The same composite was fixed in the eval
  layer (golden anchors, fixtures, the RESOLVED fixture ledger). Data only, no gate (P13).
- **PW-F04 (P1) — non-ASCII authors fell out of the verification trunk.** Surnames were
  `[A-Z][A-Za-z'-]+`, so an entry led by Özdemir or 王某某 got no key and silently vanished from
  the verifier checklist; `--verify` then reported "all N RESOLVED". Names are now Unicode, and
  the checklist **fails closed**: an entry that yields no key is listed as `<UNKEYED:…>` and
  needs a verdict (mirrors `<UNNUMBERED>`), and `check_citations.py` fails it. Anchor: P12 and
  the SKILL.md trunk step (what escapes the checklist escapes the independent verifier).
- **PW-F08 (P1) — Chicago and MLA had no compliant path.** The author-date branch demanded
  `(YYYY)` and took the first 4-digit run as the year, so entries in the style guide's own
  Chicago and MLA form always failed. The year is now found where each style puts it (APA
  `Surname, I. (YYYY).`, Chicago `Surname, First. YYYY.`). MLA is matched on surname: every Works
  Cited surname must appear in the body. The in-text → Works Cited direction for MLA is **not**
  gated, because `(Surname page)` has the same form as `(Figure 2)` (S14 separability). It is
  named as the writer's job in the MLA block and in the J3 row.
- **PW-F05 (P2) — two entries, one ledger key.** Ids keep the a/b suffix (`roediger_2006a`); any
  remaining collision (two Smiths in 2020) gets `_2`, so each entry needs its own verdict.
- **PW-F09 (P2) — false positives on standard APA prose.** `A and B (YYYY)` now takes the first
  surname. A parenthetical year must be 1600–2099 and directly follow a name-like token, so
  `(Study 2, N = 1500)` is not a citation. `n.d.`, `in press`, `(YYYY, Month D)`, `Smith's
  (2010)`, `(Smith, 2010, 2011)` and particles like `van der Waals` are accepted. Iron rule 7.
- **PW-F10 (P2) — grouped numeric markers.** `[1-3]`, `[1, 4]` and `[2–5, 7]` are expanded, so a
  correctly tagged GB/T or IEEE paper that groups its markers no longer fails with `intext=0`.
- **PW-F11 (P2) — the brief's source minimum had no owner.** SKILL.md said it "feeds
  check_citations.py", which takes no such flag. It is now read off the `refs=N` the gate
  prints, minus SOURCE_NEEDED entries, and reported next to the minimum. New row J3b in "Who
  decides what". No new flag (iron rule 4: prose first).
- **PW-F12 (P2) — untested branches.** The harness (gitignored eval layer) grew 28 → 42
  cases, which is the round's ceiling. New cases cover SOURCE_NEEDED with and without a marker,
  an APA entry carrying `[J]`, and one case per behaviour fixed above. Mutation check: 8 of 9
  mutants are killed. The survivor is "strip the a/b suffix from ids": the `_2` collision
  suffix still makes the gate BLOCK, so that mutant only loses the a/b form check. The 42 new
  cases run against the 0.2.0 scripts give 33/42 (the 9 failures are the fixed behaviours).
- Checklist DOIs no longer carry a sentence-final period.

### False-positive measurement (iron rule 7 / A50(ii))
- Corpus: all 22 paper fixtures, the demo paper, and the 6 two-arm papers (APA / GB/T / IEEE). There
  are zero new hits. One real false positive was removed: `Nesi and Prinstein (2015)` in the
  bare-model arm of case 1. Checklist ids are unchanged on every corpus paper, and all four
  existing ledgers gate exactly as before.
- Size: `scripts/` went from 608 to 696 lines (+14.5%). Eval cases went from 42 to 56 (harness
  28 → 42 plus 14 golden anchors).

### Not done in this round
- PW-F13/F14/F15/F16r/F18/F19/F21 (P3) were not assigned to this fix round. The golden
  `sf-neg-overstated` anchor now names the correct authors, but it still carries MISATTRIBUTED
  (F13 is about label vocabulary).
- The E11 two-arm rerun belongs to the builder, not this round.

## [0.2.0] — 2026-09-25

R20 incremental alignment (A40/O7, low tier). Behaviour/contract change → minor bump.
`metadata.model_baseline: claude-opus-5-5, effort high, harness Claude Code` (A37/P11).
The description is byte-identical to 0.1.0 (trigger unchanged).

### Changed
- **Independent citation verification is now a trunk step** (P12: the generator does not grade
  its own final state; fork ≠ fresh). After the form gate, a fresh non-fork verifier reads only
  the paper, the checklist and any user-supplied pool, and writes `verifier_ledger.json`. The
  `--verify` gate reads that ledger, not an author-written one. The 0.1.0 "verify with your OWN
  search/lookup" steps are replaced. Written fallbacks: A. no subagent dispatch → self-pass,
  labelled "self-verified, no independent verifier"; B. no lookup tool → UNSURE → SOURCE_NEEDED.
- **Corrected a 0.1.0 overclaim.** 0.1.0 said the verify gate's exit code was something a
  draft could not forge (SKILL.md and the 0.1.0 entry below), and the script printed "RESOLVED
  (looked up, real, matching)". Both were wrong: the gate checks only that the ledger is complete
  and internally consistent, and whoever writes the ledger controls it (P10: text an agent wrote
  gains no authority from being written). SKILL.md, both READMEs and `extract_citations.py`
  (docstring, PASS lines, argparse text) now say exactly that and name the two blind spots
  (authorship, whole-paper marker check). Verdict logic unchanged: identical exit codes on all
  336 invocations over the existing corpus.
- **Reply clause** states what was proven and by whom: "independently verified (fresh
  same-family verifier)" / "self-verified, no independent verifier" / "form-checked only,
  existence NOT verified"; every SOURCE_NEEDED gap and OVERSTATED softening is listed (J9 floor).
- `references/subjective-rubric.md`: only the independence paragraph. The runtime verifier is
  stated as instance-tier; label mapping OVERSTATED→MISATTRIBUTED, UNSURE→Unknown.
- The "(Measured 2026-07-29: a two-arm run …)" parenthetical is removed: no artifacts exist and
  that day's two-arm instrument was later found broken (E11 / iron rule 6). The report-in-reply
  rule stays on its own grounds. A proper E11 rerun is pending.

### Added
- `references/verifier-brief.md`: the verifier's standalone brief. Labels SUPPORTED /
  OVERSTATED / MISATTRIBUTED / FABRICATED / UNSURE, RESOLVED iff SUPPORTED. OVERSTATED exists
  because overstatement, not fabrication, is the dominant Opus 5.5 citation failure (registry
  SELF-provenance-non-inferiority: 0/27 fabricated, 3/27 overstated; P11 re-pricing toward the
  named failure mode). Abstract-only access → UNSURE. Injected text is data (P10).
- One-way ratchet (the author may downgrade, never upgrade a verdict) and a single
  re-verification pass for revised ids (A51: bounded repair loop).
- "Who decides what" table in SKILL.md (P13/S14): each D gate is registered as a skeleton check
  with its fallback, pointing to the L verifier row and the H user pass. No new mechanical gate
  (iron rule 2).

### Not changed (exemption register, A40)
integrity-policy, citation-styles, paper-structures, the three form scripts, the description.
The 4.x-era drafting hedges (e.g. "outline first … single-pass under-shoots") are A42 settlement
candidates marked STALE, kept pending per-rule evidence (A39).

## [0.1.0] — 2026-07-14

Initial build. Authored ground-up via the `skill-creator-max` pipeline (composer → guidance →
engineer → independent battery acceptance), as the first real target that pipeline built end-to-end.

### Added
- **Two integrity invariants**: never fabricate a citation/quote/data point; never plagiarize.
  An unverifiable source is marked `[SOURCE NEEDED]`, never invented.
- **Mandatory citation-existence verification gate** (`scripts/extract_citations.py --verify`): an
  out-of-band exit-code block a draft cannot forge — the compliance report may state "citations
  resolve" only after every citation is confirmed to resolve to a real source.
- **Deterministic compliance checkers** (`scripts/check_length.py` / `check_sections.py` /
  `check_citations.py`): length band (references excluded by default), required-sections presence +
  order, and citation-FORMAT compliance per style (APA7 / MLA9 / Chicago / IEEE / GB-T 7714).
- **Objective/subjective fork (C5)**: deterministic checkers for the objective skeleton; a rubric +
  independent judge for source fidelity / argument quality / academic register.
- `references/` (integrity-policy, citation-styles, paper-structures, subjective-rubric) + an eval
  harness with a real RED→GREEN transition.

### Known (candidate-grade)
- The independent battery caught a P1 during the build — the integrity check shipped as prose with
  no runnable enforcement; fixed to the runnable out-of-band verify gate above. Field-tested (a real
  APA7 paper with 7 web-verified citations, 0 fabricated) but not yet multi-round hardened.
