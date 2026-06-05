# phase-supplement — Phase 3: Supplement (OPTIONAL, light)

## When to run

**Optional and light.** Run this only for **genuine gaps / thin concepts** — a
`[THIN?]` marker from Phase 1, a topic the slides cover superficially, or a core
concept that clearly benefits from a little grounding. If the notes are already
complete and clear, **skip this phase**. This is the optional "Option-2-lite"
enrichment, NOT a heavy multi-source research pipeline.

**Hard cap: ≤ ~10 supplement targets per course.** If more candidates exist,
present a ranked shortlist and ask the user which to include. Prioritize:
1. `[THIN?]` markers from Phase 1.
2. Thin / shallow topics surfaced in Phase 2.
3. Core concepts that benefit from real-world grounding.

---

## Step 0: Operating mode (decided at intake, by tool availability)

**The web mode was determined at intake (`phase-intake.md` Step 3) by whether
WebSearch / WebFetch is actually available in your tools** — defaulting to no-web
when it could not be told. Use that mode here; do not re-decide it. The **user
can override** the default (grant or deny web access).

**Mode A — Web-enabled (WebSearch + WebFetch available in your tools).** Retrieve
real sources and cite them.

**Mode B — Offline (no web access / could not be told → defaulted offline).** Do
NOT search. Expand using stable, well-established curriculum knowledge. **Every
supplementary claim is marked `[Standard curriculum knowledge]`.** Invent
**ZERO** URLs, paper titles, author names, or implementation details. If
uncertain, omit the claim or flag it `[Uncertain — verify before exam]`. The goal
is to avoid hallucination distorting revision, not to maximize volume.

If the run is in Mode B but the user now grants web access, switch to Mode A
(use the newly available tools); if they deny it, stay in Mode B.

---

## Mode A — web-enabled (real sources only)

For each target, search for specific, deep content and stop when you have enough:
- Official docs (RFCs, language/library docs with version), reputable
  engineering blogs, canonical Q&A, or a specific GitHub file/function.
- The original paper / a recent survey when relevant: title, authors,
  arXiv ID or DOI, year.
- When multiple sources are found, note agreement (confidence) and disagreement
  (nuance). If a source contradicts the course material, flag it.

**Citation discipline:** every factual claim needs a traceable source.
- Web: `[Title](full URL)`
- Paper: `Author et al., "Title" (Year). arXiv:ID` or `DOI:xxx`
- Docs: `[Doc Section](URL)` with version.

**Never cite a source you did not actually retrieve.** If search fails for a
target, write: "No high-quality external source found for [concept]; supplement
based on course material and general domain knowledge" — do not invent one.

---

## Mode B — offline (curriculum-grounded)

For each target concept:
1. Describe the standard textbook-level treatment of the concept.
2. Note what the course adds, simplifies, or omits vs. that standard.
3. Add the bigger-picture context: where it fits, what problem it addresses.
4. Note common misconceptions standard curricula address.

All content marked `[Standard curriculum knowledge]`. No fictional sources.

---

## Output: fold into the notes (don't append a separate doc)

Supplement content is woven into the relevant concept block in
`revision-notes.md` (e.g. under "Connections" or a short "Beyond the slides"
note), with its source marker inline. Keep it brief — a few sentences per target.

```markdown
**Beyond the slides:** [the gap this fills + the added understanding]
Source: [Mode A] [Title](URL)  /  [Mode B] [Standard curriculum knowledge — topic area]
```

## Depth calibration

| Target | Mode A | Mode B |
|---|---|---|
| Core + `[THIN?]` | 1-2 sources, 150-300 words | curriculum context, 150-250 words |
| Thin topic from Phase 2 | 1 source, 100-200 words | 100-150 words |
| Minor / tangential | skip or 1-2 sentences | skip |

## Anti-patterns

- **DO NOT** exceed ~10 supplement targets — prioritize by value, ask if more.
- **DO NOT** cite a source you didn't retrieve (Mode A) or invent any source (Mode B).
- **DO NOT** state uncertain claims confidently — omit or flag `[Uncertain — verify before exam]`.
- **DO NOT** let this phase substitute for the notes — it enriches, never replaces.
- **DO NOT** dump raw search results without analysis.
