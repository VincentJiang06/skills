# Changelog — attacker

All notable changes to the `attacker` skill. Semver.

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
