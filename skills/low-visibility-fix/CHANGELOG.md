# Changelog — low-visibility-fix

## 0.4.0 — 2026-06-21

**Analyzer rebuilt from scratch around PROVE-OR-FLAG.** The deterministic analyzer
(`scripts/analyze.py`) now emits a finding only when a threshold violation is
**provable from fully-resolved values**, and turns **every** value it cannot
resolve into an explicit `needs_judgment` row with a specific reason — it never
silently drops a rule and never fabricates a default. This makes coverage honest:
the doc set shows exactly what was proven vs what the visual pass must resolve.
The correct WCAG math, the `design-tokens.json` thresholds, and all plumbing
(`audit.py`, `scope.py`, `policy.py`, `emit_docs.py`, OUTPUT_ONLY, schemas) are
preserved.

### Fixed (each pinned by a unit test in `evals/run_unit_tests.py`)
- **`em`/`%` font-size inherits the parent chain** (0.5em under a 40px parent =
  20px), no longer assumed 16px; unresolvable chain → `font_size_relative_unresolved`.
- **Undeclared background → `bg_undeclared`** judgment, never a fabricated white
  (which produced wrong contrast on dark-themed apps whose bg sits in a global sheet).
- **Flexbox/grid `gap` spacing is checked** (was margin-only, a silent miss);
  unresolvable → `spacing_unresolved`.
- **Cross-wrapper adjacency** — adjacent controls one wrapper apart are compared,
  not only same-parent siblings.
- **Balanced-brace CSS parse** — `@media`/`@supports` rules apply (flagged
  `media_conditional`); an unhandleable block → `css_rule_unparsed`, never dropped.
- **UA-default control boxes** — WeChat `<button>` ~48px, HTML controls ~21px; no
  known default → `target_size_no_uadefault`.
- **Bold large-text contrast tier** — ≥18.66px-bold / ≥24px-normal uses the 3:1/4.5:1 tier.

### Added
- **Threshold honesty**: every finding carries `tier` (`critical` = below WCAG /
  `major` = field-elevated **engineering recommendation, not a standard**) and a
  `standard` label, so a WCAG-AA control isn't reported as "broken".
- **6 new `needs_judgment` reasons** (`bg_undeclared`, `font_size_relative_unresolved`,
  `target_size_no_uadefault`, `spacing_unresolved`, `media_conditional`,
  `css_rule_unparsed`) flowing through `emit_docs.py` + the schema.
- SKILL.md reframed around prove-or-flag + honest scope (4 measurable axes; the
  five field conditions map onto them via the threshold tier).

### Eval
- `evals/run_all.py` GREEN (39/39), `evals/run_unit_tests.py` GREEN (27/27),
  `evals/check.py` 13/13; new adversarial fixtures one per bug; realism-checked on
  real mini-program pages (honest findings + `bg_undeclared` judgment, no fabricated
  white-bg contrast). Independently adversarially verified (5-lens skeptic sweep).
  (Eval tree kept local per the repo's minimal-runnable layout.)

## 0.3.0 — 2026-06-04

**Re-scope: audit + handoff docs (no longer auto-fixes).** The skill now AUDITS
and emits a structured handoff DOCUMENT SET for an implementer agent — it never
edits the target. Driven by: it must judge wildly varied UIs, so it cannot edit
reliably, but it can produce a regular structured doc set every run.

- **BREAKING / removed**: the auto-fix path — Step-5 file edits,
  `rules/fix-patterns.md` auto-apply, `analyze.py --compare`, and the `trial/`
  paired fix demo. Corrected snippets are now RECOMMENDATIONS inside the doc set,
  never applied. Writing to the target is gone; an `OUTPUT_ONLY` control confines
  all writes to the out dir.
- **new — doc set**: `scripts/audit.py` (scope → analyze → emit) writes
  `audit.json` + `report.md`, validated against `schemas/handoff-doc.schema.json`,
  emitted every run incl. the zero-findings "clean" case. Adds
  `scripts/emit_docs.py`, `rules/handoff-docs.md`, `assets/handoff-doc.template.md`.
- **new — targeted scope**: `scripts/scope.py` + `--pages` / `--selector` scope a
  run to specific page(s)/component(s); a non-existent page → clear empty-scope
  error (no full-scan fallback); omitted → a bounded default. Built for cheap
  multi-round runs.
- **new — visual/browser pass**: `rules/visual-pass.md` — H5 via headless/preview,
  WeChat mini-program via DevTools (sibling mp-cli-sup); degrades
  non-fatally to static + needs_judgment / `--input-mode visual_estimate`.
- **new — mini-program**: `analyze.py` resolves `rpx` (750rpx == viewport;
  `--viewport-px`), merges an external `--css`/`.wxss`, and treats
  `<button>`/`<navigator>`/`bindtap` as interactive.
- **new — contrast safety policy**: `scripts/policy.py` — refuse to recommend
  contrast below the field threshold for a field-critical control.
- **tests**: `evals/run_all.py` rebuilt as a behavioral harness — every one of the
  17 adversarial-checklist edges bound to a case (18 cases incl. L0/L1/
  determinism); retired the fix/compare cases. Mutation spot-check passes.
- **metrics**: re-pointed to doc_completeness_rate, no_target_mutation_rate
  (100%), targeted_param_precision, determinism_rate.

## 0.2.0 — 2026-06-01

"Complete + optimized" pass.

- **analyzer**: resolve `:root`/`html` CSS custom properties (`var(--x[,fallback])`);
  undefined/runtime vars still fall to `needs_judgment`. Flag external stylesheets.
- **tests**: `evals/schema_check.py` (stdlib JSON-Schema-lite) + `evals/run_all.py`
  unified runner (L0 schema + L1 golden + smoke/determinism + deterministic paired
  metric). Fixtures 4 → 6 (`themed_vars`, `external_link`).
- **metrics**: `meta/metrics-record.json` with real measured numbers (L1 6/6,
  determinism 1.0, fix-resolution 1.0, score 0→100).
- **perf**: SKILL.md entry 812 → 689 tokens (< 700 target; tiktoken).
- **docs**: `references/research-bibliography.md` (standards vs field rationale),
  `meta/release-report.md` (release-gate assessment).
- **live evals**: `meta/live-eval-results.json` — subagent runs measuring
  activation (recall/precision 1.0 among 4 distractor skills), protocol compliance
  (happy-path gate + adversarial hold both PASS), and a with/without-skill
  marginal lift of **+21** (skill 100 vs baseline 79, n=1).

## 0.1.1 — 2026-06-01

Evidence-gated refinements surfaced by the first end-to-end dogfood trial
(`trial/TRIAL_REPORT.md`). All three left the existing golden fixtures unchanged.

- **analyzer**: `icon_only` now distinguishes visible text from accessible name —
  an `aria-label`-only control is a **minor** finding (a glyph is weak under
  glare); no label at all stays **major**.
- **analyzer**: dropped the `target_size` 64–79px "minor" tier (noise, mirroring
  the earlier font-size decision); 64px (field floor) passes, 80px is advisory.
- **analyzer**: `target_size` now honors `min-width`/`min-height` as a guaranteed
  size floor — fixes a false-critical on the `min-*` sizing pattern that
  `rules/fix-patterns.md` itself recommends.
- **tests**: added the `icon_aria_only` fixture; L1 suite 3/3 → 4/4.
- **docs**: `rules/audit-protocol.md` updated to match.

## 0.1.0 — 2026-06-01

Initial build via the `develop-principle` methodology. Tiered-hybrid architecture:
a deterministic analyzer (contrast, target_size, icon_only, color_only, spacing,
font_size) + model long-tail + analyzer-as-acceptance-gate. Ships SKILL.md,
rules, references (incl. the `design-tokens.json` single source of truth),
schemas, evals (3 fixtures + golden L1 suite, 8 eval cases), and the
develop-principle four-piece acceptance set under `meta/`.
