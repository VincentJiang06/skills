# vince-low-visibility-fix

A Claude Code skill that **audits existing mobile UI (WeChat mini-program / H5 /
app) for field low-visibility conditions** — environmental (low light, glare) and
physical (gloves, wet hands, vibration) — and emits a structured, implementer-ready
**handoff document set**. It **never edits the target**: it hands findings + fix
recommendations to another agent to apply.

Built with the `develop-principle` methodology (industrial skill = reusable
capability package with 8 design units). Architecture: **tiered hybrid** — a
deterministic analyzer decides everything statically resolvable, a bounded
visual/browser pass completes the `needs_judgment` long tail, and the doc set is
the stable, schema-validated deliverable on every run.

- **Skill entry**: [SKILL.md](SKILL.md)
- **Design record / metrics / release gate**: [meta/](meta/)

## Quick use

```bash
# audit a UI (file or dir) and emit the handoff doc set to <target>/.lv-audit/
python3 scripts/audit.py path/to/ui           # H5 dir
python3 scripts/audit.py page.wxml --css page.wxss   # WeChat mini-program

# scope a cheap re-run to specific pages / a component
python3 scripts/audit.py path/to/project --pages home,settings
python3 scripts/audit.py page.html --selector .toolbar

# deterministic findings for one file (no docs written)
python3 scripts/analyze.py path/to/ui.html

# full regression + behavioral harness (every adversarial edge bound to a case)
python3 evals/run_all.py
```

The skill audits, then writes `audit.json` + `report.md` to the out dir (default
`<target>/.lv-audit/`). An implementer agent reads them and applies the fixes —
this skill never edits the target source.

## Layout

```
SKILL.md            entry: identity / trigger / protocol / modules
rules/              audit-protocol.md, handoff-docs.md, visual-pass.md (on demand)
references/         design-tokens.json (single source of truth), field-conditions.md
scripts/            audit.py (entry), analyze.py, scope.py, emit_docs.py, policy.py
schemas/            JSON contracts: analyzer output, handoff doc set, tokens, eval cases
evals/              run_all.py (harness), eval-cases.json, fixtures/ (+ golden outputs)
meta/               skill-design-record.json, metric-plan.json, release-checklist.json
```

## Scope

**Field conditions only.** Disability / screen-reader accessibility (colorblind,
low-vision, presbyopia) is out of scope — route those to dedicated a11y tooling.
The skill produces documents; it does **not** edit files, and it does **not**
design new UI.

## Status

**v0.3.0** — re-scoped from audit+fix to **audit + handoff docs**. Analyzer covers
contrast, target_size (incl. `min-*` floors and WXSS `rpx`), icon_only
(visible-text aware), color_only, spacing, font_size, resolves `:root` CSS vars,
and merges an external `--css`. Targeted `--pages`/`--selector` scoping; bounded,
re-entrant runs; `OUTPUT_ONLY` boundary. Harness 18/18 (L0 schema + L1 golden +
determinism + 15 behavioral edges); mutation spot-check passes. Unresolved CSS
(runtime/undefined vars, theme colors, background images, JS state) →
`needs_judgment`, completed by the visual pass.
