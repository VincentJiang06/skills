---
name: low-visibility-field-worker-ui
description: Design and review mobile UIs for field workers in low-visibility noisy or gloved conditions. Use for construction warehouse inspection or maintenance mobile UI design and audit. Based on Multisensory Certainty design philosophy.
---

# Low-Visibility Field Worker Mobile UI

Design and audit mobile UIs for field workers in degraded conditions:
low visibility, noise, gloves, one-handed operation, time pressure.

## Philosophy

Multisensory Certainty (多感官确定性): Every critical action must create
certainty through visual, haptic, and audio channels simultaneously, so
workers can complete tasks even when they cannot see clearly, hear fully,
or tap precisely.

The UI is a **field controller**, not a form. It must be:
- Perceivable (visible + touchable + audible)
- Operable (large targets, stable positions, minimal gestures)
- Understandable (field language, short labels, icon + text)
- Robust (readback, undo, offline support, multi-channel feedback)

## When to Use This Skill

Trigger this skill when the task involves:
- Designing a mobile UI for field/industrial workers
- Auditing an existing mobile app for field usability
- Generating HTML/CSS components for low-visibility mobile screens
- Applying accessibility standards to mobile field applications
- Any request mentioning: field worker, construction, warehouse, inspection,
  maintenance, gloves, low visibility, noisy environment, industrial mobile UI

## Core Workflow

### Design Mode

To design a new field worker mobile UI:

1. **Load design tokens** — Read `references/design-tokens.yaml` for
   machine-readable sizing, contrast, typography, and feedback values.
   For a quick numeric reference, also read `rules/design-tokens-quickref.md`.

2. **Understand the task** — Determine what single decision the worker
   needs to make on this screen (one screen = one decision).

3. **Apply the 12 principles (G0-G11)** from `references/design-guidelines.md`:
   - G0: Default to low visibility (dark, high-contrast theme first)
   - G1: One decision per screen
   - G2: Large buttons (64-80dp), cards (72-96dp), spacing (8-12dp)
   - G3: Stable layout for spatial memory
   - G4: Synchronized visual + haptic + audio feedback
   - G5: No single-sense dependency (color alone, icon alone, sound alone)
   - G6: Confirm selection before submitting
   - G7: Isolate dangerous actions on separate screens
   - G8: Use field task language (verbs first, no system jargon)
   - G9: Readback before submit, result with undo after submit
   - G10: Settings must be field-adjustable (font, theme, handedness)
   - G11: Test under real field conditions

4. **Select components** from `references/design-guidelines.md` Section 6
   and `assets/component-templates.html`:
   - Task Header — tells worker current task and location
   - Option Cards (2-4) — large, icon+text+checkmark, full-card clickable
   - Bottom Action Bar — fixed back/undo + confirm, supports handedness
   - Readback Bar — confirms current selection before submit
   - Safety Confirmation Page — long-press for dangerous actions
   - Error Banner — action instruction, not just "Invalid"
   - Success Screen — summary + undo + next
   - Offline Badge — text, never spinner-only

5. **Design the flow** — maximum 3 levels deep. Simple selection flow:
   `show task → select card → readback → confirm → result with undo`

6. **Add feedback** — map each user event to visual + haptic + audio
   using the feedback matrix in `references/design-tokens.yaml` Section 7.

7. **Add accessibility** — all controls need label, role, value/state.
   Support text scaling 70-400%, 4+ color themes, handedness.

8. **Check anti-patterns** — read `rules/anti-patterns.md` and verify
   none of the listed patterns appear in the design.

### Audit Mode

To audit an existing UI, load `rules/audit-mode.md`.

### Research Mode

To understand the academic foundation, load `rules/research-mode.md`.

## Modules

Rules files are loaded based on the current task mode. The following
modules conditionally extend the skill:

| File | When to Load |
|------|-------------|
| `rules/design-tokens-quickref.md` | Always — numeric quick reference for sizing, contrast, typography |
| `rules/anti-patterns.md` | Always — checklist of patterns that must not appear in any design |
| `rules/audit-mode.md` | Only when auditing or checking an existing UI |
| `rules/research-mode.md` | Only when the user asks about research, academic foundations, or citations |
| `rules/eval-interpretation.md` | Only when running the evaluator or interpreting eval output |

## Non-Negotiable Rules

When designing or auditing, these must never be violated:

1. **NN-01**: No icon-only critical controls — always pair with text
2. **NN-02**: No color-only state indication — use color + icon + text + shape
3. **NN-03**: Every critical action needs visual + haptic + audio feedback
4. **NN-04**: Dangerous actions must be on separate screens, isolated from normal buttons
5. **NN-05**: All touch targets ≥ 48x48dp (Android) / 44x44pt (iOS); field recommended 64-80dp
6. **NN-06**: No dense multi-field forms for primary field workflow
7. **NN-07**: Every confirmable action must offer undo or modify

## Bundled Resources

### References (load as needed)

| File | When to Load |
|------|-------------|
| `references/design-tokens.yaml` | Always — the machine-readable source of truth for all sizing, contrast, typography, and feedback values |
| `references/design-guidelines.md` | When designing new screens or needing detailed component specs, flow templates, and anti-pattern lists |
| `references/research-bibliography.yaml` | When needing academic citations or understanding the research foundation for design decisions |

### Scripts

| File | Usage |
|------|-------|
| `scripts/eval_runner.py` | Run compliance audit: `python scripts/eval_runner.py --input <file.html> [--json]` |

### Assets

| File | Usage |
|------|-------|
| `assets/component-templates.html` | Reference for compliant component HTML/CSS. Contains 6 templates: task flow, safety confirmation, error banner, success screen, offline badge, handedness support. Can be used as copy-paste starting point. |
