---
name: vince-low-visibility-fix
description: >
  Audit and fix existing mobile HTML/CSS for field low-visibility conditions —
  low light, glare, gloves, wet hands, vibration. Use when the user has an
  existing UI to make usable outdoors / in low light / with gloves, or to fix
  contrast, tap-target size, color-only state, or icon-only buttons in a
  field/industrial context. Triggers: "make this usable in the field", "fix
  contrast/tap targets", "$vince-low-visibility-fix". Not for: designing new UI from
  scratch; disability/screen-reader a11y (colorblind, low-vision); generic CSS
  review with no low-visibility angle.
---

# Low-Visibility UI Fix

Audit existing mobile HTML/CSS and, **after explicit confirmation**, fix it for
field low-visibility conditions: environmental (low light, glare) + physical
(gloves, wet hands, vibration). **Field conditions only** — disability/a11y
populations are out of scope; redirect them.

**Tiered:** `scripts/analyze.py` decides what is statically resolvable; you
complete the `needs_judgment` long tail; re-running it is your acceptance signal.

## Protocol — never edit before the Step-4 gate

1. **Scope** — confirm field low-visibility audit/fix of an existing UI; else redirect.
2. **Preflight** — locate HTML/CSS (screenshot-only → visual reasoning, no analyzer); confirm rollback (git or `.lv-backup/`).
3. **Analyze** — `python3 scripts/analyze.py <target>`; reason through each `needs_judgment` item; never invent ratios.
4. **Plan — HUMAN GATE** — present findings (critical→minor) + fixes; **wait for approval**. Load `rules/fix-patterns.md`.
5. **Execute** — snapshot first, then edit target files **only** (outside target → `PATH_OUTSIDE_TARGET`).
6. **Verify** — re-run with `--compare <before.json>`; confirm resolved.
7. **Report** — changes, residual `needs_judgment`, rollback command.

Edits go only to target files, only after the gate, after a snapshot; if no
rollback exists, output corrected snippets instead of auto-applying. No network.
Severity model, interpretation, plan format → `rules/audit-protocol.md`.

## Modules & scripts

| Path | When |
|------|------|
| `rules/audit-protocol.md` | Step 3–4: severity, interpretation, plan format, degraded mode |
| `rules/fix-patterns.md` | Step 5: per-rule fix recipes |
| `references/design-tokens.json` | threshold values (single source of truth) |
| `references/field-conditions.md` | why a threshold exists; standards citations |
| `assets/fix-snippets.html` | Step 5: compliant component patterns |
| `scripts/analyze.py <f.html> [--compare before.json] [--json]` | deterministic findings JSON (exit 1 if findings) |
| `evals/run_all.py` | regression: L0 schema + L1 golden + determinism + paired metric |
