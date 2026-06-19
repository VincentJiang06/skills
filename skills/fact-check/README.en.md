# fact-check

> A fast, citation-backed answer to a factual question — and never confident-and-wrong.

**English** · [简体中文](README.md)

**What it does** — Triages the question → fans out parallel web searches → early-exits the moment the answer is corroborated → returns a citation-backed BLUF (bottom-line-up-front) answer. On a hard budget: ≤2 min for simple questions, ≤5 min for complex ones.

**Why it's good** —
- The repo's one deliberately **speed-first** skill, governed by a "speed-safety" rule that forbids guessed high-confidence answers — fast, but never confident-and-wrong.
- Parallel search + early-exit minimize latency instead of running every source to completion.
- A deterministic answer-contract validator guarantees the output is well-formed and cited.

**When to use** — "fact-check this" · "quickly look up X / is it true that Y" · "what is <tech/term>"; or call `/fact-check`.
**Not for** — exhaustive multi-source research reports (→ deep-research); subjective / recommendation questions ("best laptop for me"); domain deep-evaluations with their own skill (album-review for 乐评, hifi-review for audio gear).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/fact-check ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
