# rewrite-protocol — the mode-aware SUBTRACT / ADD / arc detail (Steps 2–4)

Read this **only when a rewrite is actually triggered** — i.e. you did NOT abstain
at Step 1. On abstain invocations (the common, false-positive-safe path) none of
this is needed. The discriminator is the MODE locked at Step 0 (`academic` vs
`popsci`) plus "a rewrite is triggered". This file holds the verbose per-mode
remove/preserve lists and the required ADD moves that SKILL.md's Step 2–4
skeletons point to.

## Step 2 — SUBTRACT (mode-aware: remove only what is an AI tell IN THIS MODE)

Remove the signals that matter **for the mode**. Load the mode pattern refs:
`references/english-patterns.md`, `references/chinese-patterns.md` (lexical), and
`references/structural-statistical-signals.md` (structural).

**`academic` — remove:** inflated/promotional vocab used as filler, AI connector
overload (Moreover/Furthermore/此外/与此同时 every paragraph), mechanical
rule-of-three scaffolding, report-shell *over-density* ("本节将……" on every
subsection), evenly-sprinkled hedging, balanced negative parallelism used
mechanically, bold-label lists, chat residue.
**`academic` — PRESERVE (these are NOT tells here):** discipline jargon including
`significant`/`significantly`/`robust`/`comprehensive`/`enhance`/`landscape` in
technical use; three-item **data** enumerations; numbered sections (2.1, 3.4); a
**single** "This paper presents/examines…"; "These results suggest"; Chinese
`对……进行……分析` / `研究表明` / `这说明` as genuine connectives. (See
academic-register.md "do not strip".)

**`popsci` — remove:** clickbait/hype ("mind-blowing", "you won't believe",
"buckle up", 震惊体/涨知识/快收藏), emoji and exclamation spam, listicle shell
("5 facts that…", **bold-numbered** headers as a structural crutch), fake "did
you know" hooks, generic "the future is bright" wraps, AI connector overload,
over-explaining the obvious.
**`popsci` — PRESERVE (legitimate craft, removing it is a false positive):**
rhetorical questions, second-person "you", vivid analogies/metaphors, a narrative
hook, an occasional guiding triad, concrete everyday examples, a curious human
voice. (See popsci-register.md.)

Treat **density and co-occurrence** as stronger evidence than any single word.

## Step 3 — ADD human texture (without inventing)
The half generic humanizers skip — SUBTRACT alone leaves prose scrubbed but flat,
stance-less, and abstract, which still reads as machine. **Once a rewrite is
triggered (the abstain gate in Step 1 is UNCHANGED), the ADD below is required, not
optional**, but bounded hard by zero net-new facts. Load
`references/human-texture.md` (worked before/after examples per mode there).
- **`academic` — do at least both, every triggered rewrite:**
  1. **Surface ≥1 committed claim with calibrated confidence** — state a point the
     source already makes as a held, calibrated claim (`the evidence indicates`,
     `more plausibly`, `证据表明`, `更可能的解释是`), not a survey of possibilities.
     Calibration ≠ casualness and ≠ dropping hedges.
  2. **Promote ≥1 abstract summary into a concrete number / case / mechanism ALREADY
     IN THE SOURCE** — retrieve a specific figure, named entity, dated event, or
     causal step from elsewhere in the same text; never generate one. Plus: sentence/
     paragraph-length variance; controlled asymmetry (not every list is three — but
     data enumerations are not forced triads).
- **`popsci` — do at least both, every triggered rewrite:**
  1. **Let ONE real, source-grounded analogy or concrete example carry a key point**
     — pick the single best one the source already implies and let it do the
     explanatory work instead of restating the mechanism abstractly. Preserve
     existing craft (rhetorical Q, "you", analogy) — removing it is a false positive.
  2. **Replace any generic uplift close with a grounded one** — swap "the future is
     bright" / "未来可期" / "拭目以待" for an open question, real next step, or
     concrete implication **already in the source**. Vary rhythm; keep one
     through-line, not a listicle — and stay **serious**, never hype.
- **Never invent** a number, case, study, quote, analogy, or implication. If the
  source has none, keep it general (you may name the gap). Specificity is
  **retrieval from the source**, never generation.

## Step 4 — long-document arc (multi-section inputs)

**Long inputs (multi-section) — treat the document as a whole, not section-by-section:**
- **Vary section openings** — don't start every section the same way (every
  paragraph "本节将…", every section "X is an important…"); let openings differ.
- **One through-line** — keep a single load-bearing argument visible across
  sections so the arc builds, rather than marching finding-by-finding.
- **Synthesizing conclusion** — the close should *synthesize* (tie the threads into
  the through-line / state the standing implication) rather than recap the sections.
- Adds **no** length and **no** new content — this is shape across the existing
  text, under the same zero-net-new-facts rule.
