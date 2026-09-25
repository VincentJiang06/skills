# Changelog — attacker

All notable changes to the `attacker` skill. Semver.

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
