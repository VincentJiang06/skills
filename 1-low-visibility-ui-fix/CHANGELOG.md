# Changelog — low-visibility-ui-fix

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
