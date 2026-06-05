---
name: album-review
version: 0.1.0
description: >
  Deep, source-traceable long-form Chinese album review (乐评). Use when the user
  supplies a primary music credit (歌手 / 作曲家 / 指挥家 / 乐队 / 演奏家) + an album
  name and wants ONE comprehensive 10,000–15,000-中文字符 critique across every
  musical dimension — any idiom: pop/rock, classical (work vs performance +
  reference-recording comparison), jazz, electronic, hip-hop, folk, soundtrack,
  world. Triggers: "给 <艺术家/作曲家/指挥家> 的专辑 <名称> 写一篇深度乐评",
  "全面评测这张专辑", "comprehensive album review of <album> by <artist>",
  "$album-review". Do NOT use for: audio-gear evaluation ("这条耳机声音怎么样",
  "这个 DAC 推得动吗" → hifi-review); buying / price / where-to-stream advice;
  bare lyric translation with no critical content; non-music subjects.
---

# album-review

Produce ONE extremely-high-quality long-form 乐评 (10,000–15,000 中文字符) from a
**primary credit + album name**. Deep multi-pass research grounds every
discographic fact; strong reasoning forms the critical thesis; a deterministic
validator gates length, section coverage, and claim→evidence traceability before
anything ships. Speed is not a concern — quality and honesty are the only bars.

**Locked decisions** (do not re-litigate):
- **中文字符 = CJK 汉字 ONLY** (regex `[一-鿿]`). Latin/digits/punctuation do NOT
  count toward the 10,000–15,000 window, so padding cannot game the floor.
- **Emit a backing JSON** (`claims[]` + `evidence[]`) alongside the prose, so the
  traceability gate is machine-checkable. A fact-class claim whose `source_id` is
  absent from `evidence[]` FAILs the gate.
- **Research access:** at runtime USE web/search tools (WebSearch/WebFetch) for the
  fan-out when available; degrade honestly to caller-supplied material when offline
  (set `trace.research_mode`). Never fabricate to fill a gap or hit the floor.

## Steps

1. **Preflight + route.** Confirm exactly one album + a primary credit. If the
   input is gear, lyric-translation, or buying advice, do NOT produce a review —
   route per the description's Do-NOT line. The classifier in
   `scripts/check_review.py:classify_route` mirrors this.
2. **Classify (runtime judgment, not a fixed enum).** Set rich descriptors: idiom,
   era, role-of-credit, work-vs-performance (classical), and **release form**
   (single / EP / LP / box / live). Set the unit of analysis (逐曲 vs 逐乐章 vs 逐碟).
   Pick the critical lens from the descriptors — never force a pop template onto a
   symphony or vice versa. Load `rules/genre-lenses.md`.
3. **Research.** Build a source roster, breadth-fan-out across angles
   [artist/genesis, recording/production, the music itself, reception/criticism,
   comparisons, cultural-historical context], then depth-deepen thin angles. Clean,
   grade, triangulate. Map **every** discographic fact to a `source_id`. For thin
   (obscure) albums, degrade honestly with explicit 资料不足/公开资料有限 — never
   invent track/personnel/date specifics. Load `rules/research-protocol.md` and
   `references/source-roster.md`.
4. **Reason.** Multi-pass: form the critical thesis and per-section judgments; tag
   each statement grounded-fact vs interpretation.
5. **Write.** Render the genre-adapted long-form skeleton (`assets/review-template.md`),
   10,000–15,000 中文字符, classical separating WORK from PERFORMANCE and carrying a
   参考录音/版本比较 section. Emit the backing JSON (`assets/backing.example.json`,
   contract `schemas/backing.schema.json`).
6. **Verify (gate — never ship a FAIL).** Run the validator over the review +
   backing; fix and re-run until exit 0:
   ```bash
   python3 scripts/check_review.py <review.md> --class standard|classical \
       --backing <backing.json>
   ```
7. **Report.** The 乐评 + an 证据附录 (evidence appendix) summarizing sources.

## Controls (externalized, not prose-only)

- **Length + section + traceability** are enforced by `scripts/check_review.py`
  (CJK-字 window, genre-adapted section linter) + `scripts/validate_backing.py`
  (every fact-class claim's `source_id` must exist in `evidence[]`). Ship is
  blocked on any non-zero exit.
- **No buying/price/transaction advice; read-only research.**
- **Honest degradation** for thin-info albums (explicit 资料不足, zero invented
  specifics).

## Metrics

See `rules/metric-plan.md`: length-window conformance rate (target ≥0.9),
ungrounded-claim rate (target 0), section-coverage pass rate, and activation
precision vs adjacent skills (album-review vs hifi-review vs lyric-translation).

## Modules

| File | When to load |
|------|--------------|
| `rules/research-protocol.md` | Step 3 — source roster classes, breadth/depth fan-out, grading, triangulation, honest-degradation. |
| `rules/genre-lenses.md` | Step 2 — per-idiom descriptors and which critical dimensions to foreground. |
| `rules/output-template.md` | Step 5 — required long-form section skeleton + genre-adaptive substitutions. |
| `rules/metric-plan.md` | Metrics — definitions and targets. |
| `references/source-roster.md` | Step 3 — concrete music source classes with type/orientation/reliability. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/check_review.py` | `python3 scripts/check_review.py <review.md> [--class standard\|classical] [--min 10000 --max 15000] [--backing <backing.json>]` — CJK-字 window + section linter + traceability gate. Exit 1 on any violation. |
| `scripts/validate_backing.py` | `python3 scripts/validate_backing.py <backing.json>` — schema + claim→evidence traceability. Exit 1 on any untraced/fabricated fact. |

## Assets

| File | Usage |
|------|-------|
| `assets/review-template.md` | Fillable 长文骨架 the writer renders into. |
| `assets/backing.example.json` | A conforming backing JSON to copy from. |
| `schemas/backing.schema.json` | JSON contract for the backing (claims + evidence). |

## Lifecycle

Version `0.1.0`; see `CHANGELOG.md`. **Release gate:** ship only when
`python3 evals/run_all.py` is GREEN (length + section + traceability + routing).
Roster/template changes require a re-run of the eval fixtures. Rollback = revert
to the prior `SKILL.md` + `scripts/`.
