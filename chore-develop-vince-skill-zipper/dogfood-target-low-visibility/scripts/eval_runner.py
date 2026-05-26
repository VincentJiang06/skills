#!/usr/bin/env python3
"""
eval_runner.py — Low-Visibility Field Worker Mobile UI Compliance Evaluator

Evaluates HTML UI components against the Multisensory Certainty design
tokens. Checks touch targets, contrast, feedback, accessibility, and
non-negotiables. Generates a pass/fail/warning report.

Usage:
    python eval_runner.py --input component.html [--tokens design-tokens.yaml] [--json]

Output:
    Text report (default) or JSON report (--json) with:
    - Overall pass/fail/warning
    - Per-check results with specific violations
    - Fix recommendations

Exit codes:
    0 — all checks passed (or only warnings)
    1 — one or more critical failures
"""

import sys
import os
import re
import json
import math
import argparse
from html.parser import HTMLParser
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# ============================================================
# WCAG Contrast Ratio Calculator
# ============================================================

def hex_to_rgb(hex_color: str) -> Optional[tuple]:
    """Convert hex color to (r, g, b) tuple (0-255)."""
    hex_color = hex_color.strip().lstrip('#')
    if len(hex_color) not in (3, 6):
        # Try to handle rgb() format
        rgb_match = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', hex_color)
        if rgb_match:
            return (int(rgb_match.group(1)), int(rgb_match.group(2)), int(rgb_match.group(3)))
        # Try to handle CSS variables — can't resolve, skip
        return None

    if len(hex_color) == 3:
        hex_color = ''.join(c*2 for c in hex_color)

    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return None

def relative_luminance(rgb: tuple) -> float:
    """Calculate relative luminance per WCAG 2.2."""
    def channel(c):
        s = c / 255.0
        return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = channel(rgb[0]), channel(rgb[1]), channel(rgb[2])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(color1: str, color2: str) -> Optional[float]:
    """Calculate WCAG contrast ratio between two colors."""
    rgb1 = hex_to_rgb(color1)
    rgb2 = hex_to_rgb(color2)
    if not rgb1 or not rgb2:
        return None
    l1 = relative_luminance(rgb1)
    l2 = relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

# ============================================================
# CSS Property Extractor
# ============================================================

class CSSPropertyExtractor:
    """Extract computed CSS properties from <style> blocks and inline styles."""

    def __init__(self):
        self.style_rules = {}  # selector -> {property: value}
        self.custom_properties = {}  # --name: value (from :root)

    def parse_css(self, css_text: str):
        """Parse CSS text and extract property-value pairs for each selector."""
        # Remove comments
        css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)

        # Split by rule blocks
        blocks = re.findall(r'([^{]+)\{([^}]+)\}', css_text)
        for selector_block, properties_block in blocks:
            selectors = [s.strip() for s in selector_block.split(',')]
            props = {}
            for prop_line in properties_block.split(';'):
                prop_line = prop_line.strip()
                if ':' in prop_line:
                    key, val = prop_line.split(':', 1)
                    key = key.strip()
                    val = val.strip()
                    props[key] = val
            for sel in selectors:
                if sel == ':root':
                    # Store CSS custom properties
                    for k, v in props.items():
                        if k.startswith('--'):
                            self.custom_properties[k] = v
                if sel not in self.style_rules:
                    self.style_rules[sel] = {}
                self.style_rules[sel].update(props)

    def resolve_value(self, value: str) -> str:
        """Resolve var() references in a CSS value."""
        def resolve_var(match):
            var_name = match.group(1)
            if var_name in self.custom_properties:
                return self.resolve_value(self.custom_properties[var_name])
            return match.group(0)
        return re.sub(r'var\(([^)]+)\)', resolve_var, value)

    def get_rule_for(self, selector: str) -> dict:
        """Get CSS properties for a specific selector.

        Supports:
        - Exact match: '.btn'
        - Compound selector fallback: '.state-dot.normal' matches query '.normal'
        - Descendant selector fallback: '.alert .btn' matches query '.btn'
        """
        # 1. Exact match
        if selector in self.style_rules:
            return self.style_rules[selector]

        # 2. Compound selector: '.state-dot.normal' should match '.normal'
        for sel, rule in self.style_rules.items():
            # Check if selector ends with the query selector (handles .parent.cls, tag.cls, [attr].cls)
            if sel.endswith(selector) and len(sel) > len(selector):
                # Ensure the preceding char is a selector boundary (not part of a longer class name)
                boundary_char = sel[-len(selector) - 1]
                if boundary_char in ('.', ' ', ':', '['):
                    return rule

        # 3. Descendant selector: '.conditional-alert .btn-resolve' should match '.btn-resolve'
        for sel, rule in self.style_rules.items():
            if (' ' + selector) in sel or ('\t' + selector) in sel or ('>' + selector) in sel:
                return rule

        return {}

    def get_property(self, selector: str, prop: str) -> Optional[str]:
        """Get a specific CSS property for a selector."""
        rule = self.get_rule_for(selector)
        return rule.get(prop)

    def has_css_variable_support(self) -> bool:
        """Check if the CSS includes design token variables."""
        css_text = ' '.join(
            ' '.join(f'{k}:{v}' for k, v in rule.items())
            for rule in self.style_rules.values()
        )
        required_vars = [
            '--touch-min',
            '--touch-recommended-primary',
            '--font-page-title',
            '--color-text-primary',
            '--color-surface',
        ]
        found = sum(1 for v in required_vars if f'var({v})' in css_text or v in css_text)
        return found >= 3  # at least 3 of 5 required vars present

# ============================================================
# HTML Element Model
# ============================================================

@dataclass
class HTMLElement:
    """Simplified HTML element for evaluation."""
    tag: str
    attrs: dict = field(default_factory=dict)
    classes: list = field(default_factory=list)
    text_content: str = ""
    parent: Optional['HTMLElement'] = None
    children: list = field(default_factory=list)
    inline_style: dict = field(default_factory=dict)
    line_number: int = 0

    def has_class(self, cls: str) -> bool:
        return cls in self.classes

    def has_any_class(self, classes: list) -> bool:
        return any(c in self.classes for c in classes)

    def get_attr(self, name: str) -> Optional[str]:
        return self.attrs.get(name)

    def has_attr(self, name: str) -> bool:
        return name in self.attrs

    def is_interactive(self) -> bool:
        """Check if element is an interactive control."""
        if self.tag in ('button', 'a', 'input', 'select', 'textarea'):
            return True
        if self.get_attr('role') in ('button', 'link', 'radio', 'checkbox', 'menuitem', 'tab', 'switch'):
            return True
        if self.get_attr('tabindex') is not None:
            return True
        if self.has_any_class(['btn', 'button', 'option-card', 'clickable']):
            return True
        if self.get_attr('onclick'):
            return True
        return False

    def is_danger_action(self) -> bool:
        """Check if element is a dangerous/destructive action (not a state indicator)."""
        # Option cards with "danger" class are state selections, not dangerous commit actions
        if self.has_class('option-card'):
            return False

        danger_classes = ['btn-danger', 'destructive', 'long-press-confirm']
        danger_texts = ['停机', '删除', '报废', '关闭任务', '解除警报', '确认危险']
        if self.has_any_class(danger_classes):
            return True
        all_text = (self.text_content + ' ' + self.get_all_text()).lower()
        for dt in danger_texts:
            if dt in all_text:
                return True
        return False

    def get_text_stripped(self) -> str:
        return self.text_content.strip()

    def has_text(self) -> bool:
        return bool(self.get_text_stripped())

    def get_all_text(self) -> str:
        """Get all text from this element and its descendants."""
        texts = []
        if self.text_content.strip():
            texts.append(self.text_content.strip())
        for child in self.children:
            child_text = child.get_all_text()
            if child_text:
                texts.append(child_text)
        return ' '.join(texts)

    def has_any_text(self) -> bool:
        """Check if this element or any descendant has text."""
        return bool(self.get_all_text())

    def get_dimensions(self, css_extractor: CSSPropertyExtractor) -> dict:
        """Extract width and height from element's CSS."""
        dims = {}
        # Check inline styles first
        for prop in ('width', 'height', 'min-height', 'min-width', 'padding'):
            if prop in self.inline_style:
                val = self.inline_style[prop]
                px = self._parse_px(val)
                if px is not None:
                    dims[prop] = px

        # Check CSS rules
        for cls in self.classes:
            rule = css_extractor.get_rule_for(f'.{cls}')
            for prop in ('height', 'width', 'min-height', 'min-width', 'padding'):
                if prop not in dims and prop in rule:
                    px = self._parse_px(rule[prop])
                    if px is not None:
                        dims[prop] = px

        return dims

    def get_colors(self, css_extractor: CSSPropertyExtractor) -> dict:
        """Extract foreground and background colors."""
        colors = {}

        # Check inline styles
        for prop in ('color', 'background-color', 'background', 'border-color'):
            if prop in self.inline_style:
                colors[prop] = self.inline_style[prop]

        # Check CSS rules
        for cls in self.classes:
            rule = css_extractor.get_rule_for(f'.{cls}')
            for prop in ('color', 'background-color', 'background', 'border-color'):
                if prop not in colors and prop in rule:
                    colors[prop] = rule[prop]

        return colors

    def get_font_size(self, css_extractor: CSSPropertyExtractor) -> Optional[float]:
        """Extract font size in px."""
        # Inline
        if 'font-size' in self.inline_style:
            return self._parse_px(self.inline_style['font-size'])

        # CSS rules
        for cls in self.classes:
            rule = css_extractor.get_rule_for(f'.{cls}')
            if 'font-size' in rule:
                return self._parse_px(rule['font-size'])

        return None

    @staticmethod
    def _parse_px(value: str, base_font_size: float = 16.0) -> Optional[float]:
        """Parse a CSS value to px if possible.

        Supports: px, dp, rem (1rem = base_font_size px), em (1em = base_font_size px),
        pt (1pt ≈ 1.333px), and plain numbers. % values return None (context-dependent).
        """
        value = value.strip()
        if value.endswith('px'):
            try:
                return float(value[:-2])
            except ValueError:
                return None
        if value.endswith('dp'):
            try:
                return float(value[:-2])
            except ValueError:
                return None
        if value.endswith('rem'):
            try:
                return float(value[:-3]) * base_font_size
            except ValueError:
                return None
        if value.endswith('em'):
            try:
                return float(value[:-2]) * base_font_size
            except ValueError:
                return None
        if value.endswith('pt'):
            try:
                return float(value[:-2]) * 1.333
            except ValueError:
                return None
        # Plain number (some inline styles may omit unit)
        try:
            return float(value)
        except ValueError:
            return None

    def __repr__(self):
        classes = '.'.join(self.classes)
        return f"<{self.tag}.{classes}>"


# ============================================================
# HTML Parser
# ============================================================

class HTMLDocumentParser(HTMLParser):
    """Parse HTML into a tree of HTMLElements."""

    def __init__(self):
        super().__init__()
        self.root = HTMLElement(tag="root")
        self.current = self.root
        self.all_elements = []
        self.style_blocks = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get('class', '').split()

        # Parse inline style
        inline_style = {}
        style_str = attrs_dict.get('style', '')
        if style_str:
            for prop_decl in style_str.split(';'):
                prop_decl = prop_decl.strip()
                if ':' in prop_decl:
                    k, v = prop_decl.split(':', 1)
                    inline_style[k.strip()] = v.strip()

        elem = HTMLElement(
            tag=tag,
            attrs=attrs_dict,
            classes=classes,
            inline_style=inline_style,
            parent=self.current,
            line_number=self.getpos()[0],
        )
        self.current.children.append(elem)
        self.all_elements.append(elem)
        self.current = elem

        if tag == 'style':
            self._in_style = True

    def handle_endtag(self, tag):
        if tag == 'style':
            self._in_style = False
        if self.current.tag == tag and self.current.parent:
            self.current = self.current.parent

    def handle_data(self, data):
        if getattr(self, '_in_style', False):
            self.style_blocks.append(data)
        else:
            if self.current:
                self.current.text_content += data

    def handle_startendtag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get('class', '').split()
        elem = HTMLElement(
            tag=tag,
            attrs=attrs_dict,
            classes=classes,
            parent=self.current,
            line_number=self.getpos()[0],
        )
        self.current.children.append(elem)
        self.all_elements.append(elem)

    def get_interactive_elements(self) -> list:
        return [e for e in self.all_elements if e.is_interactive()]

    def get_elements_by_class(self, cls: str) -> list:
        return [e for e in self.all_elements if e.has_class(cls)]


# ============================================================
# Default Design Tokens (can be overridden via --tokens)
# ============================================================

DEFAULT_TOKENS = {
    "non_negotiables": [
        {"id": "NN-01", "rule": "No icon-only critical controls", "check_type": "icon_only_critical", "severity": "critical"},
        {"id": "NN-02", "rule": "No color-only state indication", "check_type": "color_only_state", "severity": "critical"},
        {"id": "NN-05", "rule": "All touch targets must meet platform minimum", "check_type": "touch_target_minimum", "severity": "critical"},
        {"id": "NN-07", "rule": "Undo/recovery path must exist", "check_type": "missing_undo", "severity": "critical"},
    ],
    "touch_targets": {
        "platform_minimum": {"android": {"width_dp": 48, "height_dp": 48}, "ios": {"width_pt": 44, "height_pt": 44}},
        "industrial_recommended": {"primary_button": {"height_dp": 64}, "option_card": {"height_dp": 72}},
        "spacing": {"min_dp": 8, "preferred_dp": 12},
    },
    "contrast": {"normal_text_min": 4.5, "large_text_min": 3.0, "ui_component_min": 3.0},
    "typography": {
        "option_label": {"min_sp": 20},
        "button_label": {"min_sp": 18},
    },
    "color_semantics": {"requires_multi_channel": True},
    "anti_patterns": [
        "Small icon-only buttons",
        "Color as the only state indicator",
        "Select-to-submit without confirmation",
        "Dangerous button adjacent to normal button",
        "Low-contrast gray text",
        "Spinner as the only offline feedback",
    ],
    "feedback_matrix": {
        "principle": "Visual, haptic, and audio must be congruent and synchronized",
    },
    "layout": {"max_navigation_depth": 3},
}

# ============================================================
# Evaluation Engine
# ============================================================

@dataclass
class CheckResult:
    check_id: str
    check_name: str
    status: str  # "pass", "fail", "warning"
    severity: str  # "critical", "major", "minor", "info"
    message: str
    details: list = field(default_factory=list)
    recommendations: list = field(default_factory=list)


class EvalEngine:
    """Evaluate HTML against design tokens."""

    def __init__(self, tokens: dict = None):
        self.tokens = tokens or DEFAULT_TOKENS
        self.results: list[CheckResult] = []

    def add_result(self, result: CheckResult):
        self.results.append(result)

    def evaluate(self, html_path: str) -> list[CheckResult]:
        """Run all checks on an HTML file."""
        self.results = []

        # Parse HTML
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        parser = HTMLDocumentParser()
        parser.feed(html_content)

        # Parse CSS
        css_extractor = CSSPropertyExtractor()
        for style_block in parser.style_blocks:
            css_extractor.parse_css(style_block)

        interactive = parser.get_interactive_elements()
        all_elems = parser.all_elements

        # Run checks
        self._check_touch_targets(interactive, css_extractor)
        self._check_spacing(interactive, css_extractor)
        self._check_contrast(all_elems, css_extractor)
        self._check_color_only_state(all_elems, css_extractor)
        self._check_icon_only_controls(interactive)
        self._check_feedback_mechanisms(interactive)
        self._check_dangerous_action_isolation(interactive, css_extractor)
        self._check_label_length_and_verbs(interactive)
        self._check_readback_mechanism(all_elems)
        self._check_undo_recovery(all_elems)
        self._check_theme_support(css_extractor)
        self._check_non_negotiables(all_elems, interactive, css_extractor)

        return self.results

    # ---- Individual Checks ----

    def _check_touch_targets(self, interactive: list, css: CSSPropertyExtractor):
        min_h = self.tokens["touch_targets"]["platform_minimum"]["android"]["height_dp"]
        min_w = self.tokens["touch_targets"]["platform_minimum"]["android"]["width_dp"]

        violations = []
        passed = 0
        total = 0

        for elem in interactive:
            if elem.tag in ('input', 'select') and elem.get_attr('type') in ('checkbox', 'radio'):
                continue  # skip small form controls — checked separately
            total += 1
            dims = elem.get_dimensions(css)
            h = dims.get('min-height') or dims.get('height')
            w = dims.get('min-width') or dims.get('width')

            if h is not None and h < min_h:
                violations.append(f"{elem.tag}.{'.'.join(elem.classes)}: height={h}px < {min_h}px minimum")
            elif w is not None and w < min_w:
                violations.append(f"{elem.tag}.{'.'.join(elem.classes)}: width={w}px < {min_w}px minimum")
            else:
                passed += 1

        if total == 0:
            self.add_result(CheckResult(
                "TOUCH-01", "Touch Target Size",
                "info", "info",
                "No interactive elements found to check touch targets.",
            ))
            return

        if violations:
            self.add_result(CheckResult(
                "TOUCH-01", "Touch Target Size",
                "fail", "critical",
                f"{len(violations)}/{total} interactive elements below minimum touch target ({min_w}x{min_h}px)",
                details=violations,
                recommendations=[f"Set min-height and min-width to at least {min_w}x{min_h}px on all interactive elements."],
            ))
        else:
            self.add_result(CheckResult(
                "TOUCH-01", "Touch Target Size",
                "pass", "info",
                f"All {passed} interactive elements meet minimum touch target size ({min_w}x{min_h}px).",
            ))

    def _check_spacing(self, interactive: list, css: CSSPropertyExtractor):
        min_spacing = self.tokens["touch_targets"]["spacing"]["min_dp"]

        containers_with_gap = []
        containers_below_min = []

        # Check ALL parent containers of interactive elements for gap values
        for elem in interactive:
            if elem.parent:
                parent = elem.parent
                for pcls in parent.classes:
                    rule = css.get_rule_for(f'.{pcls}')
                    if 'gap' in rule:
                        gap_px = elem._parse_px(css.resolve_value(rule['gap']))
                        if gap_px is not None:
                            if gap_px >= min_spacing:
                                containers_with_gap.append(f".{pcls} (gap={gap_px}px)")
                            else:
                                containers_below_min.append(
                                    f".{pcls} gap={gap_px}px in '{parent.get_text_stripped()[:20]}' (need ≥{min_spacing}px)"
                                )

        # Check CSS rules for ALL selectors (not just known containers)
        for sel, rule in css.style_rules.items():
            if 'gap' in rule:
                gap_px = elem._parse_px(css.resolve_value(rule['gap'])) if interactive else None
                if gap_px is None:
                    gap_val = css.resolve_value(rule['gap'])
                    try:
                        gap_px = float(gap_val.replace('px', '').replace('dp', '').strip())
                    except (ValueError, AttributeError):
                        continue
                if gap_px is not None and gap_px >= min_spacing:
                    if sel not in [c.split(' ')[0] for c in containers_with_gap]:
                        containers_with_gap.append(f"{sel} (gap={gap_px}px)")

        # Check margin on interactive elements
        margin_issues = []
        margin_ok = False
        for elem in interactive:
            for prop in ('margin', 'margin-bottom', 'margin-top', 'marginLeft', 'marginRight'):
                if prop in elem.inline_style:
                    m = elem._parse_px(elem.inline_style[prop])
                    if m is not None and m >= min_spacing:
                        margin_ok = True

        # Report result
        if containers_below_min:
            self.add_result(CheckResult(
                "SPACE-01", "Element Spacing",
                "warning", "major",
                f"{len(containers_below_min)} container(s) have gap below minimum {min_spacing}px.",
                details=containers_below_min,
                recommendations=[f"Set gap to at least {min_spacing}px on all interactive containers."],
            ))
        elif containers_with_gap or margin_ok:
            self.add_result(CheckResult(
                "SPACE-01", "Element Spacing",
                "pass", "info",
                f"Adequate spacing detected: {len(containers_with_gap)} containers with gap≥{min_spacing}px.",
            ))
        else:
            self.add_result(CheckResult(
                "SPACE-01", "Element Spacing",
                "warning", "major",
                f"No explicit spacing ≥ {min_spacing}px detected. Add gap or margin to interactive containers.",
                recommendations=[f"Use gap: {min_spacing}px on flex containers or margin: {min_spacing}px on interactive elements."],
            ))

    def _check_contrast(self, all_elems: list, css: CSSPropertyExtractor):
        min_normal = self.tokens["contrast"]["normal_text_min"]

        low_contrast = []
        for elem in all_elems:
            if not elem.has_text():
                continue
            # Get element color info
            colors = elem.get_colors(css)
            fg = colors.get('color')
            # Try to determine background
            bg = colors.get('background-color') or colors.get('background')

            if fg and bg:
                ratio = contrast_ratio(fg, bg)
                if ratio is not None and ratio < min_normal:
                    # Check if large text
                    font_size = elem.get_font_size(css)
                    is_large = font_size and font_size >= 18
                    min_required = self.tokens["contrast"]["large_text_min"] if is_large else min_normal
                    if ratio < min_required:
                        low_contrast.append(f"{elem.tag}: '{elem.get_text_stripped()[:30]}' — ratio={ratio:.1f}:1 (need ≥{min_required}:1)")

        if low_contrast:
            self.add_result(CheckResult(
                "CONTRAST-01", "Text Contrast Ratio",
                "fail", "critical",
                f"{len(low_contrast)} text elements below minimum contrast ratio.",
                details=low_contrast,
                recommendations=["Use higher contrast color pairs. For normal text, background:foreground ratio must be ≥4.5:1."],
            ))
        else:
            self.add_result(CheckResult(
                "CONTRAST-01", "Text Contrast Ratio",
                "pass", "info",
                "All text elements have adequate contrast (verified where colors could be resolved).",
            ))

    def _check_color_only_state(self, all_elems: list, css: CSSPropertyExtractor):
        """
        Check that state indicators use multiple channels (color + text/icon/shape),
        not color alone.
        """
        state_classes = {'normal', 'abnormal', 'danger', 'completed', 'offline', 'selected',
                         'error', 'success', 'warning', 'online', 'synced',
                         'status-normal', 'status-abnormal', 'status-danger'}

        color_only_issues = []
        for elem in all_elems:
            state_cls = [c for c in elem.classes if c in state_classes]
            if not state_cls:
                continue

            # Check: does the element have text, aria, or icon child?
            has_text = elem.has_any_text()
            has_aria = elem.has_attr('aria-checked') or elem.has_attr('aria-selected') or elem.has_attr('aria-label')
            has_icon_child = any('icon' in c for child in elem.children for c in child.classes)

            # Does the CSS rule for the state-only class set ONLY color properties?
            for sc in state_cls:
                rule = css.get_rule_for(f'.{sc}')
                if not rule:
                    continue
                non_color_props = [k for k in rule.keys()
                                  if k not in ('color', 'background-color', 'background',
                                                'background-image', 'border-color', 'opacity',
                                                'transform', 'transition')]
                if not non_color_props:
                    # CSS rule only changes colors — must have text or icon to compensate
                    if not has_text and not has_aria and not has_icon_child:
                        color_only_issues.append(
                            f".{sc} on {elem.tag}.{'.'.join(elem.classes)}: "
                            f"CSS changes only color, element has no text/aria/icon child"
                        )

        if color_only_issues:
            self.add_result(CheckResult(
                "COLOR-01", "No Color-Only State",
                "fail", "critical",
                f"{len(color_only_issues)} state indicator(s) rely on color alone without text or icon.",
                details=color_only_issues,
                recommendations=["Always pair color state changes with text label, icon element, or aria attribute."],
            ))
        else:
            self.add_result(CheckResult(
                "COLOR-01", "No Color-Only State",
                "pass", "info",
                "State indicators include multiple channels (color + text/icon/aria).",
            ))

    def _check_icon_only_controls(self, interactive: list):
        """Check for critical controls that are icon-only (no text label anywhere)."""
        icon_only = []
        for elem in interactive:
            # Check both direct text and descendant text
            direct_text = elem.get_text_stripped()
            all_text = elem.get_all_text()
            aria_label = elem.get_attr('aria-label') or elem.get_attr('aria-labelledby') or elem.get_attr('title')

            # Skip elements that are not truly interactive in context (e.g. containers)
            if elem.tag == 'div' and elem.get_attr('role') != 'button':
                continue

            if not all_text and not aria_label:
                icon_only.append(f"{elem.tag}.{'.'.join(elem.classes)} at line {elem.line_number}")

        if icon_only:
            self.add_result(CheckResult(
                "ICON-01", "No Icon-Only Controls",
                "fail", "critical",
                f"{len(icon_only)} interactive elements found without text label.",
                details=icon_only,
                recommendations=["Add visible text labels OR aria-label to all interactive controls. Never rely on icons alone."],
            ))
        else:
            self.add_result(CheckResult(
                "ICON-01", "No Icon-Only Controls",
                "pass", "info",
                "All interactive controls have text labels or aria-labels.",
            ))

    def _check_feedback_mechanisms(self, interactive: list):
        """Check for feedback indicators: data-haptic, data-sound, aria-live."""
        has_haptic = has_sound = has_aria_live = 0
        total = len(interactive)

        for elem in interactive:
            if elem.has_attr('data-haptic'):
                has_haptic += 1
            if elem.has_attr('data-sound'):
                has_sound += 1

        # Check for aria-live regions in all elements
        for elem in interactive:
            if elem.get_attr('aria-live') in ('polite', 'assertive'):
                has_aria_live += 1

        feedback_count = sum([has_haptic > 0, has_sound > 0, has_aria_live > 0])

        if feedback_count >= 2 and has_haptic > 0:
            self.add_result(CheckResult(
                "FEED-01", "Multi-Channel Feedback",
                "pass", "info",
                f"Multi-channel feedback detected: haptic={has_haptic}, sound={has_sound}, aria-live={has_aria_live}.",
            ))
        elif feedback_count >= 1:
            self.add_result(CheckResult(
                "FEED-01", "Multi-Channel Feedback",
                "warning", "major",
                f"Only {feedback_count}/3 feedback channels detected. Critical actions require at least 2.",
                recommendations=["Add data-haptic attributes for haptic feedback, data-sound for audio, and aria-live for screen reader announcements."],
            ))
        else:
            self.add_result(CheckResult(
                "FEED-01", "Multi-Channel Feedback",
                "fail", "critical",
                "No feedback mechanisms detected. Critical actions MUST have visual + haptic + audio confirmation.",
                recommendations=["Add data-haptic, data-sound, and aria-live attributes to interactive elements."],
            ))

    def _check_dangerous_action_isolation(self, interactive: list, css: CSSPropertyExtractor):
        """Check that dangerous/destructive actions are isolated from normal ones."""
        danger_elems = [e for e in interactive if e.is_danger_action()]
        normal_elems = [e for e in interactive if not e.is_danger_action()]

        if not danger_elems:
            self.add_result(CheckResult(
                "DANGER-01", "Dangerous Action Isolation",
                "pass", "info",
                "No dangerous action elements detected — isolation check not applicable.",
            ))
            return

        # Check if danger elements share parent with normal interactive elements
        adjacency_issues = []
        for de in danger_elems:
            if de.parent:
                siblings = de.parent.children
                for sib in siblings:
                    if sib is de:
                        continue
                    if sib.is_interactive() and not sib.is_danger_action():
                        # Check if this sibling is separated by the danger isolation margin
                        margin_str = sib.inline_style.get('margin-bottom', sib.inline_style.get('margin', '0'))
                        margin_px = de._parse_px(margin_str) or 0

                        # Also check if distance between elements is implied by parent gap
                        parent_gap = 0
                        if de.parent:
                            for pc in de.parent.classes:
                                rule = css.get_rule_for(f'.{pc}')
                                if 'gap' in rule:
                                    gap_val = css.resolve_value(rule['gap'])
                                    try:
                                        parent_gap = float(gap_val.replace('px', '').replace('dp', '').strip())
                                    except (ValueError, AttributeError):
                                        pass

                        isolation = max(margin_px, parent_gap)
                        if isolation < 16:
                            de_text = de.get_all_text() or de.get_text_stripped() or de.tag
                            sib_text = sib.get_all_text() or sib.get_text_stripped() or sib.tag
                            adjacency_issues.append(
                                f"Danger '{de_text[:20]}' near normal '{sib_text[:20]}' "
                                f"(isolation={isolation}px, need ≥16px)"
                            )

        # Also check: danger elements should use .safety-actions or similar container
        danger_in_safety_container = any(
            'safety' in (de.parent.classes[0] if de.parent and de.parent.classes else '') or
            de.has_class('long-press-confirm')
            for de in danger_elems
        )

        if adjacency_issues:
            self.add_result(CheckResult(
                "DANGER-01", "Dangerous Action Isolation",
                "fail" if not danger_in_safety_container else "warning",
                "critical" if not danger_in_safety_container else "major",
                f"{len(adjacency_issues)} dangerous actions may not be properly isolated.",
                details=adjacency_issues,
                recommendations=["Place dangerous actions on a separate screen OR use .safety-actions container with adequate gap."],
            ))
        else:
            self.add_result(CheckResult(
                "DANGER-01", "Dangerous Action Isolation",
                "pass", "info",
                "Dangerous actions are properly isolated.",
            ))

    def _check_label_length_and_verbs(self, interactive: list):
        """Check that primary labels use short, verb-first field language."""
        long_labels = []
        for elem in interactive:
            text = elem.get_text_stripped()
            if not text:
                continue
            # Check label length for Chinese
            char_count = len(re.findall(r'[\u4e00-\u9fff]', text))
            if char_count > 8:
                long_labels.append(f"'{text[:30]}' — {char_count} chars (target: ≤8 for primary labels)")

        if long_labels:
            self.add_result(CheckResult(
                "LABEL-01", "Label Length and Language",
                "warning", "minor",
                f"{len(long_labels)} labels may be too long for field worker UI.",
                details=long_labels,
                recommendations=["Keep primary labels to 2-8 Chinese characters. Use verb-first phrasing (e.g. '上报异常', not '异常管理')."],
            ))
        else:
            self.add_result(CheckResult(
                "LABEL-01", "Label Length and Language",
                "pass", "info",
                "All labels are within recommended length for field worker UI.",
            ))

    def _check_readback_mechanism(self, all_elems: list):
        """Check for readback bar or aria-live readback regions.

        A readback mechanism is any element with:
        - class 'readback-bar', OR
        - aria-live='polite'/'assertive' + role='status', OR
        - aria-live='polite'/'assertive' with confirmation/result semantics
        """
        has_readback = False
        readback_found = []

        for elem in all_elems:
            # Explicit readback bar
            if elem.has_class('readback-bar'):
                has_readback = True
                readback_found.append(f".readback-bar: '{elem.get_text_stripped()[:40]}'")
                break

            # aria-live region with status role — this IS a readback mechanism
            aria_live = elem.get_attr('aria-live')
            role = elem.get_attr('role')
            if aria_live in ('polite', 'assertive') and role in ('status', 'alert'):
                has_readback = True
                readback_found.append(f"[aria-live={aria_live} role={role}]: '{elem.get_text_stripped()[:40]}'")
                break

            # aria-live region with text containing confirmation/readback semantics
            if aria_live in ('polite', 'assertive'):
                text = elem.get_all_text().lower()
                readback_keywords = ['选择', 'selected', '确认', 'confirmed', '结果', 'result',
                                     '完成', 'completed', '提交', 'submitted', '温度', 'pressure',
                                     '状态', 'status', '读数', 'reading']
                if any(kw in text for kw in readback_keywords):
                    has_readback = True
                    readback_found.append(f"[aria-live={aria_live}]: '{elem.get_text_stripped()[:40]}'")
                    break

        if has_readback:
            self.add_result(CheckResult(
                "READ-01", "Readback/Confirmation Mechanism",
                "pass", "info",
                f"Readback mechanism detected: {readback_found[0]}",
            ))
        else:
            self.add_result(CheckResult(
                "READ-01", "Readback/Confirmation Mechanism",
                "warning", "major",
                "No readback mechanism detected. Add a readback bar (aria-live region) to let users confirm their selection before submitting.",
                recommendations=["Add a .readback-bar element with aria-live='polite' that displays the current selection."],
            ))

    def _check_undo_recovery(self, all_elems: list):
        """Check for undo/cancel/modify buttons.

        Excludes negation patterns like "不可撤销", "无法撤销", "无法恢复" etc.
        """
        # Negation phrases that indicate NO recovery path (anywhere in the text)
        negation_phrases = ['不可撤销', '不可恢复', '不可取消', '不可修改',
                            '无法撤销', '无法恢复', '无法取消', '无法修改',
                            '不能撤销', '不能恢复', '永久删除', '不可逆',
                            'irreversible', 'no undo', 'cannot undo']

        undo_indicators = []
        for elem in all_elems:
            text = elem.get_text_stripped()
            # Skip if text contains any negation phrase
            if any(phrase in text for phrase in negation_phrases):
                continue

            if any(w in text for w in ['撤销', '返回修改', '取消', 'Undo', 'Cancel', '修改']):
                undo_indicators.append(text)

        if undo_indicators:
            self.add_result(CheckResult(
                "UNDO-01", "Undo/Recovery Path",
                "pass", "info",
                f"Recovery paths detected: {', '.join(undo_indicators[:3])}.",
            ))
        else:
            self.add_result(CheckResult(
                "UNDO-01", "Undo/Recovery Path",
                "warning", "major",
                "No undo or recovery buttons detected. Every confirmable action should offer undo/modify.",
                recommendations=["Add '撤销' or '返回修改' buttons on submission result screens."],
            ))

    def _check_theme_support(self, css: CSSPropertyExtractor):
        """Check for CSS custom properties (design tokens) that enable theme switching."""
        if css.has_css_variable_support():
            self.add_result(CheckResult(
                "THEME-01", "Theme Switching Support",
                "pass", "info",
                "CSS custom properties detected — supports theme switching (light/dark/high-contrast).",
            ))
        else:
            self.add_result(CheckResult(
                "THEME-01", "Theme Switching Support",
                "warning", "major",
                "No CSS custom properties (--var) detected. Add CSS variables for theming support.",
                recommendations=["Use CSS custom properties for colors, typography, and spacing to enable theme switching."],
            ))

    def _check_non_negotiables(self, all_elems: list, interactive: list, css: CSSPropertyExtractor):
        """Aggregate non-negotiable violations from other checks."""
        nn_violations = []

        for result in self.results:
            if result.check_id in ("TOUCH-01", "COLOR-01", "ICON-01", "FEED-01", "DANGER-01", "UNDO-01"):
                if result.status == "fail":
                    nn_violations.append(f"{result.check_id} ({result.check_name}): FAILED — {result.message}")

        if nn_violations:
            self.add_result(CheckResult(
                "NN-SUMMARY", "Non-Negotiables Summary",
                "fail", "critical",
                f"{len(nn_violations)} non-negotiable rule(s) violated.",
                details=nn_violations,
                recommendations=["Fix all critical (fail) checks above before deployment."],
            ))
        else:
            self.add_result(CheckResult(
                "NN-SUMMARY", "Non-Negotiables Summary",
                "pass", "info",
                "All non-negotiables passed.",
            ))


# ============================================================
# Report Generation
# ============================================================

def generate_text_report(results: list[CheckResult]) -> str:
    """Generate a human-readable text report."""
    lines = []
    lines.append("=" * 70)
    lines.append("  LOW-VISIBILITY FIELD WORKER MOBILE UI — COMPLIANCE REPORT")
    lines.append("  Multisensory Certainty Design System Evaluation")
    lines.append("=" * 70)
    lines.append("")

    status_counts = {"pass": 0, "fail": 0, "warning": 0}
    for r in results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    lines.append(f"  Summary: {status_counts['pass']} passed, {status_counts['fail']} failed, {status_counts['warning']} warnings")
    lines.append("")

    # Group by severity
    criticals = [r for r in results if r.severity == "critical" and r.status == "fail"]
    majors = [r for r in results if r.severity == "major" and r.status != "pass"]
    minors = [r for r in results if r.severity in ("minor", "info")]

    for r in results:
        icon = {"pass": "✅", "fail": "❌", "warning": "⚠️"}[r.status]
        sev_tag = f"[{r.severity.upper()}]" if r.status != "pass" else ""
        lines.append(f"  {icon} {sev_tag} {r.check_name} ({r.check_id})")
        lines.append(f"     {r.message}")
        if r.details:
            for d in r.details[:3]:
                lines.append(f"     • {d}")
            if len(r.details) > 3:
                lines.append(f"     • ... and {len(r.details) - 3} more")
        if r.recommendations and r.status != "pass":
            for rec in r.recommendations[:2]:
                lines.append(f"     → {rec}")
        lines.append("")

    # Overall verdict
    if status_counts["fail"] > 0:
        lines.append("=" * 70)
        lines.append(f"  VERDICT: FAIL — {status_counts['fail']} critical check(s) failed")
        lines.append("  Fix all ❌ items above and re-run evaluation.")
        lines.append("=" * 70)
    elif status_counts["warning"] > 0:
        lines.append("=" * 70)
        lines.append(f"  VERDICT: PASS WITH WARNINGS — {status_counts['warning']} warning(s)")
        lines.append("  Review ⚠️ items and improve where possible.")
        lines.append("=" * 70)
    else:
        lines.append("=" * 70)
        lines.append("  VERDICT: ALL PASS ✅")
        lines.append("  UI meets all Multisensory Certainty requirements.")
        lines.append("=" * 70)

    return "\n".join(lines)


def generate_json_report(results: list[CheckResult]) -> str:
    """Generate a JSON report."""
    report = {
        "title": "Low-Visibility Field Worker Mobile UI Compliance Report",
        "results": [
            {
                "check_id": r.check_id,
                "check_name": r.check_name,
                "status": r.status,
                "severity": r.severity,
                "message": r.message,
                "details": r.details,
                "recommendations": r.recommendations,
            }
            for r in results
        ],
        "summary": {
            "pass": sum(1 for r in results if r.status == "pass"),
            "fail": sum(1 for r in results if r.status == "fail"),
            "warning": sum(1 for r in results if r.status == "warning"),
        },
    }
    report["verdict"] = "FAIL" if report["summary"]["fail"] > 0 else ("WARNING" if report["summary"]["warning"] > 0 else "PASS")
    return json.dumps(report, ensure_ascii=False, indent=2)


# ============================================================
# CLI Entry Point
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate mobile UI HTML against Multisensory Certainty design tokens.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python eval_runner.py --input component.html
  python eval_runner.py --input component.html --json
  python eval_runner.py --input component.html --tokens custom-tokens.yaml
        """,
    )
    parser.add_argument("--input", "-i", required=True, help="Path to HTML file to evaluate")
    parser.add_argument("--tokens", "-t", help="Path to custom design-tokens.yaml (optional)")
    parser.add_argument("--json", "-j", action="store_true", help="Output in JSON format")

    args = parser.parse_args()

    # Load tokens
    tokens = DEFAULT_TOKENS
    if args.tokens:
        try:
            import yaml
            with open(args.tokens, 'r', encoding='utf-8') as f:
                tokens = yaml.safe_load(f)
        except ImportError:
            print("Warning: PyYAML not installed. Using default tokens.", file=sys.stderr)
        except Exception as e:
            print(f"Error loading tokens: {e}", file=sys.stderr)
            sys.exit(2)

    # Check input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(2)

    # Run evaluation
    engine = EvalEngine(tokens)
    results = engine.evaluate(args.input)

    # Output
    if args.json:
        print(generate_json_report(results))
    else:
        print(generate_text_report(results))

    # Exit code
    has_failures = any(r.status == "fail" for r in results)
    sys.exit(1 if has_failures else 0)


if __name__ == "__main__":
    main()
