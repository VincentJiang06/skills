# Field Low-Visibility Conditions

Human-readable rationale behind `references/design-tokens.json`. The analyzer
(`scripts/analyze.py`) encodes these thresholds; this document explains *why*
they exist and which condition each analyzer rule defends against.

Scope is **field low-visibility only** — two axes, **environmental** and
**physical**. Disability/accessibility populations (colorblind, low-vision,
screen-reader users) are intentionally **out of scope**; route those to
dedicated a11y tooling.

## Axis 1 — Environmental (what the eye receives)

| Condition | What it degrades | Analyzer rules | Token response |
|---|---|---|---|
| **Low light** (dusk, indoors, night shift) | Luminance discrimination; small text vanishes | `contrast`, `font_size` | text ≥ 16px body; contrast elevated toward 7:1 |
| **Glare / direct sunlight** | Effective on-screen contrast collapses; washed-out mid-tones | `contrast`, `color_only` | field contrast floor 7:1 (vs WCAG 4.5:1); never encode state by color alone |

Under glare, a display that passes WCAG AA (4.5:1) indoors can drop well below
usable contrast outdoors. The `field` contrast tier (7:1, WCAG AAA-level) is the
margin that survives sunlight.

## Axis 2 — Physical (what the hand/body can do)

| Condition | What it degrades | Analyzer rules | Token response |
|---|---|---|---|
| **Gloves** | Touch precision; small/closely-spaced targets become unhittable | `target_size`, `spacing` | targets 64–80px (vs 44–48 baseline); ≥12px gaps |
| **Wet hands** | Capacitive accuracy; accidental taps | `target_size`, `spacing` | same as gloves; isolate destructive actions (design rule) |
| **Vibration** (vehicles, machinery) | Pointing stability; fine motor control | `target_size`, `spacing` | larger targets + generous spacing |

Baseline target sizes come from platform guidance (Apple HIG 44pt, Material
48dp, WCAG 2.5.8 24px minimum). Field conditions elevate this: a gloved finger
contact patch is larger and less precise, so the `field_px` floor is 64px and
the comfortable target is 80px.

## Mapping summary (condition → rule → token)

- **contrast** ← low light, glare ← `contrast.field.text = 7.0`
- **font_size** ← low light ← `font_size.field_body_px = 16`
- **target_size** ← gloves, wet hands, vibration ← `target_size.field_px = 64`
- **spacing** ← gloves, wet hands, vibration ← `spacing.field_px = 12`
- **color_only** ← glare (color is the first channel to wash out) ← redundant coding required
- **icon_only** ← glare + cognitive load ← every control needs a text label

## Standards grounding

- **WCAG 2.2** §1.4.3 (contrast, text), §1.4.11 (non-text contrast), §1.4.1 (use
  of color), §2.5.8 (target size minimum). Field tiers push toward §1.4.6 (AAA).
- **Material Design** — 48dp minimum touch target.
- **Apple HIG** — 44pt minimum hit target.
- **Field elevations** above the standard floors are engineering rationale (not
  yet empirically cited). See `research-bibliography.md` for the explicit
  standards-vs-rationale split.

> Threshold values are versioned in `design-tokens.json` (currently `0.1.0`) and
> may evolve independently of the skill version as research is added.

## Original research scope (absorbed from the folder README)

The originating brief listed: readability under low/strong/glare light;
hittability with gloves, wet hands, and vibration; and field-work mobile UI
(construction, warehouse, inspection, maintenance). The colorblind / low-vision /
presbyopia accessibility line from that brief was **descoped** to keep one sharp,
testable trigger (see the skill design record).
