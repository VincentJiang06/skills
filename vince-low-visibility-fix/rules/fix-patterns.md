# Fix Patterns

Load at Step 5. One vague→precise recipe per analyzer rule. Each fix must move the
`measured` value across the **field** threshold (not merely the baseline) for a
field-critical control, and must preserve layout and intent. Re-run the analyzer
to confirm (`--compare <before.json>`).

## contrast

Goal: reach the field ratio (text 7:1, large 4.5:1) from `design-tokens.json`.

- Prefer adjusting the **text** color toward the nearest extreme (lighter on dark,
  darker on light) keeping hue; if that is not enough, adjust the background.
- Keep brand hue where possible: shift lightness/saturation, not hue.
- Verify with the analyzer — do not eyeball the ratio.

```css
/* before: #aaaaaa on #ffffff = 2.3:1 */   .task-title { color: #aaaaaa; }
/* after:  #1a1a1a on #ffffff = 16.1:1 */   .task-title { color: #1a1a1a; }
```

## target_size

Goal: smaller dimension ≥ `target_size.field_px` (64px), comfortable 80px.

- Use `min-width`/`min-height` so content can still grow; add padding for hit area.
- Do not shrink siblings to compensate — reflow or stack instead.

```css
/* before: 32×32 */   .btn { width: 32px; height: 32px; }
/* after  */          .btn { min-width: 64px; min-height: 64px; padding: 12px; }
```

## icon_only

Goal: every control has an accessible name.

- Add a visible text label beside the icon (preferred for field — text survives
  glare better than a glyph). If space truly forbids, add `aria-label`.

```html
<!-- before --> <button class="btn"><svg>…</svg></button>
<!-- after  --> <button class="btn"><svg aria-hidden="true">…</svg><span>确认</span></button>
```

## color_only

Goal: redundant coding — color **plus** icon **plus** text/shape.

```html
<!-- before --> <span class="status-dot"></span>
<!-- after  --> <span class="status ok"><svg aria-hidden="true">✓</svg> 正常</span>
```

## spacing

Goal: gap between adjacent targets ≥ `spacing.field_px` (12px).

```css
/* before */ .row .btn { margin: 1px; }
/* after  */ .row .btn { margin: 12px; }   /* or gap:12px on a flex row */
```

## font_size

Goal: body text ≥ `font_size.field_body_px` (16px); critical labels ≥ 18px.

- Prefer `rem` so user text-scaling still applies; set a base size on `:root`.

```css
/* before */ body { font-size: 12px; }
/* after  */ body { font-size: 1rem; }   /* with :root { font-size: 16px } */
```

## After applying

1. Re-run `python3 scripts/analyze.py <target> --compare <before.json>`.
2. Confirm the `comparison.fixed` list covers the approved findings and
   `comparison.introduced` is empty.
3. Report before/after score and any residual `needs_judgment`.
