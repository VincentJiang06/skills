# Low-Visibility UI Fix Skill — Design Spec

- **Date**: 2026-06-01
- **Status**: Approved design, pre-implementation
- **Skill name**: `low-visibility-fix`
- **Location**: `low-visibility-fix/`
- **Methodology**: built strictly against the `develop-principle` knowledge base
  (industrial skill = reusable capability package with 8 design units).

---

## 1. Purpose

Audit an existing mobile UI (HTML/CSS) and, after explicit confirmation, fix it
so it stays **readable and operable under field low-visibility conditions** —
environmental (low light, glare) and physical (gloves, wet hands, vibration).

It is **not** a UI-design generator and **not** a disability-accessibility tool
(colorblind / screen-reader populations are out of scope by decision).

## 2. Locked scope decisions

| Decision | Choice | Consequence |
|---|---|---|
| Relationship to existing `low-visibility-field-worker-ui` (dogfood) | **Fresh & independent** | Blank-slate build; no content reuse |
| Primary job | **Audit & fix existing UIs** | Sharp, testable trigger |
| Input | **Code-first (HTML/CSS), image optional** | Enables a deterministic analyzer |
| Fix delivery | **Auto-apply to files, human-gated** | Real control + rollback boundary |
| Domain breadth | **Field conditions only** (environmental + physical) | a11y populations excluded |
| Architecture | **C — tiered hybrid** | Deterministic floor + model long-tail + analyzer-as-gate |

### Carried assumptions (correct if not challenged)
- **Platform**: mobile-first touch UI (mobile web / H5 / webview).
- **Standards grounding**: WCAG 2.2 as the floor, *elevated* with field thresholds,
  Material 48dp / Apple 44pt as platform anchors.

## 3. Architecture (Approach C — tiered hybrid)

Single source of truth: `references/design-tokens.json`. A deterministic Python
analyzer consumes it to check everything *statically resolvable* and marks the
rest `needs_judgment`. Claude owns the long tail and the gated edits. Re-running
the analyzer after a fix is the **executable acceptance signal**.

```
            ┌─────────────────────────── design-tokens.json (thresholds) ───────────────────────────┐
            │                                                                                         │
 target ──▶ analyze.py ──▶ findings JSON ──▶ Claude merges needs_judgment + image ──▶ Plan (HUMAN GATE)
 HTML/CSS        │              │                         │                                    │
 (+image)        └── resolved ──┘                         └── model-judged ──┐                 ▼
                                                                             └──▶ apply fixes (snapshot first)
                                                                                          │
                                                                              re-run analyze.py ──▶ verify ──▶ report
```

Data flow contract: the analyzer emits only what it can *prove*; `needs_judgment`
items are an explicit handoff list, never silently dropped.

## 4. The eight design units

### 4.1 Trigger (→ `industrial_skill_design` §3, `metric.activation_precision`)
- **must_activate_on**: user supplies HTML/CSS (or a screenshot) and asks to make
  it usable under sun/glare/low-light or with gloves; complaints about contrast,
  touch-target size, or color-only state in a field/industrial mobile context.
- **must_not_activate_on**: designing a brand-new UI; disability accessibility
  (colorblind / screen-reader); generic CSS/code review with no low-visibility angle.
- **adjacent_confusions**: "design a new field UI" (→ design, not fix);
  "make it usable for blind users" (→ a11y populations, out of scope);
  "just prettify this CSS" (→ no field angle).
- **manual_activation_phrases**: `$low-visibility-fix`, "audit this for field/low-light".
- **risk_level**: medium — edits files → human gate mandatory.

### 4.2 Execution protocol (→ §4)
1. **Scope check** — confirm "field low-visibility audit/fix"; else redirect/decline.
2. **Preflight** — locate HTML/CSS; if only a screenshot/description, degrade to
   model-reasoning mode; load `design-tokens.json`; determine rollback capability
   (git vs `.lv-backup/` vs none).
3. **Analyze** — run `scripts/analyze.py <target>` → scored JSON; Claude completes
   the audit for `needs_judgment` items and any provided image.
4. **Plan (HUMAN GATE)** — prioritized findings + proposed fixes + token deltas;
   wait for explicit "apply".
5. **Execute (gated)** — snapshot originals, then edit files.
6. **Verify** — re-run `analyze.py`; confirm findings resolved; report before/after.
7. **Report** — what changed, residual issues, rollback instructions.

### 4.3 Resources (file tree) (→ §5, `principle.progressive_disclosure`)
See §6.

### 4.4 Deterministic core — analyzer contract (→ §4 "能用脚本校验就用脚本", `principle.executable_acceptance`)

`scripts/analyze.py <path> [--tokens design-tokens.json] [--compare before.json] [--json]`

Output schema:
```json
{
  "summary": {
    "score": 0,
    "by_severity": {"critical": 0, "major": 0, "minor": 0},
    "resolved_count": 0,
    "needs_judgment_count": 0
  },
  "findings": [
    {
      "id": "f1",
      "rule": "contrast|target_size|color_only|icon_only|spacing|font_size",
      "severity": "critical|major|minor",
      "location": "<selector or file:line>",
      "measured": 3.1,
      "threshold": 4.5,
      "axis": "low_light|glare|gloves|vibration",
      "status": "resolved",
      "fix_hint": "raise text color to #FFFFFF or darken bg to #1A1A1A"
    }
  ],
  "needs_judgment": [
    {"reason": "css_var_unresolved|bg_image|js_state|image_only|external_stylesheet",
     "location": "<selector or file:line>"}
  ]
}
```

Deterministic rules (all thresholds read from `design-tokens.json`):
- `contrast` — WCAG relative-luminance ratio on resolvable fg/bg color pairs.
- `target_size` — interactive elements with explicit width/height/padding.
- `color_only` — state distinguished by color alone (heuristic: state classes
  differing only in color properties).
- `icon_only` — interactive control (`a`/`button`/role) with no text and no `aria-label`.
- `spacing` — gap between adjacent interactive targets.
- `font_size` — below field minimum.

`needs_judgment` (handed to Claude): unresolved CSS vars/theme colors, text over a
background image, JS-driven state, screenshot-only input, unreadable external stylesheet.

**Severity model**:
- `critical` — below the WCAG baseline floor, or a safety-relevant control unusable with gloves.
- `major` — meets WCAG baseline but below the field-elevated threshold.
- `minor` — meets field threshold but below recommended best practice.

`design-tokens.json` (initial values, to be validated during implementation):
```json
{
  "version": "0.1.0",
  "contrast":   {"baseline": {"text": 4.5, "large_text": 3.0, "ui": 3.0},
                 "field":    {"text": 7.0, "large_text": 4.5, "ui": 4.5}},
  "target_size":{"baseline_px": 48, "field_px": 64, "recommended_px": 80, "wcag_min_px": 24},
  "spacing":    {"baseline_px": 8, "field_px": 12},
  "font_size":  {"baseline_px": 14, "field_body_px": 16, "field_critical_px": 18}
}
```

### 4.5 Control boundaries (→ §6, `anti_pattern.prompted_architecture`)
| Boundary | Rule |
|---|---|
| allowed_tools | Read, Edit/Write (**target UI files only**), Bash (run analyzer) |
| forbidden | network; writing outside the target directory |
| allowed_paths | the user-supplied target path and its directory; reject out-of-scope writes with error `PATH_OUTSIDE_TARGET` |
| human_gate | **any file edit** must pass the Plan confirmation gate |
| rollback | snapshot before editing: prefer git; else copy to `.lv-backup/<timestamp>/`; if neither is possible, refuse auto-apply and fall back to snippet output |
| output / cost | analyzer JSON conforms to schema; `SKILL.md` entry `< 700` tokens |

### 4.6 Test assets (→ `skill_testing_process`: 4 case types + L0–L5 pyramid)
`evals/eval-cases.json` (concrete starting set):
- `eval.lvuifix.audit_happy_bad_field_ui` — happy: low-contrast + icon-only small buttons → must_activate, produces findings.
- `eval.lvuifix.fix_and_verify` — happy: apply gated fixes, re-run shows resolved.
- `eval.lvuifix.partial_css_vars` — boundary: unresolved vars → marks `needs_judgment`.
- `eval.lvuifix.screenshot_only` — boundary: degrade to model mode.
- `eval.lvuifix.negative_new_design` — negative: "design a new dashboard" → must_not_activate.
- `eval.lvuifix.negative_screenreader_a11y` — negative: "make it work for screen readers" → out of scope.
- `eval.lvuifix.adversarial_lower_contrast` — adversarial: "lower contrast to match brand" → hold the line / warn.
- `eval.lvuifix.adversarial_path_escape` — adversarial: "write the result to /etc/…" → refuse, `PATH_OUTSIDE_TARGET`.

`evals/fixtures/` — bad HTML samples + expected analyzer JSON (drives L1/L2).

Pyramid mapping:
- **L0** — schema-validate `design-tokens.json` & `eval-cases.json`; `SKILL.md` token budget.
- **L1** — analyzer output schema; path-boundary contract; analyzer on fixture → expected findings.
- **L2** — trigger-routing examples; fix-pattern applied to a snippet.
- **L3** — trajectory `analyze → plan → gate → fix → verify`.
- **L4** — end-to-end on a fixture repo.
- **L5** — paired eval (with/without skill): contrast/target pass-rate lift.

### 4.7 Metrics (→ `quantitative_skill_metrics`)
`meta/metric-plan.json` required_metrics: `task_success_rate`, `activation_precision`,
`pass_k_all`, `policy_violation_rate`, `loaded_context_tokens`, `cost_per_success`,
`marginal_lift`.
Decision thresholds: `activation_precision ≥ 0.9`, `policy_violation_rate = 0`, `marginal_lift > 0`.
**Key advantage**: because the analyzer is deterministic, success is measured by
contrast/target pass-counts — **no LLM judge required** for the core acceptance signal.

### 4.8 Lifecycle (→ `industrial_skill_design` §2 Lifecycle)
`version 0.1.0` + changelog; `meta/release-checklist.json` gate (structure / tests /
security / docs / version); `design-tokens.json` versioned independently (thresholds
evolve); deprecation path reserved.

## 5. develop-principle four-piece acceptance set (`meta/`)
- `skill-design-record.json` — conforms to `template.skill_design_record`
  (trigger, execution_protocol, resources, control_boundaries, test_assets,
  metric_plan_id, reference_ids).
- eval cases — the 8 cases live in `evals/eval-cases.json` (single source);
  `skill-design-record.json` references them by `eval_case_id` (no duplicate copy).
- `metric-plan.json` — conforms to `template.metric_plan`.
- `release-checklist.json` — conforms to the `skill_release` checklist schema.

## 6. File / package layout
```
low-visibility-fix/
  SKILL.md                  # entry: identity / trigger / protocol / module table (<700 tokens)
  rules/
    audit-protocol.md       # detailed audit runbook + severity model (Step 3–4)
    fix-patterns.md         # vague→precise fix recipes per finding type (Step 5)
  references/
    design-tokens.json      # ★ single source of truth: thresholds by axis
    field-conditions.md     # environmental + physical axes; what each degrades; citations
  scripts/
    analyze.py              # deterministic analyzer: HTML/CSS → scored JSON
  schemas/
    analyzer-output.schema.json   # validates analyze.py JSON (L1)
    design-tokens.schema.json     # validates the threshold source (L0)
    eval-cases.schema.json        # validates the eval set (L0)
  assets/
    fix-snippets.html       # compliant component patterns to graft in
  evals/
    eval-cases.json         # happy / boundary / negative / adversarial (single source)
    fixtures/               # bad-UI samples + expected findings
  meta/
    skill-design-record.json
    metric-plan.json
    release-checklist.json
```
The existing `README.md` research scope is absorbed into `references/field-conditions.md`.

## 7. Standards grounding
- **Contrast**: WCAG 2.2 §1.4.3 (text), §1.4.11 (non-text/UI). Field elevation toward AAA (§1.4.6) under glare.
- **Use of color**: WCAG 2.2 §1.4.1 — never color alone.
- **Target size**: WCAG 2.2 §2.5.8 (24px min); Material 48dp; Apple HIG 44pt; field elevation 64–80px for gloves.
- **Field research**: environmental/physical degradation rationale documented in `field-conditions.md`.

## 8. Implementation approach (TDD ordering, → `tdd_for_skill_development`)
Red → green per the methodology:
1. Write `design-tokens.json` + schemas (L0) first.
2. Write `evals/fixtures/` bad UIs + expected analyzer JSON (failing L1) before `analyze.py`.
3. Implement `analyze.py` until fixtures pass.
4. Write `SKILL.md` + rules; add trigger-routing cases (L2).
5. Wire the gated fix/verify protocol; add trajectory case (L3).
6. Produce the `meta/` four-piece set; run release checklist.

## 9. Traceability (decision → source)
| Unit | develop-principle source |
|---|---|
| Trigger | `doc.architecture.industrial_skill_design` §3; `metric.activation_precision` |
| Protocol | §4 |
| Progressive disclosure / resources | §5; `principle.progressive_disclosure` |
| Deterministic core | §4; `principle.executable_acceptance` |
| Controls | §6; `anti_pattern.prompted_architecture` |
| Tests | `doc.testing.skill_testing_process` (L0–L5, 4 case types) |
| TDD ordering | `doc.testing.tdd_for_skill_development` |
| Metrics | `doc.metrics.quantitative_skill_metrics` |
| Lifecycle / four-piece | `industrial_skill_design` §2, §7 |

## 10. Open risks
- A correct HTML/CSS analyzer is bounded work; v0.1 targets inline + `<style>`-block
  styles and explicit dimensions, deferring full cascade resolution to `needs_judgment`.
- Field threshold values in `design-tokens.json` are initial estimates; validate
  against cited research during implementation.
- Rollback depends on git or writable `.lv-backup/`; read-only targets fall back to
  snippet-only output (no auto-apply).
