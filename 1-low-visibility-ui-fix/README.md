# low-visibility-ui-fix

A Claude Code skill that **audits and (gated) fixes existing mobile HTML/CSS for
field low-visibility conditions** — environmental (low light, glare) and physical
(gloves, wet hands, vibration).

Built fresh using the `develop-principle` methodology (industrial skill = reusable
capability package with 8 design units). Architecture: **tiered hybrid** — a
deterministic analyzer decides everything statically resolvable, the model
completes the `needs_judgment` long tail, and the analyzer re-run is the
acceptance signal after fixing.

- **Skill entry**: [SKILL.md](SKILL.md)
- **Design spec**: [../docs/superpowers/specs/2026-06-01-low-visibility-ui-fix-skill-design.md](../docs/superpowers/specs/2026-06-01-low-visibility-ui-fix-skill-design.md)
- **Design record / metrics / release gate**: [meta/](meta/)

## Quick use

```bash
# deterministic audit of an existing UI file
python3 scripts/analyze.py path/to/ui.html

# run the L1 golden test suite
python3 evals/check.py
```

The skill then prioritizes findings, presents a plan, **waits for your approval**
(it never edits files silently), snapshots originals, applies fixes, and re-runs
the analyzer to verify.

## Layout

```
SKILL.md            entry: identity / trigger / protocol / modules
rules/              audit-protocol.md, fix-patterns.md  (loaded on demand)
references/         design-tokens.json (single source of truth), field-conditions.md
scripts/            analyze.py  (deterministic HTML/CSS analyzer, stdlib only)
schemas/            JSON contracts for analyzer output, tokens, eval cases
evals/              eval-cases.json, check.py, fixtures/ (+ golden outputs)
meta/               skill-design-record.json, metric-plan.json, release-checklist.json
```

## Scope

**Field conditions only.** Disability / screen-reader accessibility (colorblind,
low-vision, presbyopia) is intentionally out of scope — route those to dedicated
a11y tooling.

## Status

**v0.1** — analyzer covers contrast, target_size, icon_only, color_only, spacing,
font_size; L1 golden suite passes 3/3. Analyzer v0.1 handles inline + `<style>`-block
styles and explicit dimensions; unresolved CSS (variables, theme colors,
background images, JS state) is reported as `needs_judgment`. Paired eval (L5) and
a cited field-threshold bibliography are deferred to a later version.
