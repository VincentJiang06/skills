---
name: vince-fact-check
description: >
  Fast, source-backed answer to a factual question — a technology, a term/noun, a
  date/version/value, or a "is it true that…" claim. Triage the question simple vs
  complex, fan out PARALLEL web searches, early-exit the moment the answer is
  corroborated, and return a citation-backed bottom-line answer within a hard time
  budget: simple ≤2 min, complex ≤5 min. Speed/efficiency is the defining goal.
  Use when the user wants a quick verified answer: "fact-check this", "quickly find
  out / look up X", "what is <tech/term>", "is it true that Y", "$vince-fact-check".
  Do NOT use for: a thorough, exhaustive, multi-source RESEARCH REPORT (that is
  deep-research — this skill returns a bounded BLUF answer, not a report); subjective
  / opinion / recommendation questions with no factual answer ("best laptop for me");
  domain deep-evaluations with their own skill (vince-album-review for 乐评,
  vince-hifi-review for audio gear); questions answerable from the open repo/context
  with no web lookup; creative, math, or coding tasks with no external fact to verify.
---

# vince-fact-check

Answer a factual question **fast and sourced**. The whole flow is time-boxed:
**simple ≤2 min, complex ≤5 min**. Speed comes from four levers — triage the
effort, search in **parallel**, read snippets before fetching, and **stop the
moment the answer is corroborated**. Never rabbit-hole; never exceed the tier
budget; never emit an uncited or confident-but-unverified claim.

> If the request is for a comprehensive / exhaustive multi-source **report**, this
> is the wrong skill — defer to **deep-research**. This skill returns a bounded,
> bottom-line answer, not a report.

## Steps

**0 — Preflight.** Restate the question in one line; extract the precise
claim/entity to verify. If it is subjective/opinion or answerable without the web,
stop and say so (don't fabricate a "fact").

**1 — Triage → budget.** Load `rules/triage.md`. Decide **simple** vs **complex**
(when genuinely unsure, or the topic is contested, treat as complex) and adopt that
tier's budget: rounds, parallel width, fetch cap, source bar, time target.

**2 — Round 1: parallel search.** Load `rules/search-protocol.md`. Decompose the
question into angles and issue the tier's searches as **parallel tool calls in a
single message** — never one at a time. Read result **snippets first**.

**3 — Corroborate & early-exit.** `WebFetch` a full page **only** when a snippet is
insufficient or a number/quote must be verified (≤ the tier's fetch cap). The
moment the bottom line is corroborated to the tier's **source bar**, **stop
searching** and go to Step 5.

**4 — One more round (complex only).** If still under-corroborated or sources
conflict and a round remains, run **one** targeted round to fill the specific gap or
triangulate the conflict. Still short → declare **uncertain**.

**5 — Synthesize the answer.** Load `rules/output-contract.md` and fill
`assets/answer-template.md`: a one-line **Answer** up front, a **Confidence** label
(High/Medium/Low), the **Tier**, 2–4 cited evidence bullets, a numbered **Sources**
list, and **Caveats** only if needed. Every load-bearing claim carries a citation.

**6 — Self-check, then emit.** Verify against the contract; optionally run
`node scripts/check_answer.mjs <answer.md>` to confirm the structure (every `[n]`
resolves, confidence set, per-tier source bar met). Emit; **stop** — do not exceed
the budget.

## Controls (hard, externalized in `rules/triage.md`)

- **Time/effort budget per tier** — simple: ≤2 min, 1 round, width 1–3, ≤1 fetch,
  ≥1 source. complex: ≤5 min, ≤2 rounds, width 3–5, ≤3 fetch, ≥2 independent
  sources. When a cap is hit, **stop and report at current confidence**.
- **Citation** — every load-bearing claim cites a source; uncorroborated → Low
  confidence / "could not confirm", **never fabricated**.
- **Speed-safety** — speed must not produce confident-wrong; below the source bar →
  explicit uncertainty, not a guessed High-confidence answer.

## Modules

| File | When to load |
|------|------|
| `rules/triage.md` | Step 1 — simple/complex rubric + the per-tier budget table + the uncertain path. |
| `rules/search-protocol.md` | Step 2–4 — query decomposition, parallel fan-out, snippet-first, early-exit on saturation, conflict triangulation, claim→evidence. |
| `rules/output-contract.md` | Step 5–6 — the BLUF format, confidence labels, citation rules, the self-check. |
| `references/source-reliability.md` | When grading sources or a fact is volatile (freshness / as-of date). |
| `references/metrics.md` | When measuring the skill (speed, traceability, confident-wrong rate). |

## Scripts

| File | Usage |
|------|------|
| `scripts/check_answer.mjs` | `node scripts/check_answer.mjs <answer.md>` — deterministic answer-contract validator (BLUF, confidence, tier, citation resolution, per-tier source bar). The release gate + optional Step-6 self-check. |

## Assets

| File | Usage |
|------|------|
| `assets/answer-template.md` | The fill-in answer skeleton (Answer / Confidence / Tier / Key evidence / Sources / Caveats). |
