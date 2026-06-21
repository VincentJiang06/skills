# Audit Protocol

Load at Step 3–4. Severity model, how to read each finding, how to complete
`needs_judgment`, degraded mode, and the boundary/adversarial holds. This skill
**audits and documents** — it never edits the target (see `rules/handoff-docs.md`
for the output).

## Severity model

`scripts/analyze.py` assigns severity from `design-tokens.json` tiers:

| Severity | Meaning | Rule of thumb |
|---|---|---|
| **critical** | Below the WCAG baseline floor, or a control unusable with gloves | Fix before anything else |
| **major** | Meets WCAG baseline but below the field-elevated threshold | Fix for real field use |
| **minor** | Meets field threshold but below the recommended best practice | Fix if cheap |

Score = `100 − (15·critical + 7·major + 3·minor)`, floored at 0. The doc set
reports `worst_score` across the scope plus the underlying counts — treat score
as a direction indicator, not a grade.

## Reading each finding

- **contrast** — `measured` is the computed ratio, `threshold` the required one.
  Critical < baseline (4.5 text / 3.0 large); major < field (7.0 / 4.5).
- **target_size** — `measured` is the smaller of width/height (or
  font-size + vertical padding when no explicit box). Critical < 48px, major <
  64px (field floor). 64px passes; 80px is ideal but not flagged. WXSS `rpx` is
  resolved against the viewport (750rpx == viewport width; `--viewport-px`).
- **icon_only** — an interactive control with no **visible** text label. No
  accessible name at all → major; `aria-label`/`title` only → minor (a glyph is
  hard to identify under glare). WeChat `bindtap`/`catchtap` on a `<view>` and
  `<button>`/`<navigator>` count as interactive.
- **color_only** — a non-interactive status element conveying state by color alone.
- **spacing** — adjacent interactive targets closer than the field gap (12px).
- **font_size** — text below the field body size (16px); critical below 14px.

## Completing `needs_judgment`

The analyzer only reports what it can prove; the rest is the visual pass
(`rules/visual-pass.md`). For each reason, complete the audit and say *how* you
concluded it — never fabricate a ratio:

| reason | How to complete |
|---|---|
| `css_var_unresolved` | Auto-resolved for `:root`/`html`; this fires for runtime-themed/locally-scoped/undefined vars. Assess each theme or the worst case. |
| `bg_undeclared` | No background is declared on the element or any ancestor in the markup/sheet provided — it likely lives in a global/app sheet. **Never assume white.** Re-run with `--css <global-sheet>` or read the rendered background, then judge contrast. |
| `bg_image` | Text on an image/gradient — contrast is not one number. Estimate visually; recommend a scrim/overlay or solid text background. |
| `unresolved_color` | A color function the parser can't evaluate (`color-mix()`, `lab()`, `oklch()`, `currentColor` with no resolvable source). Read the rendered color; don't guess a ratio. |
| `font_size_relative_unresolved` | An `em`/`%` font-size whose parent chain isn't resolvable — **not** assumed 16px. Check the inherited/rendered px size. |
| `target_size_unresolved` | Size is layout-dependent — check the rendered/computed box before judging. |
| `target_size_no_uadefault` | An interactive control with no explicit size and no known UA default — check the rendered box. |
| `spacing_unresolved` | The `gap`/`margin` between adjacent targets couldn't be resolved — check the rendered spacing. |
| `media_conditional` | A rule applies only under a `@media`/`@supports` condition — judge which condition holds on the target field device. |
| `css_rule_unparsed` | A CSS block the parser couldn't safely handle (exotic at-rule/syntax) — inspect that rule manually or supply simpler CSS. (Surfaced, never silently dropped.) |
| `external_stylesheet` | A `<link>` could not be read. Re-run with `--css <sheet>` (or inline it) for an exact audit; else audit inline only and say so. |
| `js_state` | State styles applied at runtime — inspect the JS/class logic or ask which states exist. |
| `image_only` | Screenshot input — give a labelled visual estimate, not a measurement. |

## Output, not edits (replaces the old fix gate)

There is **no edit step and no edit-approval gate**. `scripts/audit.py` writes the
doc set to the out dir; an implementer agent applies it. The doc set is emitted
**every run**, including the zero-findings "clean" case.

## Degraded mode (no code / no renderer)

If only a screenshot or prose is available (or no renderer for the visual pass),
run `--input-mode visual_estimate`: still emit the full doc set, label every
finding an estimate, and recommend supplying HTML/CSS/WXSS for an exact audit.

## Boundary / adversarial holds

- **OUTPUT_ONLY** — never edit/create/delete files in the target source tree; the
  doc set goes only to the out dir. A request to write elsewhere → refuse
  (`OUTPUT_ONLY`), do not disable the boundary.
- **Contrast/size floor** — a request to *lower* contrast or target size below the
  field threshold for a field-critical control → refuse, explain the
  low-visibility safety tradeoff, offer a compliant alternative (`scripts/policy.py`).
