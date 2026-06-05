#!/usr/bin/env python3
"""Deterministically generate review-markdown fixtures at EXACT CJK-字 counts,
plus padding-hazard fixtures. Run once to (re)materialize fixtures; the harness
reads the committed .md files, not this generator.

CJK 字 = regex [一-鿿] only (the locked counting rule). Latin/digits/punct/whitespace
do NOT count, so we can pad freely with non-汉字 without moving the 字 count.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

# A pool of common 汉字 to fill body prose. Repetition is fine; the validator
# counts 汉字, it does not judge novelty.
FILLER = ("这张专辑在录音与编曲层面展现了相当成熟的音乐语言整体听感细腻而富有层次"
          "旋律线条清晰节奏推进自然乐手之间的互动也颇具默契值得反复聆听细细品味其中"
          "的情绪起伏与结构安排作品的主题在不同段落里被反复提及又加以变形发展")

CJK_RE = re.compile(r"[一-鿿]")


def cjk_count(text):
    return len(CJK_RE.findall(text))


def filler_for(n):
    """Return a string containing exactly n 汉字 (drawn from FILLER, no non-汉字)."""
    pool = [c for c in FILLER if CJK_RE.match(c)]
    out = []
    i = 0
    while len(out) < n:
        out.append(pool[i % len(pool)])
        i += 1
    return "".join(out)


# Section header text per class. The body of each section is filler 汉字; the
# header words are what the section linter greps for. We split the total 汉字
# budget across sections so headers + body together hit EXACTLY `target`.
STANDARD_SECTIONS = [
    "## 开篇与定位",
    "## 艺术家与背景",
    "## 创作与录制源起",
    "## 逐曲分析",
    "## 制作编曲与声音",
    "## 历史文化与批评语境",
    "## 横向比较与参考录音",
    "## 总评与适配",
    "## 证据附录",
]

CLASSICAL_SECTIONS = [
    "## 开篇与定位",
    "## 作曲家与作品背景",
    "## 创作与录制源起",
    "## 作品本体分析",          # WORK
    "## 演绎与演奏诠释",        # PERFORMANCE
    "## 制作与声音",
    "## 历史文化与批评语境",
    "## 参考录音与版本比较",    # reference-recording comparison
    "## 总评与适配",
    "## 证据附录",
]


def build_review(sections, target, missing_section=None, latin_pad="", lead=""):
    """Compose a markdown review with the given section headers whose total 汉字
    count == target. Optionally omit one section. latin_pad is appended (non-汉字,
    does not change the 字 count) to test the CJK-only rule."""
    secs = [s for s in sections if s != missing_section]
    # Count 汉字 already present in headers + lead.
    header_zi = sum(cjk_count(s) for s in secs)
    lead_zi = cjk_count(lead)
    body_zi = target - header_zi - lead_zi
    if body_zi < 0:
        raise ValueError("target too small for headers")
    per = body_zi // len(secs)
    rem = body_zi - per * len(secs)
    parts = []
    if lead:
        parts.append(lead + "\n")
    for idx, s in enumerate(secs):
        extra = rem if idx == 0 else 0
        parts.append(s + "\n\n" + filler_for(per + extra) + "\n")
    text = "\n".join(parts)
    if latin_pad:
        text += "\n\n" + latin_pad + "\n"
    return text


def write(name, text):
    p = os.path.join(HERE, name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(text)
    return cjk_count(text)


def main():
    results = {}

    # good_pop_12k — in-window, full standard section coverage.
    results["good_pop_12k.md"] = write("good_pop_12k.md", build_review(STANDARD_SECTIONS, 12000))

    # under_floor_9999 — one under floor.
    results["under_floor_9999.md"] = write("under_floor_9999.md", build_review(STANDARD_SECTIONS, 9999))

    # over_ceiling_15001 — one over ceiling.
    results["over_ceiling_15001.md"] = write("over_ceiling_15001.md", build_review(STANDARD_SECTIONS, 15001))

    # missing_section — drop 证据附录, otherwise in-window.
    results["missing_section.md"] = write(
        "missing_section.md", build_review(STANDARD_SECTIONS, 12000, missing_section="## 证据附录"))

    # cjk_padding_fails_floor — only ~500 真·汉字 but padded with lots of Latin/digits/punct.
    latin = ("Lorem ipsum dolor sit amet 1234567890 !!! ??? --- === " * 400)
    results["cjk_padding_fails_floor.md"] = write(
        "cjk_padding_fails_floor.md", build_review(STANDARD_SECTIONS, 500, latin_pad=latin))

    # classical_workperf — classical sections (WORK vs PERFORMANCE + 参考录音), in-window.
    results["classical_workperf.md"] = write("classical_workperf.md", build_review(CLASSICAL_SECTIONS, 13000))

    # genre_mismatch_pop_missing_movements — a pop LP that does NOT carry the
    # classical 作品/演绎/参考录音 sections. Under the standard linter it PASSes;
    # under the classical linter it FAILs (the pop template was not forced into
    # classical, and a symphony graded with --class standard would miss the work/perf split).
    results["genre_mismatch_pop.md"] = write("genre_mismatch_pop.md", build_review(STANDARD_SECTIONS, 11000))

    # obscure_degraded — thin-info: explicit 资料不足 marker, in-window, no fabricated specifics.
    lead = "本篇说明公开资料有限存在资料不足之处下文凡涉及事实之处均严格标注来源未能证实者一律不写"
    results["obscure_degraded.md"] = write(
        "obscure_degraded.md", build_review(STANDARD_SECTIONS, 10500, lead=lead))

    # release_form_box — non-standard release form (box set), unit adapts (逐碟 wording), in-window.
    box_sections = list(STANDARD_SECTIONS)
    box_sections[3] = "## 逐碟与逐曲分析"
    results["release_form_box.md"] = write("release_form_box.md", build_review(box_sections, 12500))

    for k, v in sorted(results.items()):
        print(f"{k}: {v} 字")


if __name__ == "__main__":
    main()
