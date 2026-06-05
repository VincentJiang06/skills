# Changelog — low-visibility-fix

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
