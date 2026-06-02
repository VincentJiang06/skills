# Standards & Rationale — vince-low-visibility-fix

The thresholds in `design-tokens.json` come from two sources, kept deliberately
distinct for honesty: **published standards** (verifiable) and **field-elevation
rationale** (engineering judgment, not yet backed by a specific cited study).

## Cited standards (verifiable)

### Contrast
- **WCAG 2.2 SC 1.4.3 Contrast (Minimum)**, level AA — 4.5:1 normal text, 3:1
  large text. → `contrast.baseline.text = 4.5`, `large_text = 3.0`.
- **WCAG 2.2 SC 1.4.6 Contrast (Enhanced)**, level AAA — 7:1 normal, 4.5:1 large.
  → adopted as the **field tier** `contrast.field.text = 7.0`, `large_text = 4.5`.
- **WCAG 2.2 SC 1.4.11 Non-text Contrast** — 3:1 for UI components/graphics. → `contrast.*.ui`.
- **WCAG large-text definition** — ≥18pt (~24px), or ≥14pt bold (~18.66px). → `contrast.large_text_min_px = 24`.

### Use of color
- **WCAG 2.2 SC 1.4.1 Use of Color** — color must not be the only visual means of
  conveying information. → the `color_only` rule.

### Target size
- **WCAG 2.2 SC 2.5.8 Target Size (Minimum)**, AA — 24×24 CSS px (with exceptions).
  → `target_size.wcag_min_px = 24`.
- **WCAG 2.2 SC 2.5.5 Target Size (Enhanced)**, AAA — 44×44 CSS px.
- **Apple Human Interface Guidelines** — minimum 44×44 pt tappable area.
- **Material Design (Android)** — minimum 48×48 dp touch target. → `target_size.baseline_px = 48`.

## Field-elevation rationale (engineering judgment)

Elevations above the published floors are deliberate choices for field conditions.
They are **rationale, not citations** — flagged so they can be replaced with
empirical sources later.

- **Glare / direct sunlight** collapses effective on-screen contrast; a display
  that passes AA (4.5:1) indoors can drop below usable outdoors. We adopt the AAA
  tier (7:1) as the field floor for a sunlight margin.
- **Gloves / wet hands / vibration** enlarge the effective finger contact patch
  and reduce pointing precision; the 44–48px platform floors assume a bare, steady
  fingertip. We set `field_px = 64`, `recommended_px = 80`, and a 12px inter-target
  gap as a field margin.
- **Low light** favors larger type; the body floor is 16px, 14px is the hard
  minimum, and 18px is suggested for critical labels.

> When empirical field-ergonomics sources are added, move the corresponding bullet
> from "rationale" to "cited" and keep or update the token value with the evidence
> (values are versioned in `design-tokens.json`).
