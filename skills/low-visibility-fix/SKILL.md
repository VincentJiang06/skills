---
name: low-visibility-fix
description: >
  Audit existing mobile UI (WeChat mini-program / H5 / app) for FIELD
  low-visibility conditions — low light, glare, gloves, wet hands, vibration —
  and emit an implementer-ready handoff DOCUMENT SET (findings by severity +
  prioritized fixes). Deterministic analyzer is PROVE-OR-FLAG: it reports a
  finding only when it can prove a threshold violation from resolved values, and
  turns every value it cannot resolve into an explicit needs_judgment for the
  bounded visual pass — it never silently skips a rule or fabricates a default.
  Scopes to specific page(s)/component(s) for cheap multi-round re-runs. NEVER
  edits the target — it hands documents to another agent to apply. Use when
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

Audit existing mobile UI for field low-visibility conditions and emit a structured
**handoff document set** for another agent to implement. **Field conditions only**;
disability/a11y populations are out of scope — redirect them. This skill **never
edits the target**.

## What it actually measures (honest scope)

The deterministic analyzer measures **four things** it can compute from the
markup + styles:

| Measure | Defends against |
|---|---|
| **text contrast** (WCAG ratio) | low light, glare |
| **text size** | low light |
| **tap-target size** + **spacing** | gloves, wet hands, vibration |
| **redundancy** — color-only state / icon-only control | glare (color/glyph wash out first) |

The five "field conditions" (low light, glare, gloves, wet hands, vibration) are
not detected as separate signals — they map onto these four measures via an
elevated threshold tier (`references/field-conditions.md`). Don't over-claim a
finding's causal axis; report the measure and the tier it violates.

## The core principle: PROVE-OR-FLAG (why this is reliable)

`scripts/analyze.py` emits a **finding** only when it can **prove** a threshold
violation from fully-resolved values. Every value it **cannot** resolve —
unparsed CSS (`@media`/nested blocks), an unknown color/function, an undeclared
background, a relative font size with no known parent, an unresolvable box or
adjacency, an external sheet — becomes an explicit **`needs_judgment`** row with a
specific reason. It **never silently drops a rule and never fabricates a default**
that would create or hide a finding. So coverage is honest: the doc set shows
exactly what was *proven* vs what the visual pass must resolve.

This is the must-always-succeed deliverable: a doc set (`audit.json` +
`report.md`) where findings are proven and uncertainty is visible.

## Two-tier thresholds, clearly labeled
- **critical** — below the **WCAG** baseline (a cited standard).
- **major** — meets WCAG but below the **field-elevated** tier (an engineering
  recommendation, *not* a standard — say so in the handoff so a WCAG-AA control
  isn't reported as "broken").
- **minor** — meets field but below best-practice.

Thresholds live in `references/design-tokens.json` (single source of truth) and
are project-configurable.

## Protocol — analyze, document, hand off (never edit the target)

1. **Scope** — confirm a field low-visibility audit of an EXISTING mobile UI;
   else redirect (new design / a11y / generic CSS = out of scope). Read the
   targeted request (`--pages`, `--selector`); with none, a bounded default scan.
2. **Preflight** — locate the in-scope files for that scope only: H5
   `.html`/`.css`, or mini-program `.wxml`/`.wxss`. Pick the visual-pass render
   method (`rules/visual-pass.md`); if none is available, degrade — still emit docs.
3. **Analyze** — `python3 scripts/audit.py <target> [--pages a,b] [--selector .x]
   [--css sheet.wxss]`. Deterministic, prove-or-flag, thresholded by
   `design-tokens.json`.
4. **Visual pass (bounded) — this is MODEL judgment, not code.** The analyzer's
   `needs_judgment` rows ARE your worklist. Render the targeted page(s) at a
   mobile viewport and resolve each one by visual reasoning; label visual findings
   as estimates. Never fabricate a ratio. The deterministic core proves what it
   can; you resolve the rest — and the two are kept distinct in the doc set.
5. **Synthesize** — `audit.py` writes the doc set to the out dir (default
   `<target>/.lv-audit/`). Confirm `audit.json` validates and every section is
   present, including the zero-findings "clean" doc.
6. **Report** — summarize findings by severity, point at the doc paths + residual
   `needs_judgment`, suggest the next-round scope. Do **not** edit the target.

Output goes only to the out dir (writing into the target source tree →
`OUTPUT_ONLY` refusal). Refuse to recommend lowering contrast/target below the
field threshold for a field-critical control; offer a compliant alternative.
Severity, reading findings, completing `needs_judgment`, degraded mode → modules.

## Modules & scripts

| Path | When |
|------|------|
| `rules/audit-protocol.md` | Step 3–4: severity model, reading findings, completing every `needs_judgment` reason, degraded mode, adversarial holds |
| `rules/handoff-docs.md` | Step 5: doc-set sections + how fixes are written as recommendations (not applied) |
| `rules/visual-pass.md` | Step 2/4: per-target render method, what the visual pass catches, the page cap, graceful degradation |
| `references/design-tokens.json` | threshold values (single source of truth) |
| `references/field-conditions.md` | why each threshold exists; standards-vs-rationale split |
| `assets/handoff-doc.template.md` | the doc-set shape an implementer agent reads |
| `assets/fix-snippets.html` | compliant component patterns referenced by recommendations (never applied) |
| `scripts/audit.py <target> [--pages a,b] [--selector .x] [--css f] [--out d] [--input-mode static\|visual_estimate] [--json]` | scope → analyze → emit doc set; never edits the target (exit 3 = empty scope) |
| `scripts/analyze.py <file> [--css f] [--selector .x] [--viewport-px n]` | prove-or-flag deterministic findings JSON for one file (H5 or WXML+WXSS) |
