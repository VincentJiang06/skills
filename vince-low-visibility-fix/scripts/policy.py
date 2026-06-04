"""Contrast-change safety policy for field-critical controls.

The skill refuses to RECOMMEND lowering a field-critical control's contrast below
the field threshold — under glare/low light that is a readability regression, not
a style choice. It still offers a brand-respecting compliant alternative.
"""

CRITICAL = {"field_critical", "critical", "primary_action", "safety", "high"}


def contrast_change_verdict(requested_ratio, control_criticality, tokens):
    field = tokens["contrast"]["field"]["text"]
    crit = str(control_criticality).lower() in CRITICAL
    if crit and requested_ratio < field:
        return {
            "verdict": "refuse",
            "min_allowed": field,
            "reason": (f"{requested_ratio}:1 is below the field threshold {field}:1 "
                       f"for a field-critical control; under glare/low light this is "
                       f"a readability regression."),
            "alternative": (f"keep the brand hue but raise contrast to >= {field}:1 "
                            f"by shifting lightness/saturation (not hue)."),
        }
    return {"verdict": "allow", "min_allowed": field,
            "reason": f"{requested_ratio}:1 meets the field threshold {field}:1."}
