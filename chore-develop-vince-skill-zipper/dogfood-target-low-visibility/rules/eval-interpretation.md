# Eval Output Interpretation Guide

How to interpret the output of `python scripts/eval_runner.py --input <file.html>`.

## Result Levels

| Level | Meaning | Action Required |
|-------|---------|-----------------|
| **PASS** | Check passed | None |
| **FAIL** | Mandatory violation | Must fix before the UI can be considered compliant. A single FAIL means the audit is not passed. |
| **WARNING** | Advisory concern | Review each WARNING individually. Safety-related WARNINGs (DANGER-01, UNDO-01, FEED-01) must be fixed. Cosmetic/sizing WARNINGs at boundary values are acceptable if justified by the specific field context. |

## Fix Prioritization

When multiple failures exist, fix in this order:

1. **Safety first**: DANGER-01, UNDO-01 (dangerous actions, undo support)
2. **Feedback**: FEED-01 (multi-channel feedback for critical actions)
3. **Touch targets**: TOUCH-01, TOUCH-02 (minimum touch areas)
4. **Contrast/visibility**: CONTRAST-01, COLOR-01, THEME-01
5. **Content**: ICON-01, READ-01, TYPO-01, LANG-01
6. **Layout**: SPACE-01 (spacing between interactive elements)

## Common False Positives

- **SPACE-01 on cards**: Cards with internal padding may flag if the
  evaluator scans the card container rather than its children. Check
  manually that child elements are well-spaced.
- **READ-01 on readback**: The evaluator checks for aria-live regions.
  If the readback is implemented via visible text (not aria-live), it
  may still be usable in practice but will flag. Prefer aria-live="polite"
  for compliance.
- **CONTRAST-01 on gradients**: Gradient backgrounds may produce false
  contrast readings. Verify manually with a contrast checker.

## Exit Code

- **0**: All mandatory checks passed (no FAIL items)
- **1**: One or more FAIL items detected
