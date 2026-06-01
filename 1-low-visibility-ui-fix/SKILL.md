---
name: low-visibility-ui-fix
description: >
  Audit and fix existing mobile UI code (HTML/CSS) for field low-visibility
  conditions — low light, glare, gloves, wet hands, vibration. Use when the user
  has existing UI and wants it readable/operable outdoors or in low light, with
  gloves, or complains about contrast, touch-target size, color-only state, or
  icon-only buttons in a field/industrial context. Triggers on "make this usable
  outdoors/in the field", "fix contrast/tap targets", "$low-visibility-ui-fix".
  Do NOT use to design a new UI from scratch (that is design, not fix), for
  disability/screen-reader accessibility (colorblind, low-vision — out of scope),
  or for generic CSS review with no low-visibility angle.
---

# Low-Visibility UI Fix

Audit existing mobile HTML/CSS and, **after explicit confirmation**, fix it for
field low-visibility conditions: environmental (low light, glare) and physical
(gloves, wet hands, vibration). **Field conditions only** — disability/a11y
populations (colorblind, low-vision, screen-reader) are out of scope; redirect them.

**Tiered:** the analyzer (`scripts/analyze.py`) handles what is statically
resolvable; you complete the `needs_judgment` long tail; the analyzer re-run is
your acceptance signal after fixing.

## Trigger boundary

Use when the user supplies HTML/CSS (or a screenshot) of an existing UI and wants
it usable under sun/glare/low-light or with gloves, or complains about contrast,
tap-target size, color-only state, or icon-only controls in a field/industrial
mobile context.

Do **not** use when: designing a new UI from scratch; making a UI accessible for
disabilities/screen readers; reviewing CSS with no low-visibility angle.

## Protocol

Follow this runbook. **Never edit files before Step 4's gate.**

1. **Scope check** — confirm this is a field low-visibility audit/fix of an
   *existing* UI. If it is new-design or a11y-populations, redirect and stop.
2. **Preflight** — locate the HTML/CSS file(s). If only a screenshot or prose is
   given, say so and degrade to visual reasoning (no analyzer). Determine rollback
   capability: git working tree, else a writable `.lv-backup/`.
3. **Analyze** — run `python3 scripts/analyze.py <target>`. Read the JSON. For
   every `needs_judgment` item (and any screenshot), complete the audit by
   reasoning — never invent exact contrast ratios for unresolved colors.
4. **Plan — HUMAN GATE** — present prioritized findings (critical → minor) with
   proposed fixes and token deltas, then **wait for explicit approval before
   editing**. Load `rules/fix-patterns.md` for the per-rule recipes.
5. **Execute (gated)** — snapshot originals first, then edit the target files
   only. Never write outside the target directory (`PATH_OUTSIDE_TARGET`).
6. **Verify** — re-run the analyzer with `--compare <before.json>`; confirm
   findings resolved; report before/after score.
7. **Report** — what changed, residual `needs_judgment` items, rollback command.

For the severity model, finding interpretation, and plan format, load
`rules/audit-protocol.md`.

## Control boundaries

- Edit **only** the user's target UI files; never outside the target directory.
- **Any** file edit requires the Step-4 gate — no silent auto-apply.
- Snapshot before editing (git or `.lv-backup/`); if neither is possible, refuse
  to auto-apply and output corrected snippets instead.
- No network. The analyzer is read-only.

## Modules

| File | When to load |
|------|--------------|
| `rules/audit-protocol.md` | Step 3–4: severity model, finding interpretation, plan format, degraded mode. |
| `rules/fix-patterns.md` | Step 5: the vague→precise fix recipe per finding rule. |
| `references/design-tokens.json` | Whenever you need a threshold value (single source of truth). |
| `references/field-conditions.md` | To explain *why* a threshold exists, or for citations. |
| `assets/fix-snippets.html` | Step 5: compliant component patterns to graft in. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/analyze.py` | `python3 scripts/analyze.py <file.html> [--tokens t.json] [--compare before.json] [--json]` — deterministic findings JSON; exit 1 if findings present. |
| `evals/check.py` | `python3 evals/check.py` — L1 golden test for the analyzer. |
