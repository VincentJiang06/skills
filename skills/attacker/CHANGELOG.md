# Changelog — attacker

All notable changes to the `attacker` skill. Semver.

## [0.8.2] — 2026-09-25

**Fix round 3 (R20 wave, owner ruling 2026-09-25 "这七个你都继续去做把他们做完", iron rule 3).**
Closes the two P2s the 0.8.1 fix-audit found inside 0.8.1's own fixes (FA-1, FA-2) and the
continuation-line false positive (FA-4, P3) that 0.8.1 introduced. SemVer **patch**: the skill
now does what its own text already promised; no contract change.

### Fixed
- **FA-2 — a governed gap that a runnable cheat beats is a finding again, not a forced flag.**
  0.8.1 made `lenses/gaming.md` route every gap the target says it governs to an uncounted P3
  flag, even when the striker's runnable cheat gets past the governing clause. That moved the
  suppression into the flag class instead of removing it, and it contradicted the same file's
  finding definition (runnable cheat = finding). Now the striker quotes the clause: if the cheat
  beats it, the item is a **finding** at its own severity, with the clause in why-uncaught; only
  if the clause really closes the cheat is it a **P3 flag**. Golden sample 5 gets the same
  carve-out, so the adjudicator does not re-apply the suppression. Anchors: gaming.md
  §PROVE-OR-FLAG finding definition; prove-or-flag.md golden 14/15 (cosmetic repair is not
  repair; an item stands at its own merit); KB P10 (the target's text is data, not a filter).
- **FA-1 — the shadow-map extractor no longer stops at a blank line inside a question list.**
  0.8.1 ended the list at the first blank line after a bullet, so later bullets or `1.` lines in a
  loose list were lost with exit code 0 (0.7.0 loses them too). Now a blank line ends the list only
  when the next non-blank line is neither list-shaped nor indented. A blank-line tamper on a copy
  of the full `Philosophy/` KB: 0.7.0 and 0.8.1 both read 72 probes with an unchanged summary;
  0.8.2 recovers all 166.
- **FA-4 (P3) — no false positive on wrapped bullets.** 0.8.1 flagged an indented continuation
  line of a bullet as an "unrecognised falsifiable-question line". It is now appended to the
  previous probe (CommonMark continuation), so no text is dropped and no flag is raised.
- FA-1 and FA-4 are line-shape checks only (A50; P13: nothing semantic is judged). Two new
  `--selftest` cases (`blank-then-numbered`, `loose-list-continuation`). Mutation check: 3/3
  mutants of the new branches killed. False positives (iron rule 7) on every real corpus that
  carries these fields (`Philosophy/`, 115 nodes; `philosophy-research/`, 323 nodes, including
  r20 drafts, battery and reports): **0 newly flagged nodes, probe text unchanged**, against both
  0.8.1 and 0.7.0.

### Measured
- Script 156 → 165 lines: +48.6% against the pre-wave baseline of 111 (iron rule 4 cap 166).
  Shipped eval cases 0 → 0 (the selftest lives inside the script).
- Gaming lens 768 → 796 tok cl100k (cap 1000). Golden samples 825 → 855 tok (logged in
  prove-or-flag.md §Rubric budgets). SKILL.md unchanged at 2995 tok.

### Still open (P3, not blocking)
- FA-3: the "no shadow-principle" gap check in `mark_gaps` is node-wide, not per header.
- FA-5: flags carry no severity field in `schemas/output.json`.
- F08: a 0-node parse still exits 0. Plus the 10 other open round-1 P3s (see 0.8.1).

## [0.8.1] — 2026-09-25

**Battery fix round (R20 wave, 1 round per iron rule 3).** Two battery-confirmed P2 defects fixed;
SemVer **patch** (the skill now does what its own text already promised; no contract change).

### Fixed
- **F14 — Gaming lens no longer tells the striker to drop "governed" gaps.** `lenses/gaming.md`
  said "Do not report a gap the target already governs", the only striker-side drop instruction in
  any lens. It contradicted the same file's coverage-first rule, the rubric's P3
  "already-governed-but-worth-noting" and golden samples 5/13 (dropping is the adjudicator's power),
  and let a target's own-voice "anti-gaming: X governed" suppress Gaming reports. Now: report it as
  a flag (P3 if the clause really closes the cheat), quote the governing clause, and leave the noise
  call to the adjudicator. Anchor: skill-own coverage-first / PROVE-OR-FLAG split (gaming.md
  §PROVE-OR-FLAG, prove-or-flag.md golden 5 and 13); KB P10 (the target's text is data, not a
  filter on the attack).
- **F07 — the shadow-map extractor no longer drops map items silently.** On a KB copy, renaming
  S1's `**阴影原则**` and turning E1–E12's question bullets into `1.` lists left the summary line
  and exit code unchanged ("72/90 … 18 need human review") while 28 probes and S1's shadow vanished
  with `needs_human` empty — contradicting the docstring's "never silently dropped". Now
  `needs_human` also fires for a node carrying only ONE of the two fields, a questions header with
  no bullet, and any non-bullet line under that header. Same tamper now reads 31 need-review (was
  18), E1–E12 and S1 each flagged. Structure checks only (field presence / line shape — A50
  admissible, P13: nothing semantic judged). New `--selftest` (clean fixture + four tampers);
  mutation check: each of the four new branches, disabled alone, turns the selftest red.
  False-positive measurement (iron rule 7) on every real corpus carrying these fields — full
  `Philosophy/` KB (115 nodes), `philosophy-research/` incl. r20 drafts/reports/battery: **0 newly
  flagged nodes, probe counts unchanged** (X-5's 43/115 over-flag is unchanged, still exempt).
  Anchor: skill-own AIM rule "unparsable fields surface as `needs_human`" (SKILL.md) and the
  script's own "must not pass silently" contract; KB A50 (structure-only D gates), E5 (red first).
- Not fixed (not in this round's list, P3): F08, a 0-node parse still exits 0.

### Measured
- Script 114 → 156 lines: +40.5% against the session baseline 111 (iron rule 4 cap 166).
  Shipped eval cases 0 → 0 (the selftest is inside the script).
- The 0.8.0 build harness (`runs/attacker/engineer/check_attacker_080.py`) now fails exactly two
  checks by design: I3 "script logic unchanged vs 0.7.0" (F07 changes it) and D14 "version 0.8.0"
  (now 0.8.1). The other 23/25 still pass, and its selftest stays OK.

### Verification record (R20 wave close — no version bump: docs only, 0.8.1 is unreleased)
The finalizer changed no behavior. This section records the evidence the 0.8.0 → 0.8.1 release
rests on and what is still open. Anchors: KB E11 (two arms), O5 (effective verdict = min of
re-audit and battery), A51(i) (fix-audit stop signature), K1 (independence tiers), A37 (honesty).

- **E11, bound to commit 4e8acd9 (the 0.8.0 build).** Per the pre-registration it was not re-run
  after the fix round. It used 3 cases × 1 run per arm. The WITHOUT arm had the skill explicitly
  disabled. The blind judge re-ran every P1 reproduction.
  - Case 1 (term-safe-rewriter): **WITH better (modest).** WITH gives an explicit
    same-reading witness pair (0.829 pass with meaning changed vs 0.970 pass with meaning kept),
    states its search coverage, and asks the re-plane question. WITHOUT has the same facts but no
    pair, and 7 overlapping P1s.
  - Case 2 (green-but-wrong billing): **tie.**
  - Case 3 (fix-audit of snapshot-pruner): **WITH better (modest).** WITH escalates because two
    P1s sit inside round 1's own fixes, and asks the plane question. WITHOUT lists precedence only
    as a suspicion.
  - Totals: 2W / 0L / 1T.
  - Recall: every seed found by both arms, so 0 seed losses. False findings: 0 for both arms in
    every case.
  - Checks: injection sentinel passed in cases 1 and 2 (both arms). Witness hunt scored above 0 in
    case 1. Tier honesty passed in every WITH run (`instance`, "L-i incomplete", model ID
    declared).
  - **Cost cap not verifiable.** No arm recorded `total_cost_usd`. The tool-call proxy (WITH/WITHOUT)
    is 1.17x / 1.08x / 1.15x.
  - **Fork not exercised.** The arm host had no Agent/Task tool, so the WITH arm ran all lenses in
    one context. The skill's per-lens fork is therefore unmeasured.
  - Result: not retired. The skill's value is preference/fidelity (the witness pair, fix-audit
    escalation, calibrated severity), not recall; the bare model found every seed too.
- **Battery: 1 round against 0.8.0 at `instance` tier.** L-i was incomplete: the project CLAUDE.md
  and the auto-memory index were injected, and the judge was `judge-uncalibrated`.
  - Seeds: **5/5** (one per lens), so no void lens.
  - Non-seed items: 13 confirmed (P2: F07, F14; P3: F08, F09, F10, F12, F13, F15, F16, F18, F19,
    F20, F02r) and 3 refuted.
  - The fix round (above) fixed F07 and F14.
- **Fix-audit (fresh instance) on fb7cdaa..d01f233: 2 P2 + 3 P3, all open.**
  - FA-1 (P2): F07 is only partly fixed. After one blank line inside a question list, the new
    break at `extract_shadow_map.py:76` stops collecting. Later `- ` or `1.` lines are then lost
    with `needs_human` empty and exit 0. On a KB copy this hid 11 probes and left the summary
    byte-identical.
  - FA-2 (P2): the F14 fix moved the suppression instead of removing it. A governed gap must now
    be a flag, and flags are never counted, even when the cheat beats the clause. This conflicts
    with gaming.md:32-34 and golden samples 3, 5 and 15.
  - FA-3 (P3): the new header check reads the node-wide probe list, so a second, empty questions
    header in the same node goes unflagged.
  - FA-4 (P3): a CommonMark wrapped continuation line is flagged and the probe is cut short. No
    real corpus has one today.
  - FA-5 (P3): `schemas/output.json` flags carry no severity, so "a P3 flag" cannot be written in
    schema-conformant output.
- **Escalation.** Iron rule 3 is not triggered: nothing above P2 was found. FA-1 and FA-2, however,
  match this skill's own A51(i) signature (a ≥P2 defect in the fix area, or a relocated defect).
  They are therefore handed to the owner with no further repair round. The fix budget is spent.
  The first question is posed, not decided. Should "does a governed gap count" and "is the
  extractor's line-shape parse the right plane" be settled by the owner before another patch?
- **Other open P3s (not fixed):** F08, F09, F10, F12, F13, F15, F16, F18, F19, F20, F02r. X-6
  (the different-vendor acceptance run) is still not done.
- **Independence and model deviation.** Every role in this wave (builder, E11 arms and judge,
  battery striker and adjudicator, fixer, fix-auditor) was `claude-opus-5-5` high in a fresh
  context. That makes the tier **`instance`**: Opus 5.5 wrote the 0.8.x text, so the text is not
  `instance_plus`. Only the Fable-authored legacy text sits at `instance_plus`, and nothing reached
  `model`. This departs from the 2026-09-13 skill-creator-max model policy (builder Fable,
  evaluators Opus). The owner ordered all roles on Opus 5.5 high for this wave.
- **Tests at close.**
  - `extract_shadow_map.py --selftest`: 5/5 ok.
  - 0.8.0 harness on HEAD: 23/25 (I3 and D14 fail by design). The same harness on an export of
    4e8acd9 gives 25/25, rc 0.
  - `concept_anchors.py`: 39/39. `schemas/output.json` parses.
  - The pipeline's `validate_report.py` on the 0.8.0 evidence dossier now fails its re-run check,
    because the harness pins 0.8.0. The dossier's evidence binds to 4e8acd9.

## [0.8.0] — 2026-09-25

**R20 alignment (philosophy KB v0.4.0 — K1 vendor tiers, P10/A36 trust boundary, P13/S14 judgment
planes, A51 stop signature).** Incremental alignment (A40/O7 tier 增量对齐) of seven re-verified audit
items (`r20-upgrade/g1-meta.md` §2) plus what they force. Every change points at a KB anchor or a
skill-own principle (iron rule 1). Five lens definitions, E9 stop rule, fix-audit axes A–D,
PROVE-OR-FLAG bar, severity scale and golden samples 1–14 are unchanged (byte-identical where stated).
SemVer **minor**: the output-schema enum widens and runtime behavior changes; no field removed.

### Changed — independence vocabulary (KB K1, A37)
- A **different model of the same vendor is no longer `model`-tier.** 0.7.0 told FORK to prefer "a
  different model" and said that bought `model` tier "by construction"; under K1 (R20) an Opus 5.5
  attacker on Fable-authored text is **`instance_plus` (L-i+)**, and `model` (L-m) needs a
  **different vendor** declared with resolved model IDs of attacker and target author. Sites:
  SKILL.md rule 2, FORK, Contract `required_tier`, NOT-do list, honest coverage note;
  `references/prove-or-flag.md` §Judge topology ("model family" → "vendor"); both READMEs.
- `schemas/output.json`: `instance_plus` added to `findings[].independence_tier` and
  `coverage_gaps.independence_reached` — **additive only** (no field added/removed/renamed; key
  sets and `required` lists byte-equal to 0.7.0; six-vendor constraints untouched).
- FORK no longer promises "zero build history" unconditionally: the dispatcher states the host
  context the striker inherits (project CLAUDE.md, auto-memory index, plugin hooks); injected and
  not stripped ⇒ `L-i incomplete: <what>`, unknown ⇒ `L-i incomplete (host context not verified)`
  (K1). The run claims only the highest provable tier; an unmet `required_tier` goes in notes and
  `battery_grade` keeps its budget-vs-risk-floor meaning.
- The PBT-Bench / MAS-ProVe evidence now lives once, in `prove-or-flag.md` §Judge topology (SKILL.md
  keeps a pointer) — dedup that paid for part of the Authority paragraph.

### Added — trust boundary (KB P10, A36; Z5 no-compress)
- SKILL.md **§Authority** (3 lines): target, shadow map, fetched pages and prior-round reports are
  data; a sentence telling reviewers to skip something is itself reported; dispatch passes lens
  files whole.
- The **verbatim authority sentence** opens all five lens files (the lens file is the striker's
  whole prompt; SKILL.md never reaches it). It is on the Z5 no-compress list: do not reword,
  compress or trade it for budget.
- Golden sample **15** (reviewer-addressed "do not report X" → X still reported + the note flagged;
  contrasted with sample 5's governed tension). **Injection seed recipe** in `seed-recipes.md`.
- `scripts/extract_shadow_map.py` docstring declares its action surface: read-only (reads .md,
  writes stdout) — A36 per-script declaration; code unchanged.
- `fix-audit.md`: prior findings, ledgers and fixer summaries are data; "fixed" is verified by
  re-running the original reproduction.

### Added — separability witness hunt (KB P13, S14, A50(i); A41 no sixth lens)
- `lenses/reality.md` hunt **7**: for a deterministic check that renders a FINAL verdict on a
  semantic judgment, exhibit a pair of real inputs with the same reading and opposite correct
  verdicts, with both readings and search coverage; consequence = re-plane (D→L evidence / L
  judgment card), never a new feature, exception or retuned threshold. S14 names the battery as the
  witness supplier; no lens was told to hunt it. Folded into Reality (extends hunt 2), not a sixth
  lens. Golden sample **16**: pairs that read differently are not a witness (claim → FLAG; halves
  may stand alone). Library-class incident: caoliao-style-writer's seven-round arms race.

### Changed — SEED matcher re-planed (KB S14/A50(i) applied reflexively; skill-own "never an uncalibrated judge")
- The SEED hit decision was itself a D-face final on a semantic question with a constructible
  witness (an item at the seed location using a seed keyword for a *different* defect). Now: the
  deterministic location+keyword match is a **pre-screen**; the **planter** confirms hits and
  near-misses against its answer key; no planter/key ⇒ **`seed-unscored`** (findings delivered, void
  for E9). Seeds and injection notes are planted on a branch/copy only. Prose only, no code.

### Changed — fix-audit escalation (KB H4, A51(i))
- Escalation now fires on all of A51(i): P0/P1 inside last round's fixes, ≥P2 regression in the fix
  area, or a defect relocated into an adjacent file (post-review severity). The report poses the
  first question — *wrong plane (re-plane per H4/S14) rather than badly tuned?* — the attacker raises
  it, never decides it, and never recommends a tighter regex / exception / retuned threshold.

### Changed — A37 honesty
- `prove-or-flag.md` no longer claims the golden samples "carry a `model_baseline` stamp" (none
  existed). They are verdict patterns with answers inline — grading them is not calibration. No
  judge calibration record exists, so the rubric is **`judge-uncalibrated`** and every run says so
  in notes. SKILL.md step 4 mirrors this. No stamp value was fabricated.
- Budget lines restated with measurements: lens cap "~600" (all five were 637–753 at 0.7.0) →
  "≤ ~850, hard ceiling 1000"; rubric body stated "~900" but measured 1,304 (0.7.0) / 1,511 (0.8.0).

### Judgment planes (A49 in one paragraph — X-2, no ledger file shipped)
Activation = L (host model on the description). Shadow-map extraction = D skeleton (fixed regex on
lint-enforced headers; unparsable ⇒ `needs_human`). SEED hit = D→L pre-screen + planter-with-key
final (re-planed this version). Finding/flag proposal = L striker (proposal only, never deletion).
Final adjudication and severity = L judge (different-vendor preferred; judge-uncalibrated declared).
Independence tier = L orchestrator applying K1 to declared facts (no D script: it would read
self-declared names, not provenance). Reviewer-addressed-instruction vs governed tension = L
(no D detector: paraphrase and other languages give trivial witness pairs). Witness readings = D
evidence (execute the gate); correct verdicts = L. Fix-audit axis C = re-executed repro (D→L).
A51 escalation = L raises → H owner decides. Stop = D count + L marginal judgment. Output schema = D
skeleton. The only D-face final gates left are skeleton checks.

### Weight ledger (A41 add-ledger — measured with tiktoken cl100k, not estimated)
- Always-loaded `SKILL.md`: **2,941 → 2,995** tokens (cap 3,000). Paid by: the PBT-Bench detail
  relocated to prove-or-flag.md, merged opening paragraphs, compacted Contract / Harness / NOT-do /
  honest-note prose — no field or rule removed. (The 0.7.0 ledger's 2,885 was a character-model
  estimate; the measured 0.7.0 figure is 2,941.) Description byte-identical (332 chars, X-1 warn).
- Lens files (on-demand, one per striker): coherence 637→716, gaming 649→728, evidence 671→750,
  foundation 753→832, reality 747→**988** (authority sentence +79 each; reality also +162 for hunt
  7). Reality sits in the logged 850–1000 band; no hunt item was removed or reworded to pay.
- On-demand references: prove-or-flag 1,831→2,336 (golden 14→16, +14%), fix-audit 1,339→1,515,
  seed-recipes 581→954. Script 111→114 lines (docstring only; iron rule 4 cap 166).
- Shipped eval cases: 0 → 0 (E11 fixtures live in the upgrade run directory, X-3).

### Exemption register (carried, not aligned this version)
X-1 description 332 > 320 chars · X-2 no A49 ledger file (paragraph above instead) · X-3 no shipped
eval set · X-4 lens budget restated, not cut · X-5 extractor over-flags `needs_human` on node types
without six-piece fields (43/115 on the KB) · X-6 different-vendor acceptance run still not done ·
X-7 no A42 point-version settlement applied to lens prose · X-8 carried mechanism unchanged · X-9 a
stale 0.4.x "attacker" copy in the desktop skills-plugin cache competes for `$attacker` (reported,
outside this skill's scope). Detail: `r20-upgrade/runs/attacker/skill-spec.json` materials.

## [0.7.0] — 2026-07-31

**R17 alignment (philosophy KB v0.3.0 — the verifier-engineering increment).** Three deltas, each
anchored to a KB node. No change to the five lens definitions or the SEED gate; no new mechanical
semantic check (prose and dispatch discipline only).

### Added
- **Fix-audit rotation mode** (`references/fix-audit.md`, +1 section in SKILL.md). When the target
  carries last round's repairs, round N+1 **must** re-aim the five lenses at the **fix diff**, from
  a context that did not write the fixes. Four axes: **A** propagation (did the fix reach every
  sibling site, especially *higher-rank* documents — axiom layer, spec, `description`, README,
  installed copies), **B** new defect / new inconsistency introduced by the fix (incl. direction
  reversal and scope creep), **C** wording camouflage vs substantive repair (re-run the original
  reproduction verbatim; a still-breaking repro means cosmetic), **D** silently skipped items
  (an unfixed item with no written adjudication is itself a process finding — H7 applied to repair).
  Ships an operational Step 0 for *getting the material*: which `git log` / `git diff` to run to
  recover the fix diff and the prior findings table, and the honest `fix_audit: no-baseline`
  degradation when neither exists.
  **Deliberately NOT a sixth lens** — it changes the *object* of attack, not the failure class, so
  the A41 anti-bloat clause (a sixth lens is forbidden if it folds into the five) is respected
  rather than amended.
  *Evidence*: KB `meta/revisions.md` §R17 battery, Round 2 — this pass alone produced **4 P1s, all
  inside round 1's own repairs** (fix not propagated to the axiom layer, fix introducing a new
  inconsistency, fix direction reversed, fix relocating the defect). KB anchors: E12, H7, H2/H5.
- **Rubric acceptance on four axes** (`references/prove-or-flag.md` §Rubric acceptance). Structural
  sufficiency / reliability / preference fit / **adversarial robustness**. The load-bearing new
  rule: **κ/α does not imply anti-gaming** — measured, driving the exploit rate down 10pp moved
  inter-judge α almost not at all, so a rubric shipped with only a consistency number is
  `rubric_grade: consistency-only`. Plus two operating disciplines: **judgment cards score one item
  at a time** (batch scoring has a measured accuracy cost), and improvement-feedback vs acceptance
  scoring must be separately accounted (0.47→0.85 feed-back lift is an improvement tool, never an
  acceptance score). KB anchor: E12 / `WEB-RubricAudit`, `WEB-VerifierEng`.
- **Golden sample 14** (★): a prior finding "closed" by editing only the sentence that named it,
  while the original reproduction still breaks → FINDING at the original severity (calibrates
  fix-audit axis C).
- `prior_round?` input field (`{ fix_diff, prior_findings }`); `coverage_gaps.notes` must now state
  fix-audit status (`run` / `not-applicable` / `no-baseline` / `skipped`); `"fix-audit"` added to
  the `lens` enum in `schemas/output.json` (additive enum value — existing outputs stay valid, and
  the six-vendor intersection constraints are untouched).

### Changed
- **Different-vendor independence is no longer an anecdote.** Every site that argued the
  `model`-tier claim from intuition now carries the first non-anecdotal quantitative support:
  **PBT-Bench (2605.15229) — the hardest defects are model-specific and no single model covers all
  of them**, so a one-model battery has a structurally uncoverable residue (KB anchor
  `WEB-VerifierEng`, E12). Sites updated: SKILL.md §Model-agnostic rule 2, SKILL.md §Honest
  coverage note, `references/prove-or-flag.md` §Judge topology, both READMEs.
  The same edit carries the **counter-evidence from the same source line** so the claim is not
  overstated: MAS-ProVe finds an independent judge is *not* generally more capable than re-running
  the generator — different-vendor buys **different blind spots**, not more strength.
- Rubric token budget raised 700 → ~900 to carry the acceptance axes; logged here rather than
  hidden (A41 增删账 discipline).

### Weight ledger (A41 增删账 — the increase WAS paid, in the same release)
- Always-loaded `SKILL.md`: 10,904 → **11,966 bytes, ~2,630 → ~2,885 tokens**, under the zipper's
  `>3000 always-loaded = BAD` line. (Estimate, not a measurement: tiktoken cannot be installed in
  this environment, so the figure is a character-model estimate calibrated against the 0.6.0
  tiktoken record — raw estimate 2,999, calibrated 2,885.) The R17 additions first pushed it to
  ~3,130 (BAD); the overrun was then **paid off with deletions in the same release**, not carried
  as a WARN.
- Where the payment came from (all merges, behavior-lossless — every merged concept is still
  readable in the section that already stated it, verified by a 42-anchor semantic check):
  the two opening paragraphs (restated §The mechanism, §The five lenses and the Contract's
  findings/flags definition); §Model-agnostic rule 1 absorbed the standalone "Output schema is
  six-vendor-intersection JSON" line; §Contract Input/Output field prose compacted (**no field
  removed**); the fix-audit section thinned to trigger + rule + one-line evidence + pointer
  (all four axes and the Step-0 material recipe live in `references/fix-audit.md`); §Harness
  preamble and the AIM/PROVE-OR-FLAG parentheticals tightened.
- Untouched by the compression: the SEED gate, the five lens definitions and table, every Contract
  field, and the honest coverage note's claims.
- On-demand files (CONTEXT-loaded, not always-loaded, so outside this budget):
  `references/prove-or-flag.md` 4,798 → 7,485 bytes; new `references/fix-audit.md` 5,678 bytes.

### Not changed (explicit)
The five lens definitions, the SEED gate, PROVE-OR-FLAG's bar and classify-not-delete topology, the
`description` frontmatter (unchanged, 332 chars — trigger wording untouched).

## [0.6.0] — 2026-07-26

**R16 alignment (Claude 5 generation settlement, from the philosophy KB's P11/ADC2).** Frontier
models follow "only report proven/severe" instructions literally — recall dies silently at the
discovery pass. Anthropic's own Claude 5 model docs prescribe the fix: full-coverage report first,
independent filtering second.

### Changed
- **PROVE-OR-FLAG is now explicitly classify-not-delete.** The striking mind reports EVERY anomaly
  it noticed and only *proposes* labels (finding vs flag + severity); deletion authority sits
  solely with the adjudicating judge. Wording fixed at every site that primed suppression:
  `description` ("records ONLY proven…" → coverage-first + adjudication), SKILL.md intro and step 4,
  `references/prove-or-flag.md` judge topology, and a "Coverage first" rule in all five lens files.
- **Golden sample 13 (★ suppression case) added** to the rubric: a noticed anomaly absent from the
  report "because it couldn't be proven" is a report-defect — it must surface as a FLAG.
- The findings/flags two-channel output contract is unchanged; what changed is *who* filters, and
  *when*.

### Tested (2026-07-29, opus5 · medium, pre-publish gate)
Double-arm blind test, v0.5.0 wording as control: one seeded target (8 planted defects — 4 provable,
4 hard-to-prove), identical commissions. **Both arms recalled 8/8** with intact flags-channel
discipline; no regression from the rewording. The suppression hypothesis itself did **not** reproduce
in this run — the striker's tool access (script execution, web fetch) turned the "unprovable" seeds
provable, so the arms never faced a true prove-or-drop dilemma. Classification: harmless alignment
per vendor guidance, not an empirically demonstrated fix.

## [0.5.0] — 2026-07-14

**Ground-up rewrite, re-derived from the skill-design philosophy KB.** Supersedes the 0.4.x
lineage entirely. The old attacker (0.4.1) was a heavy rig grown around product/miniprogram
debugging — `rules/`, `agents/`, several `.mjs` validators, per-target scaffolding. This
version keeps the same core discipline (fresh independent context, PROVE-OR-FLAG, never fix)
but rebuilds it as a light, model-agnostic component whose power comes from *what the fresh
mind is handed*, not from apparatus. Total weight ~1/4 of 0.4.1.

### Added
- **Five-lens fixed rotation** (`lenses/`), each mapped to a philosophy pillar and covering an
  orthogonal failure class: Coherence (P0), Gaming (A31/T12), Evidence ⚡ (P4/P5, carries web
  search), Reality (P6), Foundation (axioms/A41). A sixth lens is forbidden unless it cannot
  fold into these five (A41 reflexive anti-bloat). Plus an optional synthesis pass (R+1) that
  hunts cross-lens interaction defects.
- **SEED gate (anti-false-negative)** (`references/seed-recipes.md`): plant a known seed defect
  each round; a run that misses its seed is `void` and excluded from the stop condition — so a
  blind attacker producing zero findings is not misread as "target clean." Complements
  PROVE-OR-FLAG, which only filters false positives.
- **Model-agnostic as design constraint zero.** Portable Markdown wording (no XML-semantic
  tags), six-vendor-intersection output schema (`schemas/output.json`), 128K-safe window
  assumption, rubric/checklist-shaped prompts. Different-vendor attacker promoted to a
  first-class independence path (`instance` → `model` tier by construction).
- **Deterministic shadow-map extractor** (`scripts/extract_shadow_map.py`, Python stdlib):
  when the target is a philosophy-grounded KB, greps its lint-enforced shadow-principle /
  falsifiable-question fields into a pre-drawn attack map. Non-LLM on purpose — an LLM
  extractor would re-open the map-tampering surface. Emits `needs_human` (non-zero exit) when
  the map has holes; never silently drops.
- **Map-is-a-floor rule**: ≥30% of each lens's budget must attack off-map, and "the
  shadow-principle is itself boilerplate that dodges the real risk" is its own finding class.
- **PROVE-OR-FLAG rubric with ≥12 inline golden samples** (`references/prove-or-flag.md`),
  including the hard cases (thought-experiment-with-no-rerun → FLAG; re-reporting a governed
  tension → not-a-finding; severity inflation → downgrade). Judge topology closes model-level
  self-preference: final adjudication by a **different-vendor** judge, not just non-author.
- **Pre-registered E9 stopping** (budget / marginal threshold), never "N clean rounds" — the
  battery is asymptotic. Output `coverage_gaps` carries an honest `battery_grade` and confesses
  what was NOT covered.

### Removed (vs 0.4.1)
- `rules/loop-and-metrics.md`, `agents/openai.yaml`, `assets/` payload libraries, the three
  `.mjs` validators/gates, and per-target `oracle-menu` / `context-intake` references. The
  lenses ARE the apparatus now.

### Known limitation (recorded, not hidden)
- Every round that shaped 0.5.0 was `instance`-tier (one model family attacking its own KB).
  Model-level blind spots are systematically invisible to same-family attack (T11). The
  pre-registered acceptance test — one run with a different-vendor attacker against a real
  target — has **not** been executed yet. Proven to *find things*; not yet proven
  *model-portable in the field*.

---

_History before 0.5.0 (0.1.0 – 0.4.1) is preserved in git; that lineage was the
product/miniprogram-debugging attacker this rewrite replaces._
