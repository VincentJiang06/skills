# paper-writer

> Give it a **paper requirement** (word count / citation style / sections / discipline) and/or a **topic**, and it writes a **complete, spec-compliant paper** from scratch; every citation is checked by an independent verifier, and whatever it cannot confirm is flagged.

**English** · [简体中文](README.md)

**What it does** — Turns a requirement + topic into a submission-ready paper that satisfies every stated hard constraint (length / required sections / citation format, checked by scripts) and keeps only the citations an independent verifier confirmed exist and support their claims; the rest are marked `[SOURCE NEEDED]` and listed in the reply. A fabricated citation or a plagiarized passage is not a bad draft — it is academic misconduct; that asymmetry drives the whole design.

**Why it's good** —
- **Two integrity invariants (always in context, never violated):** never fabricate a citation/quote/data point (an unverifiable source is marked `[SOURCE NEEDED]`, never invented); never plagiarize (never present verbatim/near-verbatim source text as original).
- **Independent citation verification in the trunk (the load-bearing design in 0.2.0):** once the form gate is green, a **fresh, non-fork** verifier subagent gets only the paper, the citation checklist and any user-supplied source pool, never the author's notes or ledger. It labels each citation SUPPORTED / OVERSTATED (real source, but the paper claims more than it says, e.g. causal for correlational) / MISATTRIBUTED / FABRICATED / UNSURE; only SUPPORTED counts as RESOLVED. The author may downgrade a verdict but never upgrade one; revised items go to one more fresh verifier, once.
- **Ledger-completeness gate (claim narrowed):** `scripts/extract_citations.py --verify verifier_ledger.json` checks only that the ledger is **complete and internally consistent** (every id has a terminal verdict; a SOURCE_NEEDED verdict comes with a marker in the paper). It does **not** prove a source exists and cannot tell who wrote the ledger; that is the verifier's job, and the reply says who verified: "independently verified (fresh same-family verifier)", "self-verified, no independent verifier", or "form-checked only, existence NOT verified".
- **Per-style citation-form parsing (0.2.1):** APA / Chicago / MLA are keyed where each style puts the year, author names may be non-ASCII (Özdemir, 王某某), and grouped numeric markers such as `[1-3]` and `[1,4]` are parsed. An entry the gate cannot key fails and goes into the verifier checklist as `<UNKEYED:…>`, so it cannot slip past independent verification. MLA's in-text → Works Cited direction is not script-checkable (`(Smith 12)` has the same shape as `(Figure 2)`); the author checks it.
- **Objective / subjective fork (C5):** the objective skeleton is checked deterministically (`check_length` / `check_sections` / `check_citations`); the subjective dimensions (source fidelity, argument quality, academic register) are scored by a rubric + an independent judge.
- **Field-tested (0.1.0 era):** one demo produced a 1,323-word APA 7 paper on the testing effect + spaced repetition with 7 citations web-verified as real by the author itself, 0 fabricated. The author checking its own citations is exactly what 0.2.0 changes.

**When to use** — "write me a paper on X" · "写一篇…的学术论文" · "turn this brief/topic into a paper"; best with a stated format spec + topic.

**When NOT to use** — proofreading / summarizing / humanizing / fact-checking an EXISTING paper (→ the sibling skills); generic writing with no topic or requirement.

**What ships** — 1 `SKILL.md` + 5 `references/` (integrity policy / citation styles / paper structures / subjective rubric / verifier brief) + 4 deterministic scripts (`scripts/`: length / sections / citation-format / citation checklist + ledger-completeness gate, Python stdlib) + an eval harness.

**Honest note (v0.2.2, status draft)** —
- **The 0.1.0 claim is corrected.** 0.1.0 described the ledger gate's exit code as something a draft could not fake. The ledger was filled in by the same agent that wrote the paper, so the claim did not hold; 0.2.0 corrected it.
- **The verifier is instance-tier.** It is a fresh context of the same model family, not a different vendor. When the host cannot dispatch a subagent, the skill falls back to a self-pass and the reply says so.
- **Two-arm comparison (E11, run on 0.2.0, N=3, direction only):**
  - The skill arm was narrowly better or better in all three cases.
  - Unflagged fabricated, misattributed or overstated citations were 0 in both arms, so the pre-registered uplift rule is **not met**.
  - The judge attributed every format-score gap to how the scripts read allowed forms.
  - The judge preferred the skill arm in 1 case and called the other 2 ties.
  - The skill arm used about 1.35–2.4x the tool calls. Tokens and wall-clock were not recorded.
  - None of the three hosts could dispatch a subagent, so **the independent verifier never actually ran**. The runs measured the self-pass fallback, and verifier calibration is also unrun.
- **Battery:** 5/5 seeds were hit, and 3 P1 plus 5 P2 findings were fixed in 0.2.1. The fix audit then found 5 P2 findings **in 0.2.1's own new parser code**. All are open:
  - False citations: year ranges such as `Great Recession (2008–2009)`, and math intervals such as `[0, 1]`.
  - A crash on `[2024-01-15]`.
  - No passing form for lower-case surnames such as `hooks, b.`.
  - Wrong author matching when one Chinese clause names two authors.

  7 P3 findings also remain. The full list is in CHANGELOG 0.2.2.
- **Next step needs an owner ruling.** The proposal is to make the in-text → reference direction report-only, because the forms are not separable (S14), instead of adding more regex patches.

Full mechanism in [SKILL.md](SKILL.md).
