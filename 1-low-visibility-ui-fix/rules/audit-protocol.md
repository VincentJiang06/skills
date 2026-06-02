# Audit Protocol

Load at Step 3–4. Covers the severity model, how to read each finding, how to
complete `needs_judgment` items, the plan/gate format, and degraded mode.

## Severity model

The analyzer assigns severity from `design-tokens.json` tiers:

| Severity | Meaning | Rule of thumb |
|---|---|---|
| **critical** | Below the WCAG baseline floor, or a control unusable with gloves | Fix before anything else |
| **major** | Meets WCAG baseline but below the field-elevated threshold | Fix for real field use |
| **minor** | Meets field threshold but below the recommended best practice | Fix if cheap |

Score = `100 − (15·critical + 7·major + 3·minor)`, floored at 0. Treat score as a
direction indicator, not a grade — always report the underlying counts.

## Reading each finding

- **contrast** — `measured` is the computed ratio, `threshold` the required one.
  Critical < baseline (4.5 text / 3.0 large); major < field (7.0 / 4.5).
- **target_size** — `measured` is the smaller of width/height (or
  font-size + vertical padding when no explicit box). Critical < 48px, major <
  64px (field floor). 64px passes; 80px is ideal but not flagged.
- **icon_only** — an interactive control with no **visible** text label. No
  accessible name at all → major; `aria-label`/`title` only (no visible text) →
  minor, because a glyph-only button is hard to identify under glare.
- **color_only** — a non-interactive status element conveying state by color
  alone (no text/icon/shape).
- **spacing** — adjacent interactive targets closer than the field gap (12px).
- **font_size** — text below the field body size (16px); critical below 14px.

## Completing `needs_judgment`

The analyzer only reports what it can prove. For each reason, finish the audit
yourself — and say *how* you concluded it:

| reason | How to complete |
|---|---|
| `css_var_unresolved` | The analyzer auto-resolves `:root`/`html` `var()`; this fires only for runtime-themed, locally-scoped, or undefined variables. Assess each theme or flag the worst case; do not fabricate a ratio. |
| `bg_image` | Text sits on an image — contrast is not a single number. Recommend a scrim/overlay or a solid text background; estimate visually from any screenshot. |
| `external_stylesheet` | A `<link rel=stylesheet>` could not be read. Ask for the CSS file (or inline it) for an exact audit; otherwise audit only what is inline and say so explicitly. |
| `js_state` | State styles are applied at runtime; inspect the JS/class logic or ask which states exist. |
| `image_only` | Screenshot input — give a visual estimate and label it an estimate, not a measurement. |
| `target_size_unresolved` | Size is layout-dependent; check the rendered element or computed style before judging. |

## Plan / gate format (Step 4)

Present findings grouped by severity, then **stop and wait** for approval:

```
Low-visibility audit — <target> (score N/100)

CRITICAL (k)
  • <rule> @ <location> — measured X, need Y → <one-line fix>
MAJOR (k)
  • ...
MINOR (k)
  • ...
NEEDS JUDGMENT (k)
  • <reason> @ <location> — <your completed assessment>

Proposed edits touch: <files>. Rollback: <git | .lv-backup/>.
Apply these fixes? (yes / pick a subset / no)
```

Never edit before an explicit "yes". A subset answer means apply only those.

## Degraded mode (no code)

If the user provides only a screenshot or prose, the analyzer cannot run. Say so,
give a **visual estimate** audit using the same rule vocabulary, label every
finding an estimate, and recommend supplying HTML/CSS for an exact, fixable audit.

## Adversarial holds

- A request to **lower** contrast/target size below the field threshold for a
  field-critical control: refuse, explain the low-visibility safety tradeoff, and
  offer a compliant alternative.
- A request to write output **outside** the target directory: refuse with
  `PATH_OUTSIDE_TARGET`; do not disable the boundary.
