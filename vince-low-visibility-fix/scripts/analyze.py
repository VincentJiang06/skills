#!/usr/bin/env python3
"""Deterministic low-visibility UI analyzer (v0.1).

Reads an HTML file (inline + <style>-block styles, explicit dimensions) and
emits scored JSON findings per the vince-low-visibility-fix skill contract.
Stdlib only — no third-party dependencies.

Scope (v0.1): inline `style` attributes and `<style>` blocks with simple
selectors (tag, .class, #id, tag.class). Full CSS cascade, external
stylesheets, computed/themed colors, background images, and JS-driven state
are reported under `needs_judgment` for the model to complete.

Usage:
    python3 analyze.py <file.html> [--tokens design-tokens.json]
                       [--compare before.json] [--json]
"""
import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser

# --- color handling ----------------------------------------------------------

NAMED_COLORS = {
    "black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0),
    "green": (0, 128, 0), "blue": (0, 0, 255), "yellow": (255, 255, 0),
    "orange": (255, 165, 0), "gray": (128, 128, 128), "grey": (128, 128, 128),
    "silver": (192, 192, 192), "maroon": (128, 0, 0), "lime": (0, 255, 0),
    "navy": (0, 0, 128), "purple": (128, 0, 128), "teal": (0, 128, 128),
    "transparent": None,
}


def parse_color(value):
    """Return (r, g, b, a) with a in [0,1], or None if unparseable/transparent."""
    if value is None:
        return None
    v = value.strip().lower()
    if v in NAMED_COLORS:
        rgb = NAMED_COLORS[v]
        return None if rgb is None else (rgb[0], rgb[1], rgb[2], 1.0)
    m = re.fullmatch(r"#([0-9a-f]{3})", v)
    if m:
        h = m.group(1)
        return (int(h[0] * 2, 16), int(h[1] * 2, 16), int(h[2] * 2, 16), 1.0)
    m = re.fullmatch(r"#([0-9a-f]{6})", v)
    if m:
        h = m.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = re.fullmatch(r"rgba?\(([^)]+)\)", v)
    if m:
        parts = [p.strip() for p in m.group(1).replace("/", ",").split(",") if p.strip()]
        try:
            r, g, b = (int(round(float(p.rstrip("%")))) for p in parts[:3])
            a = float(parts[3]) if len(parts) > 3 else 1.0
            return (r, g, b, a)
        except ValueError:
            return None
    return None


def _composite(fg, bg):
    """Alpha-composite fg (r,g,b,a) over bg (r,g,b,a=1) -> (r,g,b)."""
    a = fg[3]
    return tuple(round(fg[i] * a + bg[i] * (1 - a)) for i in range(3))


def _srgb_to_linear(c):
    cs = c / 255.0
    return cs / 12.92 if cs <= 0.03928 else ((cs + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (_srgb_to_linear(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(rgb1, rgb2):
    l1, l2 = luminance(rgb1), luminance(rgb2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


# --- length handling ---------------------------------------------------------

def parse_length_px(value):
    """Parse a CSS length to px. Returns float or None if not resolvable."""
    if value is None:
        return None
    v = value.strip().lower()
    m = re.fullmatch(r"(-?\d*\.?\d+)(px|pt|rem|em)?", v)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2) or "px"
    if unit == "px":
        return num
    if unit == "pt":
        return num * 96.0 / 72.0
    if unit in ("rem", "em"):  # assume 16px root; em approximated as rem in v0.1
        return num * 16.0
    return None


def expand_box(decls, prop):
    """Resolve the 4 sides of padding/margin into (top, right, bottom, left) px.
    Missing/unresolvable sides are None."""
    sides = {s: None for s in ("top", "right", "bottom", "left")}
    if prop in decls:
        parts = decls[prop].split()
        vals = [parse_length_px(p) for p in parts]
        if len(vals) == 1:
            sides = dict(top=vals[0], right=vals[0], bottom=vals[0], left=vals[0])
        elif len(vals) == 2:
            sides = dict(top=vals[0], right=vals[1], bottom=vals[0], left=vals[1])
        elif len(vals) == 3:
            sides = dict(top=vals[0], right=vals[1], bottom=vals[2], left=vals[1])
        elif len(vals) >= 4:
            sides = dict(top=vals[0], right=vals[1], bottom=vals[2], left=vals[3])
    for s in ("top", "right", "bottom", "left"):
        explicit = decls.get(f"{prop}-{s}")
        if explicit is not None:
            sides[s] = parse_length_px(explicit)
    return sides["top"], sides["right"], sides["bottom"], sides["left"]


def floor_dim(*vals):
    """Guaranteed lower-bound dimension from width/min-width style values."""
    present = [v for v in vals if v is not None]
    return max(present) if present else None


# --- CSS parsing -------------------------------------------------------------

def parse_decls(text):
    """Parse a declaration block body into a lowercased prop->value dict."""
    decls = {}
    for chunk in text.split(";"):
        if ":" not in chunk:
            continue
        prop, _, val = chunk.partition(":")
        prop = prop.strip().lower()
        val = val.strip()
        val = re.sub(r"\s*!important\s*$", "", val, flags=re.I)
        if prop and val:
            decls[prop] = val
    # background shorthand -> extract a color if present
    if "background-color" not in decls and "background" in decls:
        for tok in decls["background"].split():
            if parse_color(tok) is not None:
                decls["background-color"] = tok
                break
    return decls


def parse_simple_selector(sel):
    """Parse the rightmost simple selector -> (tag, classes set, id) or None."""
    sel = sel.strip()
    # take the rightmost compound selector (ignore ancestors/combinators in v0.1)
    sel = re.split(r"[\s>+~]+", sel)[-1]
    sel = sel.split(":")[0]  # drop pseudo-classes/elements
    if not sel:
        return None
    id_m = re.search(r"#([\w-]+)", sel)
    classes = set(re.findall(r"\.([\w-]+)", sel))
    tag_m = re.match(r"^([a-zA-Z][\w-]*|\*)", sel)
    tag = tag_m.group(1).lower() if tag_m else None
    if tag == "*":
        tag = None
    return (tag, classes, id_m.group(1) if id_m else None)


def resolve_value(value, varmap, _depth=0):
    """Substitute CSS var(--x[, fallback]) references using varmap. Leaves the
    value untouched when a variable is undefined and has no fallback, so later
    parsing fails and the finding falls to needs_judgment rather than guessing."""
    if _depth > 12 or "var(" not in value:
        return value
    m = re.search(r"var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)", value)
    if not m:
        return value
    name, fallback = m.group(1), m.group(2)
    if name in varmap:
        repl = varmap[name]
    elif fallback is not None:
        repl = fallback.strip()
    else:
        return value
    return resolve_value(value[:m.start()] + repl + value[m.end():], varmap, _depth + 1)


def parse_stylesheet(css):
    """Return (rules, varmap): rules is a list of (specificity, simple_selector,
    decls); varmap holds :root/html custom properties for var() resolution."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    rules = []
    varmap = {}
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        selectors, body = m.group(1), m.group(2)
        decls = parse_decls(body)
        if not decls:
            continue
        sel_list = [s.strip() for s in selectors.split(",")]
        if any(s.lower() in (":root", "html") for s in sel_list):
            for k, v in decls.items():
                if k.startswith("--"):
                    varmap[k] = v
        for sel in sel_list:
            simple = parse_simple_selector(sel)
            if simple is None:
                continue
            tag, classes, sid = simple
            spec = (1 if sid else 0, len(classes), 1 if tag else 0)
            rules.append((spec, simple, decls))
    for k in list(varmap):
        varmap[k] = resolve_value(varmap[k], varmap)
    return rules, varmap


# --- HTML tree ---------------------------------------------------------------

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Node:
    __slots__ = ("tag", "attrs", "classes", "id", "inline", "parent",
                 "children", "text", "line")

    def __init__(self, tag, attrs, line):
        self.tag = tag
        self.attrs = attrs
        self.classes = (attrs.get("class") or "").split()
        self.id = attrs.get("id")
        self.inline = parse_decls(attrs.get("style", "")) if attrs.get("style") else {}
        self.parent = None
        self.children = []
        self.text = ""
        self.line = line

    def descr(self):
        base = self.tag
        if self.id:
            base += "#" + self.id
        elif self.classes:
            base += "." + ".".join(self.classes)
        return f"{base} (line {self.line})"


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, 0)
        self.stack = [self.root]
        self.style_css = []
        self._in_style = False
        self.external_links = []

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        node = Node(tag, a, self.getpos()[0])
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)
        if tag == "style":
            self._in_style = True
        if tag == "link" and "stylesheet" in a.get("rel", "").lower():
            self.external_links.append(a.get("href", ""))
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        node = Node(tag, a, self.getpos()[0])
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag):
        if tag == "style":
            self._in_style = False
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._in_style:
            self.style_css.append(data)
        elif data.strip():
            self.stack[-1].text += data


def walk(node):
    yield node
    for c in node.children:
        yield from walk(c)


# --- style resolution --------------------------------------------------------

def declared(node, rules):
    """Own declared style: matched <style> rules by specificity, then inline."""
    out = {}
    applicable = []
    for spec, simple, decls in rules:
        tag, classes, sid = simple
        if tag and tag != node.tag:
            continue
        if classes and not classes.issubset(set(node.classes)):
            continue
        if sid and sid != node.id:
            continue
        applicable.append((spec, decls))
    for _, decls in sorted(applicable, key=lambda x: x[0]):
        out.update(decls)
    out.update(node.inline)  # inline wins
    return out


def resolved(node, rules, prop, inherit=False, default=None, _cache=None):
    """Resolve a property value, optionally inheriting from ancestors."""
    own = declared(node, rules)
    if prop in own:
        return own[prop]
    if inherit and node.parent is not None and node.parent.tag != "#root":
        return resolved(node.parent, rules, prop, inherit, default)
    return default


def resolved_bg(node, rules):
    """Nearest explicit background-color up the tree.
    Returns an (r,g,b) tuple, the sentinel "image" when a background image or
    gradient is encountered first (contrast unknowable), or white as the CSS
    initial canvas if nothing is declared."""
    n = node
    while n is not None and n.tag != "#root":
        own = declared(n, rules)
        c = parse_color(own.get("background-color"))
        if c is not None:
            return (c[0], c[1], c[2])
        bg_shorthand = own.get("background-image", "") + " " + own.get("background", "")
        if "url(" in bg_shorthand or "gradient(" in bg_shorthand:
            return "image"
        n = n.parent
    return (255, 255, 255)


# --- semantic helpers --------------------------------------------------------

INTERACTIVE_TAGS = {"a", "button", "select", "textarea"}
INTERACTIVE_INPUT = {"button", "submit", "reset", "checkbox", "radio", "image"}


def is_interactive(node):
    if node.tag in INTERACTIVE_TAGS:
        return True
    if node.tag == "input" and node.attrs.get("type", "text").lower() in INTERACTIVE_INPUT:
        return True
    role = node.attrs.get("role", "").lower()
    if role in {"button", "link", "checkbox", "switch", "tab", "menuitem"}:
        return True
    return "onclick" in node.attrs


def text_content(node):
    return "".join(n.text for n in walk(node)).strip()


def accessible_name(node):
    if node.attrs.get("aria-label", "").strip():
        return node.attrs["aria-label"].strip()
    if node.attrs.get("title", "").strip():
        return node.attrs["title"].strip()
    for n in walk(node):
        if n.tag == "img" and n.attrs.get("alt", "").strip():
            return n.attrs["alt"].strip()
    return text_content(node)


# --- analysis ----------------------------------------------------------------

TEXT_TAGS = {"p", "span", "div", "label", "a", "button", "h1", "h2", "h3",
             "h4", "h5", "h6", "li", "td", "th", "small", "strong", "em"}
STATE_CLASS_RE = re.compile(r"(status|state|badge|indicator|dot|tag|label|pill)", re.I)


def analyze(root, rules, tokens):
    findings = []
    needs = []
    fid = [0]

    def add(rule, severity, node, **extra):
        fid[0] += 1
        f = {"id": f"f{fid[0]}", "rule": rule, "severity": severity,
             "location": node.descr()}
        f.update(extra)
        findings.append(f)

    ct, tg, sp, fs = (tokens["contrast"], tokens["target_size"],
                      tokens["spacing"], tokens["font_size"])

    for node in walk(root):
        if node.tag in ("#root", "style", "script", "head", "meta", "title"):
            continue
        own = declared(node, rules)
        has_text = bool(node.text.strip())

        # --- font_size (direct text only) ---
        if has_text:
            fsize = parse_length_px(resolved(node, rules, "font-size", inherit=True,
                                             default="16px"))
            if fsize is not None:
                if fsize < fs["baseline_px"]:
                    add("font_size", "critical", node, measured=fsize,
                        threshold=fs["baseline_px"], axis="low_light",
                        fix_hint=f"raise font-size to >= {fs['field_body_px']}px")
                elif fsize < fs["field_body_px"]:
                    add("font_size", "major", node, measured=fsize,
                        threshold=fs["field_body_px"], axis="low_light",
                        fix_hint=f"raise font-size to >= {fs['field_body_px']}px "
                        f"({fs['field_critical_px']}px for critical labels)")

        # --- contrast (direct text only) ---
        if has_text:
            fg = parse_color(resolved(node, rules, "color", inherit=True, default="#000000"))
            if fg is None:
                needs.append({"reason": "css_var_unresolved", "location": node.descr()})
            else:
                bg = resolved_bg(node, rules)
                # text over an image/gradient: contrast is unknowable statically
                if bg == "image":
                    needs.append({"reason": "bg_image", "location": node.descr()})
                    bg = None
            if fg is not None and bg is not None:
                fg_rgb = _composite(fg, (bg[0], bg[1], bg[2], 1.0)) if fg[3] < 1 else fg[:3]
                ratio = round(contrast_ratio(fg_rgb, bg), 2)
                fsize = parse_length_px(resolved(node, rules, "font-size", inherit=True,
                                                 default="16px")) or 16
                large = fsize >= ct["large_text_min_px"]
                base = ct["baseline"]["large_text" if large else "text"]
                field = ct["field"]["large_text" if large else "text"]
                if ratio < base:
                    add("contrast", "critical", node, measured=ratio, threshold=base,
                        axis="glare", fix_hint="increase fg/bg contrast to >= "
                        f"{field}:1 (currently {ratio}:1)")
                elif ratio < field:
                    add("contrast", "major", node, measured=ratio, threshold=field,
                        axis="glare", fix_hint=f"raise contrast to >= {field}:1 for glare")

        # --- interactive checks ---
        if is_interactive(node):
            # target_size — honor min-width/min-height as a guaranteed floor
            w = floor_dim(parse_length_px(own.get("width")),
                          parse_length_px(own.get("min-width")))
            h = floor_dim(parse_length_px(own.get("height")),
                          parse_length_px(own.get("min-height")))
            if h is None:
                pt, _, pb, _ = expand_box(own, "padding")
                fsize = parse_length_px(resolved(node, rules, "font-size", inherit=True,
                                                 default="16px"))
                if fsize is not None and (pt is not None or pb is not None):
                    h = fsize + (pt or 0) + (pb or 0)
            dims = [d for d in (w, h) if d is not None]
            if not dims:
                needs.append({"reason": "target_size_unresolved", "location": node.descr()})
            else:
                size = min(dims)
                if size < tg["baseline_px"]:
                    add("target_size", "critical", node, measured=size,
                        threshold=tg["baseline_px"], axis="gloves",
                        fix_hint=f"enlarge target to >= {tg['field_px']}px (gloves)")
                elif size < tg["field_px"]:
                    add("target_size", "major", node, measured=size,
                        threshold=tg["field_px"], axis="gloves",
                        fix_hint=f"enlarge target to >= {tg['field_px']}px (gloves; "
                        f"{tg['recommended_px']}px ideal)")

            # icon_only: field needs a VISIBLE text label; an aria-label alone is
            # a weak fallback under glare, so it downgrades rather than clears.
            if not text_content(node):
                if accessible_name(node):
                    add("icon_only", "minor", node, axis="glare",
                        fix_hint="add a visible text label (aria-label alone is weak under glare)")
                else:
                    add("icon_only", "major", node, axis="glare",
                        fix_hint="add a visible text label or aria-label")

            # spacing vs adjacent interactive siblings
            siblings = [c for c in node.parent.children if is_interactive(c)] \
                if node.parent else []
            if len(siblings) > 1:
                mt, mr, mb, ml = expand_box(own, "margin")
                margins = [m for m in (mt, mr, mb, ml) if m is not None]
                if margins and min(margins) < sp["field_px"]:
                    add("spacing", "minor", node, measured=min(margins),
                        threshold=sp["field_px"], axis="gloves",
                        fix_hint=f"increase gap to >= {sp['field_px']}px between targets")

        # --- color_only (state conveyed by color alone) ---
        if (not is_interactive(node) and not text_content(node)
                and any(STATE_CLASS_RE.search(c) for c in node.classes)):
            if parse_color(own.get("background-color")) is not None \
                    or parse_color(own.get("color")) is not None:
                has_icon = any(n.tag in ("svg", "img", "i", "use") for n in walk(node)
                               if n is not node)
                if not has_icon:
                    add("color_only", "major", node, axis="glare",
                        fix_hint="add text/icon + shape; do not rely on color alone")

    # score
    weight = {"critical": 15, "major": 7, "minor": 3}
    score = max(0, 100 - sum(weight[f["severity"]] for f in findings))
    by_sev = {s: sum(1 for f in findings if f["severity"] == s)
              for s in ("critical", "major", "minor")}
    return {
        "summary": {
            "score": score,
            "by_severity": by_sev,
            "resolved_count": len(findings),
            "needs_judgment_count": len(needs),
        },
        "findings": findings,
        "needs_judgment": needs,
    }


# --- cli ---------------------------------------------------------------------

def load_tokens(path):
    if path is None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "..", "references", "design-tokens.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def compare(before_path, current):
    with open(before_path, encoding="utf-8") as fh:
        before = json.load(fh)
    before_keys = {(f["rule"], f["location"]) for f in before.get("findings", [])}
    current_keys = {(f["rule"], f["location"]) for f in current["findings"]}
    resolved_fixed = sorted(f"{r} @ {l}" for (r, l) in before_keys - current_keys)
    introduced = sorted(f"{r} @ {l}" for (r, l) in current_keys - before_keys)
    return {
        "before_score": before.get("summary", {}).get("score"),
        "after_score": current["summary"]["score"],
        "fixed": resolved_fixed,
        "introduced": introduced,
        "remaining": len(current_keys & before_keys),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Low-visibility UI analyzer (v0.1)")
    ap.add_argument("target", help="path to an .html file")
    ap.add_argument("--tokens", help="path to design-tokens.json")
    ap.add_argument("--compare", help="path to a prior findings JSON to diff against")
    ap.add_argument("--json", action="store_true",
                    help="print compact JSON (default is pretty)")
    args = ap.parse_args(argv)

    if not os.path.isfile(args.target):
        print(f"error: not a file: {args.target}", file=sys.stderr)
        return 2
    with open(args.target, encoding="utf-8") as fh:
        html = fh.read()

    tokens = load_tokens(args.tokens)
    builder = TreeBuilder()
    builder.feed(html)
    rules, varmap = parse_stylesheet("\n".join(builder.style_css))
    for _spec, _simple, decls in rules:
        for k in list(decls):
            decls[k] = resolve_value(decls[k], varmap)
    for node in walk(builder.root):
        for k in list(node.inline):
            node.inline[k] = resolve_value(node.inline[k], varmap)
    result = analyze(builder.root, rules, tokens)
    result["target"] = os.path.basename(args.target)
    for href in builder.external_links:
        result["needs_judgment"].append(
            {"reason": "external_stylesheet", "location": f"<link href={href!r}>"})
    result["summary"]["needs_judgment_count"] = len(result["needs_judgment"])
    if args.compare:
        result["comparison"] = compare(args.compare, result)

    indent = None if args.json else 2
    print(json.dumps(result, ensure_ascii=False, indent=indent))
    # exit code: 0 clean, 1 findings present (useful for CI / verify step)
    return 1 if result["summary"]["resolved_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
