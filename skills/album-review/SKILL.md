---
name: album-review
description: >-
  Deep, source-traceable long-form Chinese album review (乐评). Use when the user
  names a music credit (artist/composer/band) + an album and wants one
  comprehensive critique. Triggers: "写一篇深度乐评", "全面评测这张专辑",
  "$album-review". NOT for audio-gear evaluation (→ hifi-review).
metadata:
  version: 0.2.0
---

# album-review

Produce ONE extremely-high-quality long-form 乐评 (10,000–15,000 中文字符) from a
**primary credit + album name**. Deep multi-pass research grounds every
discographic fact; strong reasoning forms the critical thesis; a deterministic
validator gates length, section coverage, and claim→evidence traceability before
anything ships. Speed is not a concern — quality and honesty are the only bars.

**Locked decisions** (do not re-litigate):
- **中文字符 = CJK 汉字 ONLY** (regex `[一-鿿]`). Latin/digits/punctuation do NOT
  count toward the 10,000–15,000 window. **Scope of that claim: Latin / digit /
  punctuation padding cannot game the floor** — that, and only that, is what the
  rule earns (proof: `evals/fixtures/cjk_padding_fails_floor.md`, 500 真汉字 +
  22KB of Lorem ipsum, still FAILs the floor). **汉字-level repetition padding is
  NOT caught by this gate, by design:** one paragraph pasted twenty times is
  twenty paragraphs' worth of 汉字 to the counter, and a 10,000-字 wall of the
  same sentence exits 0 (registered negative:
  `evals/fixtures/repetition_padded_10k.md`). "Is this 10,000 字 of distinct
  content or one paragraph in a hall of mirrors" is a semantic judgment; no
  count, ratio, or similarity threshold decides it reliably, so it is carried by
  the judge-must-flag negatives + a human/judge read (`rules/judge-must-flag.md`),
  never by the validator. **Exit 0 is evidence of length, never of substance.**
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
   backing:
   ```bash
   python3 scripts/check_review.py <review.md> --class standard|classical \
       --backing <backing.json>
   ```
   **Stop condition (disjunctive — whichever fires first):**
   - **green** — exit 0, no violations → ship. This is the only exit that ships.
   - **fix** — a violation names a real, fixable gap (a missing section, an
     untraced claim, genuinely unwritten analysis) → fix that gap, re-run.
   - **escalate** — two consecutive fix rounds add **zero net 汉字 of new
     substance** and the floor is still unmet → **stop patching and report to the
     user**. The finding is not "the draft is short"; it is that the 10,000-字
     floor and this album's available material are incompatible — a charge
     against the contract, which only the human can settle (lower the floor for
     this album, widen the research, or drop the job). Say so plainly, hand over
     the honest short draft, and stop.

   **Never close the gap by adding 字**: repeating a paragraph, restating the same
   judgment in new words, padding with filler, or — worst — inventing
   track/personnel/date specifics. All of those satisfy the counter and destroy
   the review; the counter cannot see any of them (see the locked decision above).
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

Version `0.2.0`; see `CHANGELOG.md`. **Release gate:** ship only when
`python3 evals/run_all.py` is GREEN (length + section + traceability + routing)
**and** a human/judge has read the negatives in `rules/judge-must-flag.md` and
rejected every one of them. GREEN alone is not sufficient — the harness measures
what a machine can measure (counts, sections, claim→evidence links); whether the
prose says anything is a semantic judgment that stays with the reader.
Roster/template changes require a re-run of the eval fixtures. Rollback = revert
to the prior `SKILL.md` + `scripts/`.
