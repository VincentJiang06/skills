# Changelog — paper-writer

All notable changes to the `paper-writer` skill. Semver.

## [0.2.2] — 2026-09-25

R20 wave-close record. Documentation only → patch: no script, reference or SKILL.md behaviour
text changed; only `metadata.version`, this entry and the two READMEs. The fix budget for this
wave is spent (iron rule 3: one battery round, one fix round, one fix audit), so the open
findings below are recorded, not fixed. Decision Record:
`runs/paper-writer/decision-record.json` in the R20 workspace.

Principle pointers for this entry:
- The corrections: P10. Written text gains no authority from being written, and a CHANGELOG
  claim must not say more than its measurement.
- The E11 record: P11 settlement and E11. A pre-registered rule binds, and is not reinterpreted
  after the results are in.
- The draft verdict: O5 min-fold. The written verdict never exceeds the battery or the unmet
  acceptance evidence.
- Open findings recorded, not fixed: iron rule 3 and A51(v), a bounded repair loop.

### Corrections to the 0.2.1 entry
- **"Zero new hits" held only on the existing corpus.** The fix audit found new false-positive
  classes and one crash in the 0.2.1 parser code, outside that corpus (FA-1 to FA-5 below).
  Three of them (FA-1 to FA-3) were reproduced again at wave close against HEAD. On the same
  inputs 0.2.0 raises none of them: it passes FA-1, and on FA-2 and FA-3 it reports only the
  missing DOI in the test entry.
  Iron rule 7 was measured on the corpus that existed; it did not cover these shapes.
- **PW-F10 covers the GB/T form `[1-3]`, not the IEEE range form `[1]–[3]`.** The IEEE form is still
  read as {1, 3}, so entry [2] is reported as uncited (FA-11).
- **Size figures, with the baselines named.** `scripts/` went from 608 lines at the pre-wave commit
  `c2a922b` to 697 (+14.6%). Measured from 0.2.0 (`0fa9184`, 603 lines) the growth is +15.6%.
  `check_citations.py` alone went from 212 to 298 lines (+40.6%). The harness went from 28 to 42
  cases, exactly +50.0%, which is at the iron-rule-4 line but not over it.
- **The mutation note refers to a check that does not exist.** Same-key reference entries merge
  silently in `check_citations.py` (`ref_keys` is a set), so no "a/b suffix form check" exists to
  lose (FA-8). The `_2` suffix in the checklist is the only defence.

### Verification record (A33 low tier)
- **Tests at close:** `evals/harness.py` gives 42/42, exit 0. `battery/fix-fp/measure.sh` output
  is byte-identical to the fix round's recorded `final.txt`. The 0.2.0 engineer harness
  (`engineer/run_all.sh`) now exits 1, and both reasons are expected:
  - `c7` pins `version: 0.2.0`.
  - Its corpus diff against the pre-0.2.0 snapshot shows 9 verdict changes on pre-existing files,
    all under a non-native style. APA papers checked as Chicago now FAIL. GB/T papers extracted
    under an author-date style now list `<UNKEYED:…>` entries (exit 0) where they used to exit 1.
    The other 308 changes are the fix round's new fixtures.
- **E11 two-arm (run on 0.2.0, before the fix round).** Three cases, N=3, direction only, judge
  unblinded (the A/B mapping is recorded in `judgement.md`).
  - C1 (APA): WITH narrowly better. J2 4/4 vs 3/4; the WITHOUT failure was this skill's own
    false positive on `Nesi and Prinstein (2015)`, fixed in 0.2.1. J3 near-tie. About 1.35x
    tool calls.
  - C2 (GB/T): WITH better. J2 4/4 vs 2/4, where both WITHOUT failures are largely script
    artifacts. About 0 vs 4 UNSURE citations. J3 prefers WITH; its policy figures were checked
    against gov.cn and beijing.gov.cn. About 2.4x tool calls.
  - C3 (IEEE, planted traps): WITH narrowly better. J2 4/4 vs 3/4, the WITHOUT failure being a
    script artifact. Both arms handled all three traps. J3 tie. About 1.7x tool calls.
  - M1 (unflagged FABRICATED + MISATTRIBUTED + OVERSTATED) is 0 in all six papers. J4 reply
    honesty passes in all six. Tokens and wall-clock were not recorded, so the pre-registered 3x
    token bound cannot be checked.
  - **Pre-registered uplift rule: NOT met.** ΣM1 is 0 for WITH and 0 for WITHOUT. The letter of
    the delta≈0 rule is not met either, because J2 is unequal and WITH is ahead in every case. The
    judge attributes every J2 gap to how the scripts read allowed forms, and the WITH arm is the
    one that ran those scripts. The retire branch was not taken: WITHOUT is not ≥ WITH in any
    case, and C2 is a preference win.
  - **The 0.2.0 load-bearing change was not exercised.** None of the three WITH hosts had a
    subagent-dispatch tool, so all three used fallback A: "self-verified, no independent
    verifier". The self-pass did soften four OVERSTATED claims in C1 and four in C2. E11 therefore
    measured the fallback path, not the independent verifier.
- **Verifier calibration** (`success.verifier_calibration`): NOT RUN, because no dispatch tool
  was available. The pack is ready at `runs/paper-writer/calibration/`.
- **Pressure sentinels:** not run.
- **Battery round 1 (on 0.2.0):**
  - Seeds 5/5: S1→PW-F01, S2→PW-F06, S3→PW-F07, S4→PW-F02, S5→PW-F16.
  - Non-seed confirmed: 3 P1 (F03, F04, F08), 5 P2 (F05, F09, F10, F11, F12) and 7 P3 (F13, F14,
    F15, F16r, F18, F19, F21). 2 refuted (F17, F20).
  - The fix round (0.2.1) fixed all 3 P1 and all P2.
- **Fix audit (on 0.2.1):** 5 P2 and 7 P3, listed under "Open" below.
  - All five P2 are in code the fix round itself wrote. That is the pattern iron rule 3 exists to
    stop. The rule's P0 trigger did not fire, but no further parser fixing is done in this wave.
- **Independence tier:** instance. Builder, attacker, adjudicator, fixer, fix auditor and E11
  judge were all fresh Opus 5.5 high contexts. There is no cross-vendor evidence.
- **Model deviation:** the skill-creator-max model policy of 2026-09-13 says builder = Fable and
  evaluators = Opus. The owner ordered every role in this wave onto Opus 5.5 high, so the
  evaluators share the builder's model.
- **Effective verdict: draft.**
  - The E11 uplift rule is not met, and the verifier's calibration is unmeasured.
  - P2 regressions from the fix round are open in a blocking gate.

### Open (not fixed; next wave, owner ruling needed first)
Fix-audit findings on 0.2.1 (all in `scripts/check_citations.py` unless stated):
- **FA-1 (P2), new false positive (FP).** A capitalised word before a parenthesised year range is
  read as a citation. Examples: `Great Recession (2008–2009)` and `World War II (1939–1945)`.
- **FA-2 (P2), new crash.** `[2024-01-15]` raises an uncaught `ValueError`, exits 1 and prints no
  reason.
- **FA-3 (P2), new FP.** Interval notation `[0, 1]` and `[0, 255]` is read as citation markers
  under IEEE and GB/T.
- **FA-4 (P2).** A lower-case-initial surname (`hooks, b.`, `d'Alembert`, `al-Ghazali`) with no
  later capitalised token has no passing form, and the error message ("needs a (YYYY) date") is
  wrong.
- **FA-5 (P2), new FP.** In a Chinese clause that names two authors, the run is mapped to the
  earliest reference surname in it, not to the one next to the year.
- **FA-6 (P3).** A fullwidth `（2020）` date in a Chinese APA reference entry is not keyed.
- **FA-7 (P3).** The MLA surname-in-body check cannot find a CJK surname inside running text.
- **FA-8 (P3).** Same-key reference entries merge silently, contradicting the docstring and
  citation-styles.md:15.
- **FA-9 (P3), J3b source count, SKILL.md:46.**
  - `refs=N` counts duplicate lines.
  - SOURCE_NEEDED entries can be subtracted twice.
  - The with-gaps reply template omits the `sources N (min M)` clause.
- **FA-10 (P3).** A three-author or corporate narrative (`Smith, Jones, and Lee (2012)`, `World
  Health Organization (2020)`) or `(April 2021)` still takes the last word as the name. This
  predates 0.2.1.
- **FA-11 (P3).** The IEEE range form `[1]–[3]` is still misread (see Corrections).
- **FA-12 (P3).** The CHANGELOG size claim: the baselines are corrected above.

Carried from battery round 1 (P3, not assigned to the fix round):
- **F13:** eval-layer calibration vocabulary. There is no Unknown cap, and the overstated anchor
  is labelled MISATTRIBUTED.
- **F14:** SKILL.md:121-123 turns `[需要来源]` into an English marker.
- **F15:** the `extract_citations` output says "drop the claim".
- **F16r:** the STALE marker is missing at SKILL.md:58-59.
- **F18:** `## Reference List` is counted in the length while the output prints `refs=excluded`.
- **F19:** the GB/T worked example has a placeholder author and a DOI that returns 404.
- **F21:** the sentinel is labelled ~64K tokens but is about 77.8K.

Routing hypothesis for the next wave: FA-1, FA-3, FA-5 and FA-10 share one cause. Whether a
parenthesised year or a bracketed number is a citation depends on the words around it (see
`Great Recession (2008–2009)` against `Smith (2020)`, or `[0, 1]` against `[1, 4]`). By S14 /
A50(i) that direction is not separable by a deterministic rule. The smallest term is therefore
the blocking status of the in-text → reference direction for author-date and numeric styles. It
should become report-only, with the verifier and J9 owning it, as MLA's direction already is. A
new round of regex patches is not the fix (iron rule 2; the caoliao 3.1.x precedent).

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
  (2010)`, `(Smith, 2010, 2011)`, `(J. Smith, 2020)` and particles like `van der Waals` are accepted.
  Iron rule 7.
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
- Size: `scripts/` went from 608 to 697 lines (+14.6%). Eval cases went from 42 to 56 (harness
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
