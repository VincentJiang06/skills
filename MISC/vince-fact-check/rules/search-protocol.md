# Search protocol: parallel, snippet-first, early-exit

The speed of this skill lives here. Grounded in develop-principle
`procedure.search_fan_out`, a **bounded** `procedure.iterative_deepening`
(stop at "enough to answer", not "exhaustive"), `procedure.source_reliability_grading`,
and `principle.claim_evidence_traceability`.

## 1. Decompose into angles

Break the question into the few distinct things you must learn. For a multi-part
question ("what is X and how does it compare to Y"), each part is an angle — answer
**all** parts, not just the first. Add a synonym/alternate-phrasing angle when the
term is ambiguous.

## 2. Fan out in PARALLEL (the core speed lever)

Issue the tier's searches as **parallel tool calls in a single message** — N
searches in the wall-clock of one. Never search one-at-a-time and wait between
them. Width per tier (`rules/triage.md`): simple 1–3, complex 3–5. Aim each angle
at a *different* kind of source (official/primary, reputable secondary, and a
cross-check) so corroboration is **independent**.

## 3. Snippets first; fetch rarely

Read the search-result **snippets** first — they answer most simple questions
outright. `WebFetch` a full page **only** when a snippet is insufficient or you
must verify an exact number, quote, or date. Fetching is the slow path; stay
within the tier's fetch cap.

## 4. Early-exit on saturation

After each round, ask: **is the bottom line corroborated to the tier's source
bar?** (simple ≥1, complex ≥2 independent.) If **yes → stop searching now** and
synthesize. Additional searches past saturation are wasted budget. If **no** and a
round remains (complex), run **one** targeted round aimed at the *specific* missing
piece — not a blind re-search. Still short after the budget → **uncertain**
(`rules/triage.md`).

## 5. Triangulate conflicts

If independent sources **disagree**, do not silently pick one. Weigh them by
reliability (`references/source-reliability.md`), present **both** positions, and
state which is better-supported and why. A conflict you surface honestly is a
correct answer; a conflict you hide is a confident-wrong answer.

## 6. Claim → evidence

Track which source supports which claim as you go, so every load-bearing statement
in the answer can carry a citation `[n]`. Separate **observation** (what a source
says) from **inference** (your synthesis). An assertion with no source is not
allowed in the bottom line — either cite it, or drop it to a Low-confidence caveat.
