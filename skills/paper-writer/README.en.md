# paper-writer

> Give it a **paper requirement** (word count / citation style / sections / discipline) and/or a **topic**, and it writes a **complete, spec-compliant paper that cites only verifiable real sources** — from scratch.

**English** · [简体中文](README.md)

**What it does** — Turns a requirement + topic into a submission-ready paper that satisfies every stated hard constraint (length / required sections / citation format) and cites only verifiable real sources. A fabricated citation or a plagiarized passage is not a bad draft — it is academic misconduct; that asymmetry drives the whole design.

**Why it's good** —
- **Two integrity invariants (always in context, never violated):** never fabricate a citation/quote/data point (an unverifiable source is marked `[SOURCE NEEDED]`, never invented); never plagiarize (never present verbatim/near-verbatim source text as original).
- **A mandatory citation-existence verification gate (the load-bearing design):** `scripts/extract_citations.py --verify` emits the full citation checklist; every one must be confirmed to RESOLVE to a real source via a real lookup, or the gate **blocks with an exit code** (a draft can't forge it) — the compliance report may claim "citations resolve" only after it exits 0. Because the deterministic checkers validate citation FORM, not existence (a syntactically valid fake DOI passes silently), existence is guarded only by this lookup-backed gate.
- **Objective / subjective fork (C5):** the objective skeleton is checked deterministically (`check_length` / `check_sections` / `check_citations`); the subjective dimensions (source fidelity, argument quality, academic register) are scored by a rubric + an independent judge.
- **Field-tested:** one demo produced a 1,323-word APA 7 paper on the testing effect + spaced repetition with 7 citations **all web-verified as real, 0 fabricated**, clearing all four gates (sections / length / citation-format / existence-verification).

**When to use** — "write me a paper on X" · "写一篇…的学术论文" · "turn this brief/topic into a paper"; best with a stated format spec + topic.

**When NOT to use** — proofreading / summarizing / humanizing / fact-checking an EXISTING paper (→ the sibling skills); generic writing with no topic or requirement.

**What ships** — 1 `SKILL.md` + 4 `references/` (integrity policy / citation styles / paper structures / subjective rubric) + 4 deterministic scripts (`scripts/`: length / sections / citation-format / citation-extract+verify gate, Python stdlib) + an eval harness.

**Honest note (v0.1.0)** — built ground-up via the `skill-creator-max` pipeline (composer → guidance → engineer → independent battery acceptance). The independent battery caught a P1 (the integrity check was prose-only, not enforced) and drove it to a runnable out-of-band gate. Currently candidate-grade: field-tested and functional, but not yet multi-round hardened.

Full mechanism in [SKILL.md](SKILL.md).
