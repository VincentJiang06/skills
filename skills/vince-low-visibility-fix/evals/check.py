#!/usr/bin/env python3
"""L1 contract test for the low-visibility analyzer.

For every `fixtures/*.expected.json` golden file, run `scripts/analyze.py` on
the matching `.html` and assert the parsed output equals the golden. Exit
non-zero if any fixture drifts. No third-party dependencies.

Usage:
    python3 evals/check.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ANALYZE = os.path.join(ROOT, "scripts", "analyze.py")
FIXTURES = os.path.join(HERE, "fixtures")


def run_analyzer(html_path):
    proc = subprocess.run([sys.executable, ANALYZE, html_path],
                          capture_output=True, text=True)
    if proc.returncode not in (0, 1):  # 0 clean, 1 findings present
        raise RuntimeError(f"analyzer crashed on {html_path}:\n{proc.stderr}")
    return json.loads(proc.stdout)


def main():
    goldens = sorted(f for f in os.listdir(FIXTURES) if f.endswith(".expected.json"))
    if not goldens:
        print("no golden fixtures found", file=sys.stderr)
        return 1
    failures = 0
    for golden in goldens:
        html = golden.replace(".expected.json", ".html")
        html_path = os.path.join(FIXTURES, html)
        with open(os.path.join(FIXTURES, golden), encoding="utf-8") as fh:
            expected = json.load(fh)
        actual = run_analyzer(html_path)
        if actual == expected:
            s = actual["summary"]
            print(f"PASS  {html}  (score={s['score']} "
                  f"findings={s['resolved_count']} needs_judgment={s['needs_judgment_count']})")
        else:
            failures += 1
            print(f"FAIL  {html}")
            es, as_ = expected["summary"], actual["summary"]
            print(f"      expected: score={es['score']} findings={es['resolved_count']} "
                  f"needs_judgment={es['needs_judgment_count']}")
            print(f"      actual:   score={as_['score']} findings={as_['resolved_count']} "
                  f"needs_judgment={as_['needs_judgment_count']}")
    total = len(goldens)
    print(f"\n{total - failures}/{total} fixtures passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
