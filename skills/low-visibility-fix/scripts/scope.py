"""Targeted-scope resolution for the low-visibility audit.

`resolve_scope` decides WHICH files one audit round covers — the contract other
agents drive to keep cheap, multi-round runs scoped:

- a file target            -> just that file
- a dir + explicit pages   -> exactly those (missing ones reported; ALL missing
                              -> status "empty_scope", never a full-scan fallback)
- a dir + no pages         -> a BOUNDED default (first max_pages files, sorted),
                              with `bounded: true` when it truncated — never an
                              unbounded crawl.
"""
import os

EXTS = (".html", ".htm", ".wxml")


class ScopeError(Exception):
    pass


def _candidates(directory):
    out = []
    for name in sorted(os.listdir(directory)):
        if name.startswith("."):
            continue
        p = os.path.join(directory, name)
        if os.path.isfile(p) and name.lower().endswith(EXTS):
            out.append(p)
    return out


def _match_pages(directory, page):
    """Resolve a requested page name (with or without extension) to file(s).
    A bare name may match multiple extensions (e.g. page.html AND page.wxml) —
    return all so neither is silently dropped."""
    out = []
    cand = os.path.join(directory, page)
    if os.path.isfile(cand):
        out.append(cand)
    for ext in EXTS:
        p = os.path.join(directory, page + ext)
        if os.path.isfile(p) and p not in out:
            out.append(p)
    return out


def resolve_scope(target, pages=None, selector=None, max_pages=20):
    target = os.path.abspath(target)
    result = {"target": target, "files": [], "requested": [], "missing": [],
              "bounded": False, "selector": selector, "status": "ok"}

    if os.path.isfile(target):
        result["files"] = [target]
        result["requested"] = [os.path.basename(target)]
        return result

    if not os.path.isdir(target):
        result["status"] = "empty_scope"
        result["missing"] = list(pages) if pages else [os.path.basename(target)]
        return result

    if pages:
        result["requested"] = list(pages)
        seen = set()
        for pg in pages:
            matches = _match_pages(target, pg)
            if not matches:
                result["missing"].append(pg)
            for m in matches:
                rp = os.path.realpath(m)
                if rp not in seen:        # dedup repeated/overlapping requests
                    seen.add(rp)
                    result["files"].append(m)
        if not result["files"]:
            result["status"] = "empty_scope"
        return result

    # No explicit pages: bounded default scan.
    cand = _candidates(target)
    result["requested"] = ["<default>"]
    result["files"] = cand[:max_pages]
    result["bounded"] = len(cand) > max_pages
    if not result["files"]:
        result["status"] = "empty_scope"
    return result
