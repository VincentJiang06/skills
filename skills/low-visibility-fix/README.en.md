# low-visibility-fix

> Audits a field mobile UI for low-visibility legibility and tappability — and hands back implementer-ready, severity-ranked fix docs without ever touching the target.

**English** · [简体中文](README.md)

**What it does** — Audits an existing mobile UI (WeChat mini-program / H5 / app) for FIELD low-visibility conditions (low light, glare, gloves, wet hands, vibration) and hands back a structured, implementer-ready fix-plan doc set (findings by severity + prioritized recommendations). NEVER edits the target — an implementer applies the docs.

**Why it's good** —
- A deterministic analyzer plus a bounded visual/browser pass: thresholds come from single-source design tokens, then visual reasoning resolves the long tail.
- Scopeable to specific page(s)/component(s) for cheap multi-round re-runs — each run stays bounded, with a capped scan.
- Clean audit-vs-apply separation — this skill only produces docs (`audit.json` + `report.md`); writing into the target source tree is refused.

**When to use** — "audit this field UI and hand me a fix plan" · "check only <page/component> for low-visibility issues" · "is this screen still tappable in low light / glare / with gloves"; or call `/low-visibility-fix`.
**Not for** — editing/fixing files directly (this skill produces docs, an implementer applies them); designing a new UI from scratch; disability/screen-reader a11y (colorblind, low-vision); generic CSS review with no low-visibility angle.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/low-visibility-fix ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
