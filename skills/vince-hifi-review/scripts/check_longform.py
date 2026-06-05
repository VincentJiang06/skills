#!/usr/bin/env python3
"""Long-form 评测长文 QA: CJK 字 count + required sections + optional backing-JSON gate.

Usage:
  python3 scripts/check_longform.py <review.md> --class transducer|source \
      [--min 3500 --max 4500] [--backing <evaluation.json>]
Exit 0 if all pass, 1 on any violation.
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Each entry is a section that must appear; satisfied if ANY of its keywords is present.
REQUIRED = {
    "transducer": [["定位", "开篇"], ["测量"], ["三频", "频段", "低频"], ["风格", "调音"],
                   ["技术力", "声场"], ["搭配", "驱动"], ["总结", "适用"], ["证据", "附录"]],
    "source": [["定位", "开篇"], ["测量"], ["透明", "素质"], ["匹配", "推力", "驱动"],
               ["芯片", "拓扑"], ["总结", "适用", "场景"], ["证据", "附录"]],
}


def cjk_count(text):
    return len(re.findall(r"[一-鿿]", text))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("review")
    ap.add_argument("--class", dest="klass", choices=["transducer", "source"], default="transducer")
    ap.add_argument("--min", type=int, default=3500)
    ap.add_argument("--max", type=int, default=4500)
    ap.add_argument("--backing", default="")
    args = ap.parse_args()

    text = open(args.review, encoding="utf-8").read()
    errs = []

    n = cjk_count(text)
    if not (args.min <= n <= args.max):
        errs.append(f"length {n} 字 outside [{args.min},{args.max}]")

    for group in REQUIRED[args.klass]:
        if not any(k in text for k in group):
            errs.append(f"missing section (need one of {group})")

    if args.backing:
        sys.path.insert(0, HERE)
        from validate_output import check  # noqa: E402
        schema = json.load(open(os.path.join(ROOT, "schemas", "evaluation.schema.json")))
        doc = json.load(open(args.backing))
        errs += [f"backing: {e}" for e in check(doc, schema)]

    print(f"字 count: {n}  (target {args.min}-{args.max})")
    for e in errs:
        print("VIOLATION:", e)
    print("OK" if not errs else "FAIL (%d)" % len(errs))
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()
