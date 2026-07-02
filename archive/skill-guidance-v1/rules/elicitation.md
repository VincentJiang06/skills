# Context-sufficiency gate & trigger-based elicitation

The #1 failure of this skill was producing an under-specified spec from thin
input — silently guessing, then dumping the guesses into `blocking_unknowns`. The
fix is **trigger-based elicitation**: detect insufficient context, and when it is
insufficient, **ask** — minimize questions, but never suppress them.

> **The rule:** *minimize but never suppress.* Asking zero questions when context
> is insufficient is the bug. Asking about everything when context is sufficient
> is also a bug. Ask exactly the decision-critical gaps the input leaves open.

## 1. Detect (deterministic seed)

Run the detector on the target/idea text:

```bash
node scripts/detect_context_gaps.mjs <skill-dir | SKILL.md | --idea "...">
```

It returns the **decision-critical slots** and which are `missing`
(`scope_boundary`, `input_domain`, `acceptance_criterion`, `edge_hazards`,
`user_or_triggers`) plus `sufficient` (true iff ≤1 missing). This is the seed —
you may add a gap the detector cannot see (a domain-specific ambiguity), but you
may **not** ignore a flagged slot. `sufficient:true` → do **not** manufacture
questions (the over-ask polarity is a failure too).

**The detector is a keyword SEED, not the verdict — your judgment is the oracle.**
It matches vocabulary, so it mis-calls both ways; confirm substance against the
actual text, don't trust the boolean:
- `sufficient:true` only means *no slot tripped a keyword*. Still confirm each slot
  carries **buildable substance**. A slot that's named but empty — "validate it"
  with no rules, "handle errors" with no policy — is **not** satisfied: treat it as
  missing and ask. A bare idea peppered with spec-words is still a bare idea.
- A `missing` slot may already be answered by **paraphrase** the wordlist can't see
  ("omits X" = out-of-scope). If the text genuinely answers it, don't re-ask.

## 2. Phrase (one targeted question per missing slot)

For each `missing` slot, write **one** concrete, domain-specific question — the
detector says *which* slot, you phrase the *domain* question. Generic
("what are the requirements?") does not count; it must name the real decision:

| missing slot | bad (generic) | good (domain-specific, for a CSV-merger idea) |
|---|---|---|
| `input_domain` | "what's the input?" | "What delimiter and text encoding do the source files use (comma/semicolon/tab; UTF-8/GBK; BOM)?" |
| `edge_hazards` | "any edge cases?" | "On duplicate primary keys, should it error, first-wins, or merge?" |
| `acceptance_criterion` | "how do we test it?" | "Is a row-count invariant (rows-in == rows-out) the correctness bar?" |

Write the questions to `<target>/.skill-guidance/clarifying-questions.json` as a
JSON array of strings (this is a real artifact the pipeline and the eval read).

## 3. Two modes — same detection, different disposition

The trigger is identical; only what you do with the questions differs.

- **Standalone / interactive** (a human is present): surface the questions with
  `AskUserQuestion`, fold the answers into the spec, then emit. This is the
  primary mode — a human asked you to evaluate/plan a skill.
- **Pipeline / non-interactive** (invoked by `skill-conductor`, no human to
  answer): you must **not block** the autonomous run. Still emit
  `clarifying-questions.json` (so the gap is recorded and surfaced), then proceed
  with an **explicit, logged assumption** for each gap: fill the affected design
  unit with your best-effort answer and record `assumed: <decision> because
  <reason>` in `altitude_rationale` / the relevant `evidence`. The conductor and
  a later human can see exactly what was assumed.

Detect the mode from the invocation: a conductor pipeline run is non-interactive;
a direct user invocation is interactive. When unsure, prefer asking.

## 4. Never dump into `blocking_unknowns`

`handoff.blocking_unknowns` is for genuine **external** blockers you cannot
resolve by asking or assuming (a missing credential, an undecidable upstream
dependency) — at most ~1 for a normal idea. A decision-critical gap is **not** a
blocking unknown: it is either *asked* (questions artifact) or *assumed* (logged
in the spec). If `blocking_unknowns` has grown to hold the things you should have
asked, that is the old bug — move them to questions or assumptions.

## 5. Self-check before emit

- [ ] detector ran; every `missing` slot is either asked or assumed-and-logged
- [ ] `sufficient:true` ⇒ `clarifying-questions.json` is empty/absent (no over-ask)
- [ ] all 8 `recommended_design` units are concretely filled (no `TODO`/`TBD`)
- [ ] `blocking_unknowns` ≤ 1 and holds only a real external blocker
