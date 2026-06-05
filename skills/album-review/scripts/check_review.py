#!/usr/bin/env python3
"""Long-form 乐评 QA: CJK-字 window + genre-adapted required sections
+ optional backing-JSON traceability gate + an adjacent-input route classifier.

中文字符 = CJK 汉字 ONLY, regex [一-鿿] (locked rule). Latin / digits / punctuation
do NOT count toward the [min,max] window, so non-汉字 padding cannot fake the floor.

Usage:
  python3 scripts/check_review.py <review.md> [--class standard|classical]
      [--min 10000 --max 15000] [--backing <backing.json>]
Exit 0 if all pass, 1 on any violation.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Each entry is a required section; satisfied if ANY of its keywords appears.
# standard: pop/rock/jazz/electronic/soundtrack/world etc.
# classical: WORK vs PERFORMANCE must be separately checkable + a reference-recording
#            comparison section, so the linter can verify work-vs-performance rigor.
REQUIRED = {
    "standard": [
        ["开篇", "定位"],
        ["艺术家", "作曲家", "乐队", "背景"],
        ["创作", "录制", "源起"],
        ["逐曲", "逐碟", "逐乐章", "分析"],
        ["制作", "编曲", "声音", "混音"],
        ["历史", "文化", "语境", "批评"],
        ["比较", "参考"],
        ["总评", "总结", "适配", "评分"],
        ["证据", "附录"],
    ],
    "classical": [
        ["开篇", "定位"],
        ["作曲家", "作品背景", "背景"],
        ["创作", "录制", "源起"],
        ["作品本体", "作品分析", "曲式", "总谱"],          # WORK
        ["演绎", "演奏", "诠释", "指挥", "独奏"],            # PERFORMANCE
        ["制作", "声音", "录音"],
        ["历史", "文化", "语境", "批评"],
        ["参考录音", "版本比较", "版本"],                    # reference-recording comparison
        ["总评", "总结", "适配", "评分"],
        ["证据", "附录"],
    ],
}

CJK_RE = re.compile(r"[一-鿿]")


def cjk_count(text):
    """Count CJK 汉字 only. Latin, digits, punctuation, whitespace excluded."""
    return len(CJK_RE.findall(text))


def check_review(text, klass="standard", min_n=10000, max_n=15000, backing_path=""):
    """Return a list of violation strings (empty == pass)."""
    errs = []

    n = cjk_count(text)
    if n < min_n:
        errs.append(f"length {n} 字 below floor {min_n}")
    elif n > max_n:
        errs.append(f"length {n} 字 above ceiling {max_n}")

    groups = REQUIRED.get(klass, REQUIRED["standard"])
    for group in groups:
        if not any(k in text for k in group):
            errs.append(f"missing section (need one of {group})")

    if backing_path:
        sys.path.insert(0, HERE)
        from validate_backing import check as backing_check  # noqa: E402
        schema = json.load(open(os.path.join(ROOT, "schemas", "backing.schema.json"), encoding="utf-8"))
        doc = json.load(open(backing_path, encoding="utf-8"))
        errs += [f"backing: {e}" for e in backing_check(doc, schema)]

    return errs


# --- adjacent-input route classifier (edge 10) -----------------------------
# Lightweight guard so an agent can route obviously-not-album-review inputs away
# BEFORE producing a 乐评. Album-review fires only on (a primary credit + an album)
# intent; gear -> hifi-review; bare lyric translation / buying advice -> out.
_HIFI = re.compile(r"耳机|耳塞|DAC|dac|解码|耳放|功放|音箱|推得动|推不推|声卡|SINAD|塞子")
_TRANSLATE = re.compile(r"翻译.*歌词|歌词.*翻译|translate.*lyric|lyric.*translat")
_BUY = re.compile(r"推荐.*买|买.*推荐|哪里买|哪.*购|值不值得买|recommend.*buy|buy.*recommend|where to (buy|stream)")
_ALBUM = re.compile(r"乐评|专辑|album review|review of|评测.*专辑|专辑.*评测|review.*album")


def classify_route(prompt):
    """Return one of: 'album-review' | 'hifi-review' | 'out-of-scope'."""
    if _HIFI.search(prompt):
        return "hifi-review"
    if _TRANSLATE.search(prompt):
        return "out-of-scope"
    if _BUY.search(prompt):
        return "out-of-scope"
    if _ALBUM.search(prompt):
        return "album-review"
    return "out-of-scope"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("review")
    ap.add_argument("--class", dest="klass", choices=["standard", "classical"], default="standard")
    ap.add_argument("--min", type=int, default=10000)
    ap.add_argument("--max", type=int, default=15000)
    ap.add_argument("--backing", default="")
    args = ap.parse_args()

    # Operational error paths (missing review/backing file, malformed backing JSON)
    # fail gracefully: a single `ERROR:` line to stderr + nonzero exit — never a raw
    # traceback. The nonzero exit keeps the ship-blocking contract intact.
    try:
        text = open(args.review, encoding="utf-8").read()
        errs = check_review(text, klass=args.klass, min_n=args.min, max_n=args.max, backing_path=args.backing)
    except FileNotFoundError as e:
        print(f"ERROR: file not found: {e.filename}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: malformed JSON in backing file: {e}", file=sys.stderr)
        sys.exit(1)

    n = cjk_count(text)
    print(f"字 count: {n}  (target {args.min}-{args.max}, class={args.klass})")
    for e in errs:
        print("VIOLATION:", e)
    print("OK" if not errs else "FAIL (%d)" % len(errs))
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()
