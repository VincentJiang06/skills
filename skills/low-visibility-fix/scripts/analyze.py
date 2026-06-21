#!/usr/bin/env python3
"""Deterministic low-visibility UI analyzer (v0.2 — PROVE-OR-FLAG).

Reads an HTML/WXML file (inline + <style>-block styles, an external .css/.wxss
merged via --css, explicit dimensions) and emits scored JSON findings per the
low-visibility-fix skill contract. Stdlib only — no third-party dependencies.

PROVE-OR-FLAG stance
--------------------
The analyzer emits a FINDING only when it can PROVE a threshold violation from
FULLY-RESOLVED values. Every value it cannot resolve becomes an explicit
`needs_judgment` row with a specific reason — it NEVER silently drops a rule and
NEVER fabricates a default that creates or hides a finding. Coverage is honest:
the user sees exactly what was proven vs what the visual pass must resolve.

Two clearly-labeled tiers travel with every finding:
  * critical  — below the WCAG 2.2 baseline (a cited standard).
  * major     — above WCAG baseline but below the FIELD-elevated tier (an
                engineering recommendation for low-light/glare/gloves, NOT a
                standard).
Each finding carries `tier` and `standard` so the reader knows what it violates.

Usage:
    python3 analyze.py <file.html|.wxml> [--tokens design-tokens.json]
                       [--css sheet.wxss] [--selector .sel] [--viewport-px N] [--json]
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


def _hsl_to_rgb(h, s, l):
    """h in degrees, s/l in [0,1] -> (r,g,b) 0-255."""
    h = (h % 360) / 360.0
    s = max(0.0, min(1.0, s))
    l = max(0.0, min(1.0, l))
    if s == 0:
        v = round(l * 255)
        return (v, v, v)

    def hue(p, q, t):
        t = t % 1.0
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    return tuple(round(hue(p, q, h + d) * 255) for d in (1 / 3, 0, -1 / 3))


def parse_color(value):
    """Return (r, g, b, a) with a in [0,1], or None if unparseable/transparent.

    Handles named colors, #rgb / #rgba / #rrggbb / #rrggbbaa, rgb()/rgba() with
    comma OR space OR slash separators and % channels, and hsl()/hsla()."""
    if value is None:
        return None
    v = value.strip().lower()
    if v in NAMED_COLORS:
        rgb = NAMED_COLORS[v]
        return None if rgb is None else (rgb[0], rgb[1], rgb[2], 1.0)
    m = re.fullmatch(r"#([0-9a-f]{3,8})", v)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            r, g, b = (int(h[i] * 2, 16) for i in range(3))
            a = int(h[3] * 2, 16) / 255 if len(h) == 4 else 1.0
            return (r, g, b, a)
        if len(h) in (6, 8):
            r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
            a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
            return (r, g, b, a)
        return None
    m = re.fullmatch(r"(rgba?|hsla?)\(([^)]+)\)", v)
    if m:
        kind, body = m.group(1), m.group(2).strip()
        parts = [p for p in re.split(r"[,\s/]+", body) if p]
        try:
            if kind.startswith("rgb"):
                def chan(p):
                    return int(round(float(p[:-1]) * 2.55)) if p.endswith("%") else int(round(float(p)))
                r, g, b = (chan(p) for p in parts[:3])
            else:
                hnum = float(re.sub(r"deg$", "", parts[0]))
                s = float(parts[1].rstrip("%")) / 100.0
                ll = float(parts[2].rstrip("%")) / 100.0
                r, g, b = _hsl_to_rgb(hnum, s, ll)
            a = parts[3] if len(parts) > 3 else "1"
            a = float(a[:-1]) / 100.0 if a.endswith("%") else float(a)
            return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)),
                    max(0.0, min(1.0, a)))
        except (ValueError, IndexError):
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

# Viewport width (px) used to resolve WeChat mini-program rpx units (750rpx ==
# viewport width). Set per run by analyze_html; default is a 375px logical phone.
_VIEWPORT_PX = 375

# The root font-size used to resolve `rem` and ROOT-level `em`/`%`. The CSS
# initial is 16px; we treat this as the documented base, not a per-element guess.
ROOT_FONT_PX = 16.0

# Sentinel for a relative font-size whose parent chain could not be resolved.
FONT_REL_UNRESOLVED = "__font_rel_unresolved__"


def parse_length_px(value):
    """Parse an ABSOLUTE CSS length (px/pt/rpx/rem) to px. Returns float or None.

    `em` and `%` are NOT absolute (they need an inherited context) and are NOT
    handled here — callers that care about inheritance use resolve_font_size_px.
    A bare `rem` resolves against the documented root font-size (ROOT_FONT_PX)."""
    if value is None:
        return None
    v = value.strip().lower()
    m = re.fullmatch(r"(-?\d*\.?\d+)(px|pt|rem|rpx)?", v)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2) or "px"
    if unit == "px":
        return num
    if unit == "rpx":            # WeChat: 750rpx == viewport width
        return num * (_VIEWPORT_PX / 750.0)
    if unit == "pt":
        return num * 96.0 / 72.0
    if unit == "rem":           # relative to root font-size (documented base)
        return num * ROOT_FONT_PX
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


def _declared_but_unresolvable(decls, props):
    """True if any of `props` is DECLARED in `decls` with a value we cannot
    resolve to an absolute px (auto / % / vw / vh / vmin / vmax / calc / fit-
    content / a leftover var()). Such a control IS sized — substituting a UA
    default would fabricate a finding, so the caller routes it to needs_judgment."""
    for p in props:
        v = decls.get(p)
        if v is None:
            continue
        v = v.strip().lower()
        if not v:
            continue
        if parse_length_px(v) is not None:
            continue   # resolvable -> not a problem
        # `0` with no unit resolves to 0 via parse_length_px; anything still here
        # is a non-px / unresolvable size token -> declared but unresolvable.
        return True
    return False


# --- CSS parsing -------------------------------------------------------------

def parse_decls(text):
    """Parse a declaration block body into a lowercased prop->value dict.

    `!important` is STRIPPED here (this dict is the resolved value map). Callers
    that need to model the cascade's importance layer use parse_decls_imp, which
    returns which properties were declared `!important`."""
    decls, _imp = parse_decls_imp(text)
    return decls


def parse_decls_imp(text):
    """Parse a declaration block body -> (decls, important_props).

    decls           lowercased prop -> value (value has !important stripped).
    important_props set of props that carried an `!important` flag — modeled in
                    the cascade so an !important declaration wins over any normal
                    one regardless of specificity (it must NOT be silently lost)."""
    decls = {}
    important = set()
    for chunk in text.split(";"):
        if ":" not in chunk:
            continue
        prop, _, val = chunk.partition(":")
        prop = prop.strip().lower()
        val = val.strip()
        had_important = bool(re.search(r"!important\s*$", val, flags=re.I))
        val = re.sub(r"\s*!important\s*$", "", val, flags=re.I)
        if prop and val:
            decls[prop] = val
            if had_important:
                important.add(prop)
    # background shorthand -> extract a color if present. `transparent` parses to
    # None (it is alpha-0) but IS a color keyword, so treat it as one here too:
    # `background: transparent` must resolve identically to
    # `background-color: transparent`.
    if "background-color" not in decls and "background" in decls:
        for tok in decls["background"].split():
            if tok.strip().lower() == "transparent" or parse_color(tok) is not None:
                decls["background-color"] = tok
                break
    return decls, important


# state pseudo-classes that describe a NON-resting interaction/JS state. A rule
# scoped ONLY by one of these does NOT apply to the audited REST state.
STATE_PSEUDO = ("hover", "active", "focus", "focus-visible", "focus-within",
                "checked", "visited", "target", "disabled", "enabled",
                "valid", "invalid", "in-range", "out-of-range", "placeholder-shown")
# functional pseudo-classes we cannot confidently resolve to the rest state.
UNRESOLVABLE_PSEUDO = ("is", "where", "has", "not", "nth-child", "nth-of-type",
                       "nth-last-child", "first-child", "last-child",
                       "only-child", "first-of-type", "last-of-type", "lang", "dir")


def _compound_pseudos(compound):
    """Return the list of pseudo-class names attached to a compound selector."""
    return [m.lower() for m in re.findall(r"::?([\w-]+)", compound)]


def parse_simple_selector(sel):
    """Parse the rightmost simple/compound selector -> (tag, classes, id) or None.

    Combinators/ancestors are intentionally dropped here; full-chain matching is
    handled by parse_full_selector + selector_matches. Pseudo-elements/classes
    are stripped for the structural key."""
    sel = sel.strip()
    sel = re.split(r"[\s>+~]+", sel)[-1]
    sel = re.split(r"::?", sel)[0]  # drop pseudo-classes/elements
    if not sel:
        return None
    id_m = re.search(r"#([\w-]+)", sel)
    classes = set(re.findall(r"\.([\w-]+)", sel))
    tag_m = re.match(r"^([a-zA-Z][\w-]*|\*)", sel)
    tag = tag_m.group(1).lower() if tag_m else None
    if tag == "*":
        tag = None
    return (tag, classes, id_m.group(1) if id_m else None)


def parse_full_selector(sel):
    """Parse a full selector into a matchable structure, or None if unparseable.

    Returns a dict:
      key        (tag, classes, id) of the SUBJECT (rightmost) compound — used as
                 the conditional/structural key, unchanged from v0.2.
      steps      list of (combinator, compound_dict) from LEFT to right, where
                 combinator is one of '', '>', ' ' (descendant), and compound_dict
                 is (tag, classes, id). The rightmost step's combinator is the one
                 linking it to its ancestor (or '' for the first step).
      state_only True if the subject compound is gated SOLELY by a state pseudo
                 (:hover/:active/:focus/:checked/:visited/...) — does not apply to
                 the audited rest state.
      uncertain  True if the selector uses a combinator we don't model (+ / ~) or
                 a functional/structural pseudo we cannot confidently resolve —
                 the caller must NOT apply it; it flags rather than guesses.
    """
    sel = sel.strip()
    if not sel:
        return None
    # sibling combinators (+ ~) are not modeled -> uncertain (do not apply)
    if re.search(r"[+~]", sel):
        return {"key": None, "steps": [], "state_only": False, "uncertain": True}
    steps = _link_steps(sel)
    if steps is None:
        return None
    # state/uncertainty are judged on the SUBJECT (rightmost) compound's pseudos.
    subject_compound = re.split(r"\s+|>", sel)[-1]
    pseudos = _compound_pseudos(subject_compound)
    state_pseudos = [p for p in pseudos if p in STATE_PSEUDO]
    state_only = bool(state_pseudos)
    # any compound (subject or ancestor) using a pseudo we cannot resolve to the
    # rest state -> uncertain (do not apply; flag instead of guessing).
    uncertain = any(p in UNRESOLVABLE_PSEUDO for p in _compound_pseudos(sel))
    key = steps[-1][1]
    return {"key": key, "steps": steps, "state_only": state_only,
            "uncertain": uncertain}


def _link_steps(sel):
    """Tokenize a selector into ordered (combinator, simple) steps, where
    combinator is '' for the first step, '>' for a child combinator, or ' ' for
    a descendant combinator. Returns None if any compound is unparseable."""
    # normalize '>' to a spaced token so we can split on whitespace while keeping
    # the combinator.
    norm = re.sub(r"\s*>\s*", " > ", sel.strip())
    parts = norm.split()
    steps = []
    combinator = ""
    for part in parts:
        if part == ">":
            combinator = ">"
            continue
        simple = parse_simple_selector(part)
        if simple is None:
            return None
        steps.append((combinator, simple))
        combinator = " "   # default link to the next compound is descendant
    return steps or None


def _compound_matches(simple, node):
    """True if a single compound (tag, classes, id) matches this node."""
    tag, classes, sid = simple
    if tag and tag != node.tag:
        return False
    if classes and not classes.issubset(set(node.classes)):
        return False
    if sid and sid != node.id:
        return False
    return True


def selector_matches(steps, node):
    """Verify a full selector's ancestor chain against the DOM.

    `steps` is the LEFT-to-right list of (combinator, compound) from
    parse_full_selector. The subject (rightmost) compound must match `node`; each
    earlier compound must match an ancestor consistent with its combinator
    ('>' = direct parent, ' ' = any ancestor). Returns True only when the whole
    chain is satisfiable in the real tree — so a rule whose ancestor condition is
    NOT met is never applied (no fabricated finding, no hidden override)."""
    if not steps:
        return False
    # subject must match the node itself
    if not _compound_matches(steps[-1][1], node):
        return False
    # walk remaining compounds right-to-left up the ancestor chain
    cur = node.parent
    # steps[i] = (combinator_linking_to_PREVIOUS, compound); the combinator stored
    # on step i describes how step i attaches to step i-1. To match right-to-left,
    # the combinator that governs the hop from subject to its ancestor is the one
    # stored on the SUBJECT step (steps[-1]).
    for i in range(len(steps) - 2, -1, -1):
        combinator = steps[i + 1][0]   # links step i (ancestor) to step i+1 (child)
        compound = steps[i][1]
        if combinator == ">":
            # direct parent must match
            if cur is None or cur.tag == "#root" or not _compound_matches(compound, cur):
                return False
            cur = cur.parent
        else:
            # descendant: find SOME ancestor that matches
            found = None
            walker = cur
            while walker is not None and walker.tag != "#root":
                if _compound_matches(compound, walker):
                    found = walker
                    break
                walker = walker.parent
            if found is None:
                return False
            cur = found.parent
    return True


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


def _tokenize_blocks(css):
    """Balanced-brace tokenizer: yield (prelude, body, depth0_is_atrule) for each
    top-level `{...}` block, where prelude is the text before the opening brace.

    Walks character by character tracking brace depth so rules nested inside
    @media / @supports / keyframes (and arbitrary nesting) are NOT silently
    dropped by a naive `[^{}]+\\{[^{}]*\\}` regex. The caller decides how to
    handle at-rule blocks vs ordinary style rules."""
    i, n = 0, len(css)
    while i < n:
        # scan to the next { or }
        j = i
        depth_open = css.find("{", j)
        if depth_open == -1:
            return
        prelude = css[i:depth_open]
        # find the matching close brace for this block
        depth = 1
        k = depth_open + 1
        while k < n and depth > 0:
            ch = css[k]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            k += 1
        body = css[depth_open + 1: k - 1] if depth == 0 else css[depth_open + 1:]
        yield prelude.strip(), body, k - 1 >= n and depth != 0
        i = k


# at-rules whose nested style rules DO apply to elements (conditionally) and so
# must be parsed, not dropped. Their conditionality is recorded as needs_judgment.
CONDITIONAL_ATRULES = ("media", "supports", "container", "layer")
# at-rules that hold NO element style rules (their bodies are not selector rules).
NON_RULE_ATRULES = ("keyframes", "font-face", "page", "import", "charset",
                    "namespace", "font-feature-values", "counter-style", "property")
# statement at-rules: they terminate with `;` (no `{}` block). If left inside a
# prelude they would swallow the FOLLOWING style rule (the prelude then starts
# with '@' and is wrongly treated as one at-rule). We strip them out first.
STATEMENT_ATRULES = ("import", "charset", "namespace")


def _strip_statement_atrules(css):
    """Remove leading/inline statement at-rules (`@import`/`@charset`/`@namespace`,
    which end at `;` not `{}`) so they cannot swallow the next style rule. Returns
    (clean_css, import_hrefs). Each @import target is reported so an unreadable
    external sheet routes to needs_judgment, never a silent drop."""
    imports = []

    def repl(m):
        stmt = m.group(0)
        name = m.group(1).lower()
        if name == "import":
            href = re.search(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)|['"]([^'"]+)['"]""", stmt)
            if href:
                imports.append(href.group(1) or href.group(2))
        return " "
    # match @import/@charset/@namespace ... up to the terminating ;
    pattern = re.compile(r"@(import|charset|namespace)\b[^;{}]*;", re.I)
    clean = pattern.sub(repl, css)
    return clean, imports


def parse_stylesheet(css):
    """Parse CSS with a balanced-brace tokenizer.

    Returns (rules, varmap, conditional_selectors, unparsed, imports):
      rules                 list of rule dicts: {spec, full, decls, important,
                            state_only, uncertain} — see parse_full_selector.
      varmap                :root/html custom properties for var() resolution
      conditional_selectors selectors that appear ONLY inside a conditional
                            at-rule (@media/@supports/...) — their styles are
                            viewport/feature-conditional and so any finding/clean
                            for them must be flagged needs_judgment.
      unparsed              raw selector strings the parser could not classify
                            (e.g. a malformed block) — never silently skipped.
      imports               @import hrefs (external sheets) -> needs_judgment.
    """
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css, imports = _strip_statement_atrules(css)
    rules = []
    varmap = {}
    conditional = set()   # selectors seen only inside a conditional at-rule
    unconditional = set()  # selectors seen at top level (unconditional)
    unparsed = []

    def ingest(prelude, body, conditional_ctx):
        # an at-rule? prelude starts with '@'
        pl = prelude.strip()
        if pl.startswith("@"):
            name = re.match(r"@([\w-]+)", pl.lower())
            name = name.group(1) if name else ""
            if name in CONDITIONAL_ATRULES:
                # nested style rules apply conditionally — recurse into the body
                for p2, b2, _ in _tokenize_blocks(body):
                    ingest(p2, b2, conditional_ctx=True)
                return
            if name in NON_RULE_ATRULES:
                return  # no element style rules here
            # unknown at-rule with a body that may contain rules -> recurse,
            # but treat anything inside as conditional (we can't prove it applies)
            if "{" in body:
                for p2, b2, _ in _tokenize_blocks(body):
                    ingest(p2, b2, conditional_ctx=True)
            return
        # ordinary style rule. Nested rules (CSS nesting) inside the body?
        nested = list(_tokenize_blocks(body))
        if nested:
            # the body itself contains nested blocks -> we can't reliably flatten
            # selector context; record selectors as unparsed rather than guess.
            for s in [s.strip() for s in pl.split(",") if s.strip()]:
                unparsed.append(s)
            return
        decls, important = parse_decls_imp(body)
        if not decls:
            return
        sel_list = [s.strip() for s in pl.split(",") if s.strip()]
        if any(s.lower() in (":root", "html") for s in sel_list):
            for k, v in decls.items():
                if k.startswith("--"):
                    varmap[k] = v
        # a rule whose declarations are ENTIRELY custom properties (--x) affects
        # no element style we measure — once its vars are captured there is
        # nothing to drop, so it is not flagged unparsed even if its selector is
        # a bare pseudo (:root) we don't structurally match.
        only_custom_props = all(k.startswith("--") for k in decls)
        for sel in sel_list:
            full = parse_full_selector(sel)
            if full is None or full["key"] is None:
                # unparseable / unmatchable selector (bare pseudo like :root, a
                # sibling combinator, etc.). Only flag when there is element style
                # at stake — never fabricate noise for a vars-only rule.
                if not only_custom_props:
                    unparsed.append(sel)
                continue
            simple = full["key"]
            tag, classes, sid = simple
            # specificity: id, (classes + pseudo-classes), (tags + pseudo-elements)
            n_class = sum(len(c) for _cmb, (_t, c, _i) in full["steps"])
            n_id = sum(1 for _cmb, (_t, _c, i) in full["steps"] if i)
            n_tag = sum(1 for _cmb, (t, _c, _i) in full["steps"] if t)
            spec = (n_id, n_class, n_tag)
            rules.append({"spec": spec, "full": full, "decls": decls,
                          "important": important,
                          "state_only": full["state_only"],
                          "uncertain": full["uncertain"]})
            key = (tag, frozenset(classes), sid)
            if conditional_ctx:
                conditional.add(key)
            else:
                unconditional.add(key)

    for prelude, body, _ in _tokenize_blocks(css):
        ingest(prelude, body, conditional_ctx=False)

    for k in list(varmap):
        varmap[k] = resolve_value(varmap[k], varmap)
    # a selector is "conditional" only if it NEVER appears unconditionally
    conditional_only = conditional - unconditional
    return rules, varmap, conditional_only, unparsed, imports


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
    """Iterative pre-order DFS — recursion-safe for deeply nested DOM."""
    stack = [node]
    while stack:
        n = stack.pop()
        yield n
        stack.extend(reversed(n.children))


# --- style resolution --------------------------------------------------------

def declared(node, rules):
    """Own declared style for `node`, honoring the cascade:

      * A rule applies only if its FULL selector (including any descendant/child
        ancestor condition) matches `node` in the real tree — combinators are
        verified, never ignored (defect 4).
      * Rules gated solely by a state pseudo-class (:hover/:active/:focus/... ) do
        NOT apply to the audited rest state and are skipped (defect 5).
      * Selectors we cannot confidently resolve (sibling combinators, :is/:has/
        :nth-* ...) are NOT applied (they were recorded as unparsed upstream).
      * `!important` declarations win over any normal declaration regardless of
        specificity; among same-importance declarations, specificity then source
        order decides (defect 3).

    Inline styles are a normal-importance layer that beats normal author rules
    (it sorts after them) but loses to author `!important` declarations."""
    normal = []     # (sort_key, decls) normal-importance layers
    important = []   # (sort_key, decls_subset) !important layers
    for order, rule in enumerate(rules):
        if rule["state_only"] or rule["uncertain"]:
            continue
        if not selector_matches(rule["full"]["steps"], node):
            continue
        normal.append(((rule["spec"], order), rule["decls"]))
        if rule["important"]:
            imp_decls = {k: rule["decls"][k] for k in rule["important"]
                         if k in rule["decls"]}
            important.append(((rule["spec"], order), imp_decls))
    out = {}
    # 1) normal author rules by (specificity, source order)
    for _key, decls in sorted(normal, key=lambda x: x[0]):
        out.update(decls)
    # 2) inline styles (normal importance, but beats normal author rules)
    out.update(node.inline)
    # 3) !important author declarations override everything above
    for _key, decls in sorted(important, key=lambda x: x[0]):
        out.update(decls)
    return out


def resolved(node, rules, prop, inherit=False, default=None):
    """Resolve a property value, optionally inheriting from ancestors.
    Iterative walk up the ancestor chain — recursion-safe for deep DOM."""
    n = node
    while n is not None and n.tag != "#root":
        own = declared(n, rules)
        if prop in own:
            return own[prop]
        if not inherit:
            break
        n = n.parent
    return default


def resolve_font_size_px(node, rules):
    """Resolve a node's effective font-size to px, honoring inheritance and
    relative units (em / %) against the INHERITED parent font-size chain.

    Returns:
      float                a fully-resolved px value, OR
      ROOT_FONT_PX         when no font-size is declared anywhere up the chain
                           (CSS-initial 16px is the documented, non-fabricating
                           base — it never *creates* a finding because it sits
                           above every font-size threshold), OR
      FONT_REL_UNRESOLVED  when a relative font-size (em/%) is declared but its
                           parent chain's font-size cannot be resolved.

    The algorithm collects the font-size declaration chain from the node up to
    the root, then resolves bottom-up: an absolute unit terminates the chain; a
    relative unit multiplies the resolved parent size; an unresolvable parent
    poisons everything below it to FONT_REL_UNRESOLVED.
    """
    # collect (node, raw font-size value) from this node upward where declared
    chain = []  # list of raw values, nearest-first
    n = node
    while n is not None and n.tag != "#root":
        own = declared(n, rules)
        if "font-size" in own:
            chain.append(own["font-size"])
        n = n.parent
    if not chain:
        return ROOT_FONT_PX  # nothing declared -> documented root base
    # resolve from the FARTHEST ancestor (end of list) down to the node (front)
    parent_px = ROOT_FONT_PX  # the inherited context above the topmost decl
    resolved_px = parent_px
    for raw in reversed(chain):
        v = raw.strip().lower()
        absolute = parse_length_px(v)
        if absolute is not None:
            resolved_px = absolute
            parent_px = absolute
            continue
        m = re.fullmatch(r"(-?\d*\.?\d+)(em|%)", v)
        if m:
            num = float(m.group(1))
            factor = num if m.group(2) == "em" else num / 100.0
            if parent_px is FONT_REL_UNRESOLVED:
                resolved_px = FONT_REL_UNRESOLVED
            else:
                resolved_px = parent_px * factor
                parent_px = resolved_px
            continue
        # an unparseable font-size (e.g. var() that didn't resolve, calc()) ->
        # the chain below it can't be proven
        resolved_px = FONT_REL_UNRESOLVED
        parent_px = FONT_REL_UNRESOLVED
    return resolved_px


def resolve_bg(node, rules):
    """Nearest explicit OPAQUE background up the tree, as a verdict tuple
    (kind, value), compositing any translucent layers encountered on the way:

      ("color", (r,g,b))  a fully-resolved solid background color. Translucent
                          layers (alpha<1, incl. `transparent` == alpha 0) are
                          alpha-composited over the first opaque ancestor below
                          them, so a translucent bg over a known base reports the
                          TRUE composited color (never a fabricated opaque one).
      ("image", None)     a background image / gradient (contrast unknowable).
      ("unparsed", None)  a background-color IS declared but cannot be parsed.
      ("undeclared", None) NO opaque background is declared anywhere up the chain —
                           we do NOT default to white (a dark-themed app sets its
                           page background in a global sheet we may not have read,
                           so white would fabricate a contrast ratio). Translucent
                           layers with no resolvable opaque base also land here:
                           they cannot be composited, so we flag rather than guess.

    `transparent` / rgba(...,0) is FULLY resolvable: it is alpha-0, i.e. "keep
    looking up the parent chain" — it is never `unparsed`.
    """
    # stack of translucent layers (nearest-first) awaiting an opaque base
    pending = []  # list of (r, g, b, a) with 0 <= a < 1
    n = node
    while n is not None and n.tag != "#root":
        own = declared(n, rules)
        bgc = own.get("background-color")
        if bgc is not None:
            v = bgc.strip().lower()
            c = parse_color(bgc)
            if c is not None:
                if c[3] >= 1.0:
                    base = (c[0], c[1], c[2])
                    return ("color", _composite_stack(pending, base))
                if c[3] > 0.0:
                    # a translucent (but visible) layer -> composite later
                    pending.append(c)
                # alpha == 0 (transparent / rgba(...,0)): contributes nothing,
                # keep looking up the chain — NOT unparsed.
            elif v == "transparent":
                # `transparent` parses to None via NAMED_COLORS but is FULLY
                # resolvable (alpha 0): treat as see-through, keep looking up.
                pass
            else:
                return ("unparsed", None)
        bg_shorthand = own.get("background-image", "") + " " + own.get("background", "")
        if "url(" in bg_shorthand or "gradient(" in bg_shorthand:
            return ("image", None)
        n = n.parent
    return ("undeclared", None)


def _composite_stack(pending, base):
    """Composite a nearest-first stack of translucent (r,g,b,a) layers over an
    opaque base (r,g,b). The farthest layer sits directly on the base; nearer
    layers stack on top. Returns the resulting opaque (r,g,b)."""
    result = base
    for layer in reversed(pending):   # farthest -> nearest
        result = _composite(layer, (result[0], result[1], result[2], 1.0))
    return result


# --- semantic helpers --------------------------------------------------------

INTERACTIVE_TAGS = {"a", "button", "select", "textarea", "navigator"}
INTERACTIVE_INPUT = {"button", "submit", "reset", "checkbox", "radio", "image"}

# Known UA-default control box sizes (px), used ONLY when a control declares no
# explicit width/height. WeChat <button> default height is 96rpx; we resolve
# that against the viewport so it tracks the rpx scale. HTML controls use the
# common ~21px UA line-box height for unstyled controls. A control whose UA
# default is unknown routes to needs_judgment instead of silently passing.
#   value: ("rpx", n) -> resolved against the viewport; ("px", n) -> literal.
UA_DEFAULT_BOX = {
    # WeChat mini-program <button>: default height 96rpx (~48px at 750rpx width).
    ("wx", "button"): {"height": ("rpx", 96.0)},
    # WeChat <button size="mini">: smaller default min-height 64rpx (~32px),
    # which is BELOW the 48px baseline — modeling it surfaces a real small-target
    # finding instead of fabricating a passing 48px from the regular default.
    ("wx", "button", "mini"): {"height": ("rpx", 64.0)},
}
# HTML UA defaults: small, unstyled native controls. Honest lower bounds.
UA_DEFAULT_BOX_HTML = {
    "button": {"height": ("px", 21.0)},
    "input": {"height": ("px", 21.0)},
    "select": {"height": ("px", 21.0)},
    "textarea": {"height": ("px", 32.0)},
}


def _ua_default_dims(node, is_wxml):
    """Return (w_px, h_px) UA-default box for a control with no explicit size, or
    (None, None) if no UA default is known for this tag. Width is generally
    content-driven (unknown) for these controls, so only height is modeled."""
    spec = None
    if is_wxml:
        size_attr = node.attrs.get("size", "").strip().lower()
        if size_attr == "mini":
            spec = UA_DEFAULT_BOX.get(("wx", node.tag, "mini"))
        if spec is None:
            spec = UA_DEFAULT_BOX.get(("wx", node.tag))
    if spec is None:
        spec = UA_DEFAULT_BOX_HTML.get(node.tag)
    if not spec:
        return (None, None)

    def resolve(entry):
        unit, num = entry
        return num * (_VIEWPORT_PX / 750.0) if unit == "rpx" else num
    w = resolve(spec["width"]) if "width" in spec else None
    h = resolve(spec["height"]) if "height" in spec else None
    return (w, h)


def is_interactive(node):
    if node.tag in INTERACTIVE_TAGS:
        return True
    if node.tag == "input" and node.attrs.get("type", "text").lower() in INTERACTIVE_INPUT:
        return True
    role = node.attrs.get("role", "").lower()
    if role in {"button", "link", "checkbox", "switch", "tab", "menuitem"}:
        return True
    if "onclick" in node.attrs:
        return True
    # WeChat mini-program tap bindings: bindtap, catchtap, bind:tap, catch:tap
    return any((k.startswith("bind") or k.startswith("catch")) and "tap" in k
               for k in node.attrs)


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


def _resolve_gap_px(parent, rules):
    """Resolve the smallest flexbox/grid gap declared on a parent (the gap
    between its adjacent children). Returns (value_px, resolvable):
      (float, True)   a resolved smallest gap.
      (None, True)    no gap declared (so gap does not constrain spacing).
      (None, False)   gap IS declared but a side could not be parsed.
    """
    if parent is None:
        return (None, True)
    own = declared(parent, rules)
    raw = None
    for key in ("gap", "grid-gap"):
        if key in own:
            raw = own[key]
            break
    sub = []
    for key in ("row-gap", "column-gap", "grid-row-gap", "grid-column-gap"):
        if key in own:
            sub.append(own[key])
    if raw is None and not sub:
        return (None, True)
    vals = []
    if raw is not None:
        for part in raw.split():
            px = parse_length_px(part)
            if px is None:
                return (None, False)
            vals.append(px)
    for s in sub:
        px = parse_length_px(s)
        if px is None:
            return (None, False)
        vals.append(px)
    return (min(vals) if vals else None, True)


# --- analysis ----------------------------------------------------------------

TEXT_TAGS = {"p", "span", "div", "label", "a", "button", "h1", "h2", "h3",
             "h4", "h5", "h6", "li", "td", "th", "small", "strong", "em"}
STATE_CLASS_RE = re.compile(r"(status|state|badge|indicator|dot|tag|label|pill)", re.I)


def _is_bold(node, rules):
    """True if the node's effective font-weight is bold (>=700 or 'bold')."""
    fw = resolved(node, rules, "font-weight", inherit=True, default="normal")
    fw = str(fw).strip().lower()
    if fw in ("bold", "bolder"):
        return True
    m = re.fullmatch(r"\d+", fw)
    return bool(m) and int(fw) >= 700


def _large_text(font_px, bold, tokens):
    """WCAG large-text tier: >=18.66px bold OR >=24px (normal). Large text uses
    the looser 3:1/4.5:1 contrast tier."""
    if bold and font_px >= tokens["contrast"].get("large_text_bold_min_px", 18.66):
        return True
    return font_px >= tokens["contrast"]["large_text_min_px"]


def analyze(root, rules, tokens, *, conditional=None, is_wxml=False):
    conditional = conditional or set()
    findings = []
    needs = []
    fid = [0]
    flagged_conditional = set()

    def is_conditional(node):
        key = (node.tag, frozenset(node.classes), node.id)
        # match against any conditional selector key that this node satisfies
        for ct, ccls, cid in conditional:
            if ct and ct != node.tag:
                continue
            if ccls and not ccls.issubset(set(node.classes)):
                continue
            if cid and cid != node.id:
                continue
            return True
        return False

    def add(rule, severity, node, *, tier, standard, **extra):
        fid[0] += 1
        f = {"id": f"f{fid[0]}", "rule": rule, "severity": severity,
             "location": node.descr(), "tier": tier, "standard": standard}
        f.update(extra)
        findings.append(f)

    def flag(reason, node_or_loc):
        loc = node_or_loc.descr() if isinstance(node_or_loc, Node) else node_or_loc
        needs.append({"reason": reason, "location": loc})

    def note_conditional(node):
        if isinstance(node, Node) and is_conditional(node):
            if node.descr() not in flagged_conditional:
                flagged_conditional.add(node.descr())
                flag("media_conditional", node)

    ct, tg, sp, fs = (tokens["contrast"], tokens["target_size"],
                      tokens["spacing"], tokens["font_size"])
    STD_WCAG = "WCAG 2.2 baseline"
    STD_FIELD = "field-elevated (engineering recommendation, not a standard)"

    for node in walk(root):
        if node.tag in ("#root", "style", "script", "head", "meta", "title"):
            continue
        own = declared(node, rules)
        has_text = bool(node.text.strip())

        # font-size resolution (shared by font_size + contrast + target_size)
        font_px = resolve_font_size_px(node, rules) if (has_text or is_interactive(node)) else None
        font_unresolved = font_px is FONT_REL_UNRESOLVED

        # --- font_size (direct text only) ---
        if has_text:
            note_conditional(node)
            if font_unresolved:
                flag("font_size_relative_unresolved", node)
            else:
                if font_px < fs["baseline_px"]:
                    add("font_size", "critical", node, measured=round(font_px, 2),
                        threshold=fs["baseline_px"], axis="low_light",
                        tier="critical", standard=STD_WCAG,
                        fix_hint=f"raise font-size to >= {fs['field_body_px']}px")
                elif font_px < fs["field_body_px"]:
                    add("font_size", "major", node, measured=round(font_px, 2),
                        threshold=fs["field_body_px"], axis="low_light",
                        tier="major", standard=STD_FIELD,
                        fix_hint=f"raise font-size to >= {fs['field_body_px']}px "
                        f"({fs['field_critical_px']}px for critical labels)")

        # --- contrast (direct text only) ---
        if has_text:
            fg_raw = resolved(node, rules, "color", inherit=True, default="#000000")
            fg = parse_color(fg_raw)
            bg_kind, bg_val = (None, None)
            if fg is None:
                # an UNRESOLVED foreground color. A leftover var() means a CSS
                # variable truly did not resolve; everything else (currentColor,
                # color-mix(), a named color outside our table) is NOT a CSS var.
                if "var(" in (fg_raw or ""):
                    flag("css_var_unresolved", node)
                else:
                    flag("unresolved_color", node)
            elif font_unresolved:
                # font-size feeds the large-text tier; without it the tier (and
                # thus the threshold) is unprovable -> already flagged above.
                pass
            else:
                bg_kind, bg_val = resolve_bg(node, rules)
                if bg_kind == "image":
                    flag("bg_image", node)
                elif bg_kind == "unparsed":
                    flag("unresolved_color", node)
                elif bg_kind == "undeclared":
                    flag("bg_undeclared", node)
            if fg is not None and not font_unresolved and bg_kind == "color":
                bg = bg_val
                fg_rgb = _composite(fg, (bg[0], bg[1], bg[2], 1.0)) if fg[3] < 1 else fg[:3]
                ratio = round(contrast_ratio(fg_rgb, bg), 2)
                bold = _is_bold(node, rules)
                large = _large_text(font_px, bold, tokens)
                base = ct["baseline"]["large_text" if large else "text"]
                field = ct["field"]["large_text" if large else "text"]
                if ratio < base:
                    note_conditional(node)
                    add("contrast", "critical", node, measured=ratio, threshold=base,
                        axis="glare", tier="critical", standard=STD_WCAG,
                        fix_hint="increase fg/bg contrast to >= "
                        f"{field}:1 (currently {ratio}:1)")
                elif ratio < field:
                    note_conditional(node)
                    add("contrast", "major", node, measured=ratio, threshold=field,
                        axis="glare", tier="major", standard=STD_FIELD,
                        fix_hint=f"raise contrast to >= {field}:1 for glare")

        # --- interactive checks ---
        if is_interactive(node):
            # target_size — honor min-width/min-height as a guaranteed floor
            w = floor_dim(parse_length_px(own.get("width")),
                          parse_length_px(own.get("min-width")))
            h = floor_dim(parse_length_px(own.get("height")),
                          parse_length_px(own.get("min-height")))
            # A size DECLARED in a unit we can't resolve to px (vmin/vw/vh/%/calc/
            # auto) must NOT fall through to a UA default — that would fabricate a
            # finding for a control that is in fact sized. Detect it and flag.
            w_declared_unresolved = _declared_but_unresolvable(own, ("width", "min-width"))
            h_declared_unresolved = _declared_but_unresolvable(own, ("height", "min-height"))
            # height from font-size + vertical padding (only if both resolvable)
            if h is None and not h_declared_unresolved:
                pt, _, pb, _ = expand_box(own, "padding")
                if not font_unresolved and font_px is not None and (pt is not None or pb is not None):
                    h = font_px + (pt or 0) + (pb or 0)
            # UA-default control box ONLY when NO size is declared at all (neither
            # explicit, derived, nor declared-but-unresolvable).
            ua_used = False
            size_declared_unresolved = w_declared_unresolved or h_declared_unresolved
            if w is None and h is None and not size_declared_unresolved:
                uw, uh = _ua_default_dims(node, is_wxml)
                if uw is not None or uh is not None:
                    w, h, ua_used = uw, uh, True
            dims = [d for d in (w, h) if d is not None]
            both_known = w is not None and h is not None
            if size_declared_unresolved and not dims:
                # a size IS declared but in a unit we cannot resolve to px ->
                # never substitute a UA default (it would fabricate a finding)
                flag("target_size_unresolved", node)
            elif not dims:
                # no explicit size, no derivable height, and no known UA default
                uw, uh = _ua_default_dims(node, is_wxml)
                if uw is None and uh is None and node.tag not in UA_DEFAULT_BOX_HTML \
                        and (("wx", node.tag) not in UA_DEFAULT_BOX):
                    flag("target_size_no_uadefault", node)
                else:
                    flag("target_size_unresolved", node)
            else:
                note_conditional(node)
                size = min(dims)
                if size < tg["baseline_px"]:
                    add("target_size", "critical", node, measured=round(size, 2),
                        threshold=tg["baseline_px"], axis="gloves",
                        tier="critical", standard=STD_WCAG,
                        fix_hint=f"enlarge target to >= {tg['field_px']}px (gloves)")
                elif size < tg["field_px"]:
                    add("target_size", "major", node, measured=round(size, 2),
                        threshold=tg["field_px"], axis="gloves",
                        tier="major", standard=STD_FIELD,
                        fix_hint=f"enlarge target to >= {tg['field_px']}px (gloves; "
                        f"{tg['recommended_px']}px ideal)")
                elif not both_known:
                    # passes on the one known axis, but the other is unknown
                    flag("target_size_unresolved", node)

            # icon_only: field needs a VISIBLE text label; an aria-label alone is
            # a weak fallback under glare, so it downgrades rather than clears.
            if not text_content(node):
                if accessible_name(node):
                    add("icon_only", "minor", node, axis="glare",
                        tier="major", standard=STD_FIELD,
                        fix_hint="add a visible text label (aria-label alone is weak under glare)")
                else:
                    add("icon_only", "major", node, axis="glare",
                        tier="major", standard=STD_FIELD,
                        fix_hint="add a visible text label or aria-label")

            # spacing vs ADJACENT interactive controls (same-parent siblings AND
            # controls one wrapper away). Checks BOTH margin and flexbox/grid gap.
            _spacing_check(node, own, rules, sp, add, flag, STD_FIELD)

        # --- color_only (state conveyed by color alone) ---
        if (not is_interactive(node) and not text_content(node)
                and any(STATE_CLASS_RE.search(c) for c in node.classes)):
            if parse_color(own.get("background-color")) is not None \
                    or parse_color(own.get("color")) is not None:
                has_icon = any(n.tag in ("svg", "img", "i", "use") for n in walk(node)
                               if n is not node)
                if not has_icon:
                    note_conditional(node)
                    add("color_only", "major", node, axis="glare",
                        tier="major", standard=STD_FIELD,
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


def _adjacent_interactive(node):
    """Interactive controls visually adjacent to `node`: same-parent siblings,
    PLUS controls reached across a single non-interactive wrapper (the wrapper's
    interactive children, and the parent's interactive siblings). Honest
    over-approximation of visual adjacency without layout."""
    out = []
    if node.parent is None:
        return out
    for c in node.parent.children:
        if c is not node and is_interactive(c):
            out.append(c)
    # cross single wrapper: the parent's interactive siblings (uncles), and
    # the interactive children of those single-child wrappers next to us.
    gp = node.parent.parent
    if gp is not None:
        for uncle in gp.children:
            if uncle is node.parent:
                continue
            if is_interactive(uncle):
                out.append(uncle)
            else:
                # a wrapper sibling — its direct interactive children sit adjacent
                for c in uncle.children:
                    if is_interactive(c):
                        out.append(c)
    return out


def _spacing_check(node, own, rules, sp, add, flag, std_field):
    """Spacing between adjacent interactive controls. Considers margin on this
    control AND the flexbox/grid gap on its parent. Prove-or-flag: an undeclared
    gap means gap does not constrain; an unparseable gap -> needs_judgment."""
    adj = _adjacent_interactive(node)
    if len(adj) < 1:
        return
    candidates = []  # resolved spacing values to compare against the threshold
    # margins on this control
    mt, mr, mb, ml = expand_box(own, "margin")
    margins = [m for m in (mt, mr, mb, ml) if m is not None]
    if margins:
        candidates.append(min(margins))
    # flexbox/grid gap on the parent (governs sibling spacing)
    gap_px, gap_ok = _resolve_gap_px(node.parent, rules)
    if not gap_ok:
        flag("spacing_unresolved", node)
        return
    if gap_px is not None:
        candidates.append(gap_px)
    if not candidates:
        return
    smallest = min(candidates)
    if smallest < sp["field_px"]:
        add("spacing", "minor", node, measured=round(smallest, 2),
            threshold=sp["field_px"], axis="gloves",
            tier="major", standard=std_field,
            fix_hint=f"increase gap to >= {sp['field_px']}px between targets")


# --- orchestration (importable) ----------------------------------------------

def analyze_html(html, tokens, *, css_extra=None, selector=None,
                 viewport_px=375, target_name=None, is_wxml=None):
    """Analyze an HTML/WXML string; return the findings result dict.

    css_extra   external stylesheet body to merge (a linked .css or a .wxss).
    selector    restrict analysis to nodes matching this simple selector.
    viewport_px viewport width used to resolve rpx units (750rpx == viewport).
    is_wxml     WeChat mini-program context. PREFER passing this explicitly from
                the file extension (.wxml/.wxss) — see analyze_path. When None it
                is sniffed from mini-program-EXCLUSIVE markers in the source, but
                that is a fallback: a `.wxml` with only shared tags (e.g. a lone
                <button>) would otherwise be mis-detected as HTML and get the
                wrong 21px UA default instead of WeChat's ~48px.
    """
    global _VIEWPORT_PX
    _VIEWPORT_PX = viewport_px
    builder = TreeBuilder()
    builder.feed(html)
    if is_wxml is None:
        # fallback sniff: mini-program-EXCLUSIVE markers only. <button> is shared
        # with HTML so it must NOT be a trigger (it would mis-apply the WeChat
        # UA-default box to plain HTML buttons).
        is_wxml = bool(re.search(
            r"<(view|cover-view|scroll-view|navigator|cover-image|movable-view|swiper)\b", html)) \
            or "bindtap" in html or "catchtap" in html or "bind:tap" in html or "catch:tap" in html
    css_blocks = list(builder.style_css)
    if css_extra:
        css_blocks.append(css_extra)
    rules, varmap, conditional, unparsed, imports = parse_stylesheet("\n".join(css_blocks))
    for rule in rules:
        decls = rule["decls"]
        for k in list(decls):
            decls[k] = resolve_value(decls[k], varmap)
    for node in walk(builder.root):
        for k in list(node.inline):
            node.inline[k] = resolve_value(node.inline[k], varmap)
    roots = _selector_roots(builder.root, selector) if selector else [builder.root]
    result = _analyze_roots(roots, rules, tokens, conditional=conditional, is_wxml=is_wxml)
    # unparsed CSS blocks -> never silently dropped
    for sel in unparsed:
        result["needs_judgment"].append({"reason": "css_rule_unparsed",
                                          "location": f"selector {sel!r}"})
    # @import of a sheet we did not read -> external_stylesheet, never a drop
    for href in imports:
        result["needs_judgment"].append(
            {"reason": "external_stylesheet", "location": f"@import {href!r}"})
    if selector and not roots:
        result["needs_judgment"].append({"reason": "selector_no_match", "location": selector})
    if target_name is not None:
        result["target"] = target_name
    if not selector:
        for href in builder.external_links:
            result["needs_judgment"].append(
                {"reason": "external_stylesheet", "location": f"<link href={href!r}>"})
    result["summary"]["needs_judgment_count"] = len(result["needs_judgment"])
    return result


def _selector_roots(root, selector):
    """Return the subtree roots matching a simple selector (component scope)."""
    want = parse_simple_selector(selector)
    if want is None:
        return [root]
    tag, classes, sid = want
    out = []
    for node in walk(root):
        if node.tag in ("#root", "style", "script", "head"):
            continue
        if tag and tag != node.tag:
            continue
        if classes and not classes.issubset(set(node.classes)):
            continue
        if sid and sid != node.id:
            continue
        out.append(node)
    return out


def _analyze_roots(roots, rules, tokens, *, conditional=None, is_wxml=False):
    """Run analyze() over one or more subtree roots and merge findings."""
    if len(roots) == 1 and roots[0].tag == "#root":
        return analyze(roots[0], rules, tokens, conditional=conditional, is_wxml=is_wxml)
    merged = {"summary": {"score": 100,
                          "by_severity": {"critical": 0, "major": 0, "minor": 0},
                          "resolved_count": 0, "needs_judgment_count": 0},
              "findings": [], "needs_judgment": []}
    for r in roots:
        wrapper = Node("#root", {}, 0)
        wrapper.children = [r]
        part = analyze(wrapper, rules, tokens, conditional=conditional, is_wxml=is_wxml)
        merged["findings"].extend(part["findings"])
        merged["needs_judgment"].extend(part["needs_judgment"])
    for i, f in enumerate(merged["findings"], 1):
        f["id"] = f"f{i}"
    weight = {"critical": 15, "major": 7, "minor": 3}
    merged["summary"]["score"] = max(0, 100 - sum(
        weight[f["severity"]] for f in merged["findings"]))
    for s in ("critical", "major", "minor"):
        merged["summary"]["by_severity"][s] = sum(
            1 for f in merged["findings"] if f["severity"] == s)
    merged["summary"]["resolved_count"] = len(merged["findings"])
    merged["summary"]["needs_judgment_count"] = len(merged["needs_judgment"])
    return merged


def read_text_tolerant(path):
    """Read a text file without ever crashing on a bad byte sequence.

    Tries UTF-8 (incl. BOM), then latin-1, finally utf-8 with replacement. A
    non-UTF-8 target (e.g. a GBK-encoded legacy .wxss) must NOT raise a
    UnicodeDecodeError — the analyzer always emits schema-valid JSON."""
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            with open(path, encoding=enc) as fh:
                return fh.read()
        except UnicodeDecodeError:
            continue
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def _is_wx_path(path):
    """WeChat context is determined by file extension (.wxml/.wxss), per-file —
    NOT by sniffing which tags happen to appear in the source."""
    return os.path.splitext(path)[1].lower() in (".wxml", ".wxss")


def analyze_path(path, tokens=None, **kwargs):
    """Read a file and analyze it; tokens default to the bundled design-tokens.

    WeChat context is taken from the file EXTENSION (.wxml) unless the caller
    overrides `is_wxml` — so a `.wxml` containing only shared tags (e.g. a lone
    <button>) still gets WeChat UA defaults, not the HTML 21px default."""
    if tokens is None:
        tokens = load_tokens(None)
    html = read_text_tolerant(path)
    kwargs.setdefault("target_name", os.path.basename(path))
    if "is_wxml" not in kwargs and _is_wx_path(path):
        kwargs["is_wxml"] = True
    return analyze_html(html, tokens, **kwargs)


# --- cli ---------------------------------------------------------------------

def load_tokens(path):
    if path is None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "..", "references", "design-tokens.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Low-visibility UI analyzer")
    ap.add_argument("target", help="path to an .html / .wxml file")
    ap.add_argument("--tokens", help="path to design-tokens.json")
    ap.add_argument("--css", help="external stylesheet (.css/.wxss) to merge for an exact audit")
    ap.add_argument("--selector", help="restrict analysis to nodes matching this simple selector")
    ap.add_argument("--viewport-px", type=int, default=375,
                    help="viewport width for rpx resolution (default 375; 750rpx == viewport)")
    ap.add_argument("--json", action="store_true",
                    help="print compact JSON (default is pretty)")
    args = ap.parse_args(argv)

    if not os.path.isfile(args.target):
        print(f"error: not a file: {args.target}", file=sys.stderr)
        return 2
    css_extra = None
    if args.css:
        if not os.path.isfile(args.css):
            print(f"error: not a file: {args.css}", file=sys.stderr)
            return 2
        css_extra = read_text_tolerant(args.css)
    tokens = load_tokens(args.tokens)
    result = analyze_path(args.target, tokens, css_extra=css_extra,
                          selector=args.selector, viewport_px=args.viewport_px)
    indent = None if args.json else 2
    print(json.dumps(result, ensure_ascii=False, indent=indent))
    # exit code: 0 clean, 1 findings present (useful for CI / verify step)
    return 1 if result["summary"]["resolved_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
