# Dogfood Trial — v0.1 → v0.1.1

**Target**: `trial/inbound-inspection.html` — a self-generated, realistic mobile
inbound-QC field UI (the user had no demo on hand).
**Method**: ran the skill's full protocol end to end — scope → preflight →
analyze → plan (human gate) → fix → verify (`--compare`).

## Result

- **Audit (v0.1)**: 29 findings, 2 needs_judgment, **0 false positives**. The
  analyzer correctly resolved the literal-colored header bg, deferred the CSS-var
  color and the background-image text, and did not flag the labeled tabs.
- **Refinements folded in (see below)**: the v0.1.1 baseline recount became **30**
  (the camera button's `aria-label`-only icon is now a minor finding).
- **Fix**: rewrote to a compliant dark field theme — contrast ≥ 7:1, targets
  ≥ 64px via `min-*`, visible text on every icon button, a labeled status chip
  (replacing the color-only dot), 16–18px type, and a dark scrim behind the hero
  photo (replacing the unknowable image background).
- **Verify (`--compare before.json`)**: score **0 → 100**, **30 fixed, 0
  introduced, 0 remaining**, needs_judgment **2 → 0**.

## Refinements surfaced and folded into v0.1.1

1. `icon_only` was *cleared* by `aria-label` alone — but a glyph-only button is
   hard to identify under glare. Now: `aria-label`-only → minor; no name → major.
2. `target_size` flagged 64–79px as a *minor* "consider 80" — noise. Dropped;
   64px (field floor) passes.
3. The analyzer read `width`/`height` but not `min-width`/`min-height`, so it
   would false-critical the exact `min-*` sizing that `fix-patterns.md`
   recommends. Now `min-*` is honored as a guaranteed floor.

All three are consistent "reduce noise / match field intent" changes; none
altered the existing golden fixtures. A new `icon_aria_only` fixture locks
refinement (1). L1 suite: **4/4**.

## Rollback

The pre-fix demo is preserved in git history (commit `1a85ba0`).
