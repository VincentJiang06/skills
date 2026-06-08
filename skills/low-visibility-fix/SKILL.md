---
name: low-visibility-fix
description: >
  Audit existing mobile UI (WeChat mini-program / H5 / app) for FIELD
  low-visibility conditions — low light, glare, gloves, wet hands, vibration —
  and emit an implementer-ready handoff DOCUMENT SET (findings by severity +
  prioritized fixes). Runs a deterministic analyzer plus a bounded visual/browser
  pass; scopes to specific page(s)/component(s) for cheap multi-round re-runs.
  NEVER edits the target — it hands documents to another agent to apply. Use when
  someone has an existing field/industrial UI to check for contrast, tap-target
  size, color-only state, or icon-only buttons, and wants a fix plan. Triggers:
  "审计这个界面在低光/眩光/戴手套下是否清晰可点，给我修改建议文档", "audit this field UI and
  hand me a fix plan", "check only <page/component> for low-visibility issues",
  "$low-visibility-fix". Not for: editing/fixing files directly (it produces docs,
  an implementer applies them); designing a new UI from scratch;
  disability/screen-reader a11y (colorblind, low-vision); generic CSS review with
  no low-visibility angle.
---

# Low-Visibility UI Audit → Handoff Docs

Audit existing mobile UI for field low-visibility conditions — environmental
(low light, glare) + physical (gloves, wet hands, vibration) — and emit a
structured **handoff document set** for another agent to implement. **Field
conditions only**; disability/a11y populations are out of scope — redirect them.

This skill **never edits the target**. Its stable, must-always-succeed
deliverable is the doc set (`audit.json` + `report.md`), written only to the out
dir. It is built to run **many rounds** on a **scoped** subset — keep each run
bounded (targeted pages/components, capped scan).

## Protocol — analyze, document, hand off (never edit the target)

1. **Scope** — confirm a field low-visibility audit of an EXISTING mobile UI;
   else redirect (new design / a11y / generic CSS = out of scope). Read the
   targeted request (`--pages`, `--selector`); with none, a bounded default scan.
2. **Preflight** — locate the in-scope files for the targeted scope only: H5
   `.html`/`.css`, or mini-program `.wxml`/`.wxss`. Pick the visual-pass render
   method (`rules/visual-pass.md`); if none is available, degrade — still emit docs.
3. **Analyze** — `python3 scripts/audit.py <target> [--pages a,b] [--selector .x]
   [--css sheet.wxss]`. Deterministic findings thresholded by `design-tokens.json`.
4. **Visual pass (bounded)** — render the targeted page(s) at a mobile viewport,
   resolve the `needs_judgment` long tail by visual reasoning, label visual
   findings as estimates. Never fabricate a ratio.
5. **Synthesize** — `audit.py` writes the doc set to the out dir (default
   `<target>/.lv-audit/`). Confirm `audit.json` validates and every section is
   present, including the zero-findings "clean" doc.
6. **Report** — summarize findings by severity, point at the doc paths + residual
   `needs_judgment`, suggest the next-round scope. Do **not** edit the target.

Output goes only to the out dir (writing into the target source tree →
`OUTPUT_ONLY` refusal). No network beyond rendering the target. Refuse to
recommend lowering contrast/target below the field threshold for a field-critical
control; offer a compliant alternative. Severity, interpretation, doc-set spec,
and degraded mode → the modules below.

## Modules & scripts

| Path | When |
|------|------|
| `rules/audit-protocol.md` | Step 3–4: severity model, reading findings, completing `needs_judgment`, degraded mode, adversarial holds |
| `rules/handoff-docs.md` | Step 5: doc-set sections + how fixes are written as recommendations (not applied) |
| `rules/visual-pass.md` | Step 2/4: per-target render method, what the visual pass catches, the page cap, graceful degradation |
| `references/design-tokens.json` | threshold values (single source of truth) |
| `references/field-conditions.md` | why each threshold exists; standards citations |
| `assets/handoff-doc.template.md` | the doc-set shape an implementer agent reads |
| `assets/fix-snippets.html` | compliant component patterns referenced by recommendations (never applied) |
| `scripts/audit.py <target> [--pages a,b] [--selector .x] [--css f] [--out d] [--input-mode static\|visual_estimate] [--json]` | scope → analyze → emit doc set; never edits the target (exit 3 = empty scope) |
| `scripts/analyze.py <file> [--css f] [--selector .x] [--viewport-px n]` | deterministic findings JSON for one file (H5 or WXML+WXSS) |
