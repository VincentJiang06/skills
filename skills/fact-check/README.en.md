# fact-check

> A fast, citation-backed answer to a factual question — and never confident-and-wrong.

**English** · [简体中文](README.md)

**What it does** — Triages the question → fans out parallel web searches → early-exits the moment the answer is corroborated → returns a citation-backed BLUF (bottom-line-up-front) answer. On a hard budget: ≤2 min for simple questions, ≤5 min for complex ones.

**Why it's good** —
- The repo's one deliberately **speed-first** skill, governed by a "speed-safety" rule that forbids guessed high-confidence answers — fast, but never confident-and-wrong.
- Parallel search + early-exit aim to cut latency instead of running every source to completion (measured result below: not faster than the bare model).
- A deterministic answer-contract validator checks the format: fields present, every `[n]` resolves to a listed source, enough distinct sources for the tier. It does not check whether a source supports the claim — the protocol has you read each cited page for that.
- Pages, snippets and pasted text are treated as evidence, never as instructions: a "note to AI" inside them changes no verdict and is reported to you.

**Measured status (1.1.0, 2026-09-25)** — In a three-case two-arm test against bare Opus 5.5 with this skill disabled, the per-case result was 0 wins, 0 losses, 3 ties: this skill cites more cleanly (per-claim sources) but is not faster, and on the simple question it used about 4× the bare model's tool calls. Its core speed-first claim is not supported, and retirement has been recommended to the owner (nothing deleted). Details and open findings: [CHANGELOG](CHANGELOG.md) 1.1.0.

**When to use** — "fact-check this" · "quickly look up X / is it true that Y" · "what is <tech/term>"; or call `/fact-check`.
**Not for** — exhaustive multi-source research reports (→ deep-research); subjective / recommendation questions ("best laptop for me"); domain deep-evaluations with their own skill (album-review for 乐评, hifi-review for audio gear).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/fact-check ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
