# Changelog — paper-writer

All notable changes to the `paper-writer` skill. Semver.

## [0.2.6] — 2026-09-25

Re-plane of the two remaining regression classes against installed 0.1.0. Patch: no new
parser, one new output class. Fresh author instance. The conductor ruled option (b) under the
owner's delegation of 2026-09-25 ("这七个你都继续去做把他们做完").

Principle pointers:
- P13 / S14 and iron rule 2: "is this a citation" and "is this lower-case token a surname"
  cannot be settled from the string (`Katrina (2005; category 5)` has the form of `Smith (2012,
  p. 4)`). They move to the L plane (the verifier) instead of getting a third string patch.
- P12 / PW-F04: nothing is silently skipped. Every REVIEW item is on the verifier checklist, and
  the ledger gate blocks until it has a verdict.
- Iron rule 4: script lines 484 → 482, and harness cases stay at 42.

### Changed
- `check_citations.py`: two shapes now print as `REVIEW` lines that name the cause. They are not
  FAILs and do not set the exit code.
  - (i) An entry led by a lower-case-initial surname (`hooks, b.`, `boyd, danah.`, `d'Alembert`).
    This was the FA-4 UNKEYED FAIL.
  - (ii) A narrative year followed by `,` `;` `:` with no reference entry. This was the FA-1
    residual orphan FAIL.
  - A bare initial (`e. Okafor`, `a. Brandt`) and a particle entry without a year (`van Dijk ...
    1998.`) still FAIL. A parenthetical orphan such as `(Smith, 2012)` still FAILs, and so does a
    narrative orphan that closes its parentheses, such as `Jones (2019)`.
  - The PASS line reads "zero FAIL-class orphans", and adds `review=N` when there are REVIEW items.
- `extract_citations.py`: each narrative REVIEW item is listed as `<REVIEW:name_year>`. A
  lower-case-led entry is already listed as `<UNKEYED:…>`. `--verify` accepts `NOT_A_CITATION`
  as terminal for `<REVIEW:…>` ids only, and reports how many there were.
- `SKILL.md`: named **REVIEW route**; new row J3r in "Who decides what"; a report line for
  REVIEW items; the ledger-gate text; `version: 0.2.6`.
  - The route: keep the name as its author writes it, and add an entry if the item is a real
    citation. Everything else goes to the fresh verifier, and an unverified REVIEW item blocks
    delivery.
- `references/verifier-brief.md`: how to label the two REVIEW id kinds, and the
  `NOT_A_CITATION` exception. `references/citation-styles.md`: the UNKEYED sentence names both
  REVIEW shapes.

### Evidence (R20 workspace `runs/paper-writer/battery/fix-r3c/`)
- **Red first:** `red.log` shows 38/42 on the dedfe3d scripts with the new cases, before any
  script edit. `red_final_evals_on_head.log` shows the same 38/42 on the final evals.
  **Green:** `green_final.log` shows 42/42.
- **Harness, 42 cases (the +50% line).** Evals are gitignored; the snapshots are `evals_before/`
  and `evals_after/`.
  - Added 3 cases: `apa_review_shapes` → exit 0 plus the REVIEW strings, and a VERIFY pair
    (BLOCK when REVIEW ids have no verdict; PASS when every id is dispositioned).
  - Dropped 3 subsumed cases: the `check_length` and `check_sections` `--help` cases (their E-L1
    PASS cases already run them), and the ZH impossibly-high-band case (its EN twin and the ZH
    in-band PASS case cover it).
  - Merged into existing fixtures: hooks/boyd into `mla_style_compliant`, hooks + Katrina into
    `orphan_reference` (it still FAILs on the reverse orphan), Katrina + `Jones (2019)` into
    `malformed_citation` (still FAILs on both orphans), `a. Brandt` + `van Dijk` into
    `unkeyed_entry` (still FAILs), and `Karpicke (2012, p. 158)` into `apa_narrative_forms`.
  - Cases may now also assert substrings of stdout.
- **Mutation:** `mutation.log`, 8 of 8 killed.
- **False positives, iron rule 7** (`fp_head.txt` / `fp_now.txt` / `fp_prefixtures_*.txt` /
  `ledgers_*.txt`).
  - All 22 pre-change fixtures, the demo and all 6 arm papers give the same result, differing only
    in the PASS-line wording.
  - The 4 arm/demo ledgers gate identically.
  - The only verdict changes are on the 4 edited or new fixtures, all as intended.
- **Witness** (`witness.txt`, 43 probes, columns installed / dedfe3d / now; tag `R` = a REVIEW
  line is printed).
  - Against installed:
    - 0 legitimate shapes worse.
    - 9 shapes that installed silently passed are now routed as REVIEW.
    - 6 shapes that installed FAILed are now REVIEW.
    - 3 shapes installed FAILed now pass (colon/comma page, van der Waals).
    - 2 defects installed passed now FAIL (lower-case-initial entries).
  - Against dedfe3d: 15 FAIL → REVIEW, and no other change.

### Known costs (accepted by the ruling)
- A true orphan written `Smith (2012, p. 4)` with no entry is REVIEW, no longer FAIL. It is
  caught only when the verifier runs; installed 0.1.0 did not read it at all.
- An uncited lower-case-led entry, and a lower-case junk line in the reference list, are REVIEW,
  not FAIL. They sit on the checklist as `<UNKEYED:…>` and block at the ledger gate until the
  verifier disposes of them.
- Release check not re-run; E11 and verifier calibration are still unrun (see 0.2.5).

## [0.2.5] — 2026-09-25

Round-3 close record. Documentation only → patch. No script, reference or SKILL.md behaviour
text changed; only `metadata.version`, this entry and the two READMEs. Fresh
finalizer/recorder instance. Decision Record: `runs/paper-writer/decision-record.json`
(gates `battery` iteration 3 and `final_acceptance` iteration 2) in the R20 workspace.

Owner ruling for the round (Vince, 2026-09-25, in chat): "这七个你都继续去做把他们做完". It
authorized a third fix round under iron rule 3, scoped to finishing the release. Every other
judgment was delegated to the conductor.

Principle pointers for this entry:
- The release verdict is recorded as measured, not as hoped: P10 (a written claim gains no
  authority from being written) and O5 min-fold (the verdict never exceeds the evidence).
- The corrected witness count below: P10, and the iron-rule-7 gotcha that a fixed probe set
  misses shapes it does not contain.
- No code after the audit's P1: iron rule 3 / A51 fired on round 3's own code, so the only
  moves were reverts (0.2.4), and this entry adds none.

### What round 3 did (0.2.3 fix, 0.2.4 fallback)
- **FA-2 crash on `[2024-01-15]` and FA-3 interval FP `[0, 1]` / `[0, 255]`: closed by revert**
  (`ed155b7`, iron rule 3 / A51 and S14 / A50(i): a group, a date and an interval have the same
  form). IEEE and GB/T equal installed 0.1.0 on these shapes. Cost: PW-F10 re-opened, same as
  installed.
- **FA-1 year-range FP: closed for literal ranges by narrowing** (`f858513`, iron rule 2).
  `Great Recession (2008–2009)`, `(2008-2009)`, `COVID-19 (2020)` and `GPT-4 (2023)` pass. A
  residual stays open (below).
- **FA-4 lower-case surnames: fixed in `bee5139`, then reverted in `e6ba225`.** The fix audit
  found a P1 false pass in `bee5139` itself: entries led by a bare initial keyed as `e` / `a`
  and matched "e.g." or the article "a". Iron rule 3 fired, so the fix was reverted, not
  patched. Two full-revert alternatives (drop the UNKEYED fail; restore 0.1.0's `(YYYY)` check)
  were measured and rejected: each re-opens a P1 (PW-F04 / PW-F08) or adds a false pass.

### Round-3 fix audit
- 1 P1 (false pass, in `bee5139`, round 3's own code) → reverted in 0.2.4.
- P2: FA-4 only half closed in 0.2.3 (`(boyd & Ellison, 2007)` had no passing form). After
  the revert this shape folds into the open FA-4 item below (it now also FAILs as UNKEYED).
- P2: the FA-1 narrowing still accepts a year followed by `,` `;` or `:`. Open (below).

### Release check: NOT release-ready (criterion 1 fails)
The criterion was: every blocking item equal to or better than installed 0.1.0, no open
P0/P1, harness green, offline workflow runs.
- **Holds:** no open P0/P1 (the audit P1 is reverted; PW-F04 and PW-F08 still fixed); harness
  42/42 (installed 28/28); the offline workflow on `demo/paper.md` passes length, sections,
  citations and `--verify`; FA-2 and FA-3 equal installed.
- **Fails, FA-4:** an APA entry led by a lower-case surname (`hooks, b. (2000)`, `boyd, d.`)
  FAILs as `<UNKEYED>` with no passing form except capitalising the name. Installed passes it,
  but only by never checking the entry (it also passes when the entry is uncited). This
  finalizer re-ran the `hooks` probe: candidate FAIL, installed PASS. The UNKEYED message
  still does not name the cause (the lower-case initial).
- **Fails, FA-1 residual:** `Great Recession (2008, see below) and Hurricane Katrina (2005;
  category 5) … Smith (2012)` FAILs with orphans `recession (2008)` and `katrina (2005)`;
  `Hurricane Katrina (2005: landfall)` FAILs too. Installed PASSes both. This finalizer re-ran
  the first probe: candidate FAIL, installed PASS.

### Correction to the 0.2.4 entry
- **"Worse than 0.1.0 on 3 of 31 witness shapes" held only on that probe set.** The 31 probes
  had no non-citation year followed by `,` `;` or `:`, so the FA-1 residual above was not
  counted. Measured against installed, 0.2.4 = 0.2.5 is worse on at least two shape classes:
  APA lower-case lead (FA-4) and year-plus-punctuation non-citations (FA-1 residual).

### Open, and what needs the owner
- **FA-4, APA lower-case lead:** (a) accept the fail-closed cost (the P12 / PW-F04 principle
  favours this), or (b) authorize a prose re-plane in which the writer notes the UNKEYED FAIL,
  the verifier covers `<UNKEYED>` entries (it already receives them on the checklist), and
  SKILL.md gets an explicit named exception route. Iron rule 3 has fired, so no further code
  fix without that ruling.
- **FA-1 residual:** a further narrowing must not grow code (iron rule 4: `check_citations.py`
  is 294 lines, +38.7% over the pre-wave 212; harness 42 cases, +50.0%, at the line). The
  owner also decides whether it blocks release.
- **Carried, not regressions against installed:** FA-5 (CJK two-name clause), PW-F10
  (grouped numeric markers unread, same as installed), FA-6..FA-11, battery P3 F13 F14 F15
  F16r F18 F19 F21, the E11 uplift rule (not met), verifier calibration and pressure
  sentinels (not run), instance-tier independence only.
- **Better than installed:** the PW-F04 fail-open (invented non-ASCII author passes) is fixed;
  Chicago and MLA author-date have a passing form (PW-F08); `van der Waals` passes; an
  uncited `hooks` entry is caught.

### Verification (this entry)
- Harness `evals/harness.py` 42/42. Scripts unchanged since 0.2.4 (`check_citations.py` 294
  lines, `scripts/` 693).
- Decision Record `validate_decision.py` exit 0.

## [0.2.4] — 2026-09-25

Revert only → patch. This is the fallback repair for the round-3 fix audit, under the same
owner ruling as 0.2.3. Iron rule 3 fired: the audit's blocking P1 sat in 0.2.3's own new
code, so no new fix code was written; the only moves allowed were reverts. Fresh repairer
instance. Record: `runs/paper-writer/battery/FIXES-R3.md` (section "Fallback repair") in the
R20 workspace.

### Reverted
- **The FA-4 lower-case fallback in `lead_name` (0.2.3), a false pass (P1).** In an entry's
  author slot the fallback returned any first token, even a bare initial, when no
  capitalised multi-letter token was present. So `E. Okafor. … 2014` keyed as `e`, and
  `A. Brandt (2016)` keyed as `a`. The MLA mention check then matched "e.g." and the article
  "a", and APA matched `(a 2016 replication)`. Both papers PASSed; 0.2.2 and 0.1.0 FAIL them.
  The `citation-styles.md` sentence about lower-case surnames is reverted with it. The APA
  UNKEYED message wording from 0.2.3 is kept (string only).

### Re-opened
- **FA-4 (P2), APA shape only.** An APA entry led by a lower-case surname (`hooks, b. (2000)`,
  `boyd, d. (2014)`) fails as UNKEYED again, and there is no passing form except capitalising
  the name. Installed 0.1.0 passes this shape by silently skipping the entry (fail-open: the
  entry is never cross-referenced, so it also passes when the entry is uncited). This is the
  one shape where this build is worse than installed. For `d'Alembert`, `al-Ghazali` and
  Chicago/MLA lower-case forms, the build equals installed (both FAIL). For `van der Waals` it
  is better (PASS, where installed FAILs).
  No pure revert closes this shape. Both candidates were measured:
  - Dropping the UNKEYED fail. The PW-F04 fail-closed harness case turns red (41/42), and an
    uncited MLA entry led by an initial false-passes where installed FAILs.
  - Reverting 2f1b3eb's whole hunk (restoring 0.1.0's `(YYYY)` check). PW-F08 re-opens (MLA
    in its own form FAILs), `(n.d.)` entries FAIL again, and the harness drops to 40/42.
  The next step needs an owner ruling. The options are to accept the fail-closed cost for
  this shape, or to authorize a round that re-planes it in prose (for example, the verifier
  handles lower-case-led entries, `<UNKEYED>`, as it already handles every entry).

### Verification
- Harness 42/42, both before this change and after it. The regression fixture
  `apa_narrative_forms.md` drops its hooks/boyd lines; the case count is unchanged.
- The audit repros (MLA initials, APA `(a 2016 …)`) FAIL again, as they do in 0.2.2 and
  0.1.0. They are kept as witness probes.
- Corpus FP (22 fixtures + demo + 6 arm papers): no verdict change except that fixture. The
  4 ledgers gate identically.
- Witness run (31 shapes: the 29 from 0.2.3 plus the 2 audit repros): 0.2.4 is worse than
  0.1.0 on 3 shapes (APA lower-case lead only: `hooks`, `hooks-etal`,
  `since-with-lower-ref`), better on 5, and equal on the other 23.
- `check_citations.py` is 294 lines (297 at 0.2.3; +38.7% against the pre-wave 212).

## [0.2.3] — 2026-09-25

R20 fix round 3, authorized by the owner ("这七个你都继续去做把他们做完"), scoped to the four
blocking fix-audit items. Bug fixes and one revert → patch. Fresh fixer instance
(instance-tier independence). Record: `runs/paper-writer/battery/FIXES-R3.md` in the R20
workspace.

Principle pointers for this entry:
- Revert before a third patch of the previous round's code: iron rule 3 / A51.
- Every edit narrows what the parser accepts, except FA-4, which widens only by a structural
  fact (author-slot position, or membership in the reference list): iron rule 2, S14 / A50(i).
- Prose before code, no net growth: iron rule 4. `check_citations.py` is 297 lines (298 at
  0.2.2; 212 at the pre-wave `c2a922b`, so +40.1%). The harness stays at 42 cases: the
  regressions live inside two existing fixtures.
- False positives measured on the full corpus and on a neighbour-shape witness run: iron rule 7
  and the 0.2.2 gotcha (a corpus-only run misses shapes the corpus lacks).

### Fixed
- **FA-2 (crash) and FA-3 (interval FP): reverted, not patched.** The grouped-marker parse of
  0.2.1 is removed; IEEE/GB/T read single `[n]` only, as 0.1.0 does. `[2024-01-15]` no longer
  crashes and `[0, 1]` / `[0, 255]` are no longer markers. A bracketed group has the same form
  as a date or an interval, so no deterministic rule separates them.
  **Re-opened: PW-F10.** An entry cited only inside `[1-3]` / `[1, 4]` is reported as uncited.
  0.1.0 behaves the same way, so this is not a regression against the installed version. The
  numeric block of `references/citation-styles.md` now tells the writer to cite each entry once
  with its own `[n]` where its claim is made.
- **FA-1 (year-range FP).** A narrative year now has to close the parentheses or be followed by
  the `,` / `;` / `:` that opens a page or a second year. `Great Recession (2008–2009)`,
  `World War II (1939-1945)` and `(2008/09)` are no longer citations; `Smith (2012, p. 4)` and
  `(Smith, 2010, 2011)` still are. A year range cannot key a reference entry either, so no real
  citation is lost.
- **Digit-bearing names (found by this round's witness run, same 0.2.1 widening).** Name tokens
  are letters, apostrophes and hyphens only, so `COVID-19 (2020)` and `GPT-4 (2023)` are no
  longer read as citations. 0.1.0 passed both.
- **FA-4 (lower-case surnames).** `hooks, b.`, `boyd, d.`, `d'Alembert, J.` and `al-Ghazali, A. H.`
  now key and pass in APA, Chicago and MLA. A lower-case-initial token counts as a surname only
  in a reference entry's author slot, or in running text when it is a listed reference surname,
  so `(since 2010)` and `in (2019)` remain non-citations. An entry with no name or no year still
  fails. The APA message now names both requirements.

### Verification
- Harness 42/42. Red first: 40/42 on the 0.2.2 scripts (the two repurposed fixtures).
- Mutation: 7/7 round-3 mutants killed. The 0.2.1 set still kills 6/7 on its surviving anchors;
  its accepted survivor (year suffix stripped from ids) is unchanged.
- Corpus FP (demo + 6 arm papers + all fixtures): no verdict change outside the two regression
  fixtures. The 4 existing ledgers gate identically.
- Witness run (29 neighbour shapes, installed 0.1.0 vs 0.2.2 vs 0.2.3): 0.2.3 matches or beats
  0.1.0 on every shape. 0.2.2 was worse on 12.

### Still open
- **FA-5 (P2).** In a Chinese clause that names two reference authors before one year, the run
  maps to the earlier surname. 0.1.0 does not check CJK names at all (they are skipped silently,
  the fail-open PW-F04 fixed in 0.2.1). Co-authors (`王某某和张某某（2020）`, lead = first) and an
  unrelated first name have the same form, so it is not separable by position.
- **PW-F10** (re-opened above), **FA-6..FA-11** and **F13 F14 F15 F16r F18 F19 F21** as listed
  under 0.2.2. Residual kept from 0.1.0: a lower-case surname cited in running text with no
  reference entry (`hooks (2000)`, nothing listed) is not detected.
- The E11 uplift rule, verifier calibration and pressure sentinels are unchanged from 0.2.2:
  not met or not run.

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
