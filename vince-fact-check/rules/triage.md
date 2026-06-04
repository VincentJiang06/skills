# Triage: simple vs complex, and the per-tier budget

Triage is a **fast judgment**, not a rigid classifier — read the question and
pick the tier in a few seconds. The tier sets the search **budget**, which is how
the time target is enforced (you cannot set a real timer mid-answer, so the
budget caps are the proxy). **When genuinely unsure, or the topic is contested,
choose complex** — under-budgeting a contested question is the dangerous error.

## Signals

**SIMPLE** (target ≤ 2 min) — a single uncontested fact:
- a definition / "what is <tech/term>"; a current value, version, date, price;
  an entity identification; a yes/no claim with an uncontested answer.
- one entity, one clause, an answer you expect a single authoritative source to
  settle.

**COMPLEX** (target ≤ 5 min) — needs synthesis, or could be contested:
- "why / how / compare / difference between / impact of"; multiple entities or
  clauses; a trend over time.
- the answer is **contested / controversial** (sources are likely to disagree),
  even if the question *looks* simple ("is coffee bad for you?", "is X safe?").
- a load-bearing number that several sources might report differently.

A question that *looks* simple but is genuinely contested is **complex** — the
tell is "would two reputable sources plausibly disagree?". If yes → complex.

## Budget table (hard caps — stop when hit)

| Tier | Time target | Rounds | Parallel width / round | Fetch cap | Source bar (corroboration) |
|------|------|------|------|------|------|
| **simple** | ≤ 2 min | 1 | 1–3 | ≤ 1 | ≥ 1 source |
| **complex** | ≤ 5 min | ≤ 2 | 3–5 | ≤ 3 | ≥ 2 **independent** sources for the bottom line |

- **Source bar** = how much corroboration is "enough to answer". Reaching it is
  the **early-exit** trigger (`rules/search-protocol.md`): stop searching, answer.
- **Independent** = different origin, not two pages syndicating one wire story.
- A volatile fact (version/price/leadership/"current") additionally needs a
  **recent dated** source (`references/source-reliability.md`); a single stale
  source caps confidence at Medium.

## The uncertain path

If, **within the budget**, the bottom line is not corroborated to the tier's bar
(no reliable source, or sources irreconcilably conflict), do **not** spend more
time and do **not** guess. Return **Tier: uncertain**, **Confidence: Low**, an
explicit "could not confirm …", and report what *was* found. An honest uncertain
answer is a success; a fast confident-wrong answer is the one failure this skill
must never produce.
