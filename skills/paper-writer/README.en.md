# paper-writer

> Give it a **paper requirement** (word count / citation style / sections / discipline) and/or a **topic**, and it writes a **complete, spec-compliant paper** from scratch; every citation is checked by an independent verifier, and whatever it cannot confirm is flagged.

**English** · [简体中文](README.md)

**What it does** — Turns a requirement + topic into a submission-ready paper that satisfies every stated hard constraint (length / required sections / citation format, checked by scripts) and keeps only the citations an independent verifier confirmed exist and support their claims; the rest are marked `[SOURCE NEEDED]` and listed in the reply. A fabricated citation or a plagiarized passage is not a bad draft — it is academic misconduct; that asymmetry drives the whole design.

**Why it's good** —
- **Two integrity invariants (always in context, never violated):** never fabricate a citation/quote/data point (an unverifiable source is marked `[SOURCE NEEDED]`, never invented); never plagiarize (never present verbatim/near-verbatim source text as original).
- **Independent citation verification in the trunk (the load-bearing design in 0.2.0):** once the form gate is green, a **fresh, non-fork** verifier subagent gets only the paper, the citation checklist and any user-supplied source pool, never the author's notes or ledger. It labels each citation SUPPORTED / OVERSTATED (real source, but the paper claims more than it says, e.g. causal for correlational) / MISATTRIBUTED / FABRICATED / UNSURE; only SUPPORTED counts as RESOLVED. The author may downgrade a verdict but never upgrade one; revised items go to one more fresh verifier, once.
- **Ledger-completeness gate (claim narrowed):** `scripts/extract_citations.py --verify verifier_ledger.json` checks only that the ledger is **complete and internally consistent** (every id has a terminal verdict; a SOURCE_NEEDED verdict comes with a marker in the paper). It does **not** prove a source exists and cannot tell who wrote the ledger; that is the verifier's job, and the reply says who verified: "independently verified (fresh same-family verifier)", "self-verified, no independent verifier", or "form-checked only, existence NOT verified".
- **Per-style citation-form parsing (0.2.1):** APA / Chicago / MLA are keyed where each style puts the year, author names may be non-ASCII (Özdemir, 王某某); a surname that starts lowercase (hooks, boyd) cannot be keyed and is printed as `REVIEW` for the verifier (0.2.6). Numeric styles read single `[n]` markers only: grouped markers such as `[1-3]` and `[1,4]` are not parsed, because they have the same shape as a date `[2024-01-15]` or an interval `[0, 1]`, so each entry is cited once with its own `[n]` where its claim is made. Any other entry the gate cannot key fails. Every unkeyed entry goes into the verifier checklist as `<UNKEYED:…>`, so it cannot slip past independent verification. MLA's in-text → Works Cited direction is not script-checkable (`(Smith 12)` has the same shape as `(Figure 2)`); the author checks it.
- **Objective / subjective fork (C5):** the objective skeleton is checked deterministically (`check_length` / `check_sections` / `check_citations`); the subjective dimensions (source fidelity, argument quality, academic register) are scored by a rubric + an independent judge.
- **Field-tested (0.1.0 era):** one demo produced a 1,323-word APA 7 paper on the testing effect + spaced repetition with 7 citations web-verified as real by the author itself, 0 fabricated. The author checking its own citations is exactly what 0.2.0 changes.

**When to use** — "write me a paper on X" · "写一篇…的学术论文" · "turn this brief/topic into a paper"; best with a stated format spec + topic.

**When NOT to use** — proofreading / summarizing / humanizing / fact-checking an EXISTING paper (→ the sibling skills); generic writing with no topic or requirement.

**What ships** — 1 `SKILL.md` + 5 `references/` (integrity policy / citation styles / paper structures / subjective rubric / verifier brief) + 4 deterministic scripts (`scripts/`: length / sections / citation-format / citation checklist + ledger-completeness gate, Python stdlib) + an eval harness.

**Honest note (v0.2.6, status draft)** —
- **The 0.1.0 claim is corrected.** 0.1.0 described the ledger gate's exit code as something a draft could not fake. The ledger was filled in by the same agent that wrote the paper, so the claim did not hold; 0.2.0 corrected it.
- **The verifier is instance-tier.** It is a fresh context of the same model family, not a different vendor. When the host cannot dispatch a subagent, the skill falls back to a self-pass and the reply says so.
- **Two-arm comparison (E11, run on 0.2.0, N=3, direction only):**
  - The skill arm was narrowly better or better in all three cases.
  - Unflagged fabricated, misattributed or overstated citations were 0 in both arms, so the pre-registered uplift rule is **not met**.
  - The judge attributed every format-score gap to how the scripts read allowed forms.
  - The judge preferred the skill arm in 1 case and called the other 2 ties.
  - The skill arm used about 1.35–2.4x the tool calls. Tokens and wall-clock were not recorded.
  - None of the three hosts could dispatch a subagent, so **the independent verifier never actually ran**. The runs measured the self-pass fallback, and verifier calibration is also unrun.
- **Battery:** 5/5 seeds were hit, and 3 P1 plus 5 P2 findings were fixed in 0.2.1. The fix audit then found 5 P2 findings **in 0.2.1's own new parser code**. With the owner's go-ahead, 0.2.3 dealt with four of them:
  - The crash on `[2024-01-15]` and the `[0, 1]` interval false positive: the grouped-marker parse is **reverted** to 0.1.0's behaviour. The cost is that PW-F10 is open again: an entry cited only inside `[1-3]` is reported as uncited.
  - False citations such as `Great Recession (2008–2009)` and `COVID-19 (2020)`: narrowed, so the year must be followed by `)` or by a page or second year.
  - 0.2.3 also let lower-case surnames such as `hooks, b.` pass. The fix audit found that this code let an entry led by a bare initial (`E. Okafor`, `A. Brandt`) key as `e` / `a` and pass against "e.g." or the article "a". **0.2.4 reverts it.** An APA entry led by a lower-case surname fails again as `<UNKEYED>`, where the installed 0.1.0 passes it by silently skipping it. This shape is worse than installed and is waiting for an owner ruling.
  - On 31 neighbour-shape witness inputs, 0.2.4 is worse than the installed 0.1.0 on 3, all of them that shape, and better on 5. That set had no non-citation year followed by `,` `;` or `:`; the release check found that class too: `Hurricane Katrina (2005; category 5)` and `(2008, see below)` are read as orphan citations, where installed passes them (FA-1 residual).

  Still open: wrong author matching when one Chinese clause names two authors (FA-5, not separable by position), plus P3 findings. The full lists are in CHANGELOG 0.2.5, 0.2.4, 0.2.3 and 0.2.2.
- **0.2.6 re-plane (conductor ruling, option b).** The two shape classes above (a lower-case surname entry, and a narrative year followed by `,` `;` `:` with no entry) are no longer FAILs. The script still detects them and prints a `REVIEW` line that names the cause, without changing the exit code. Each REVIEW item goes onto the verifier checklist, and the ledger gate blocks delivery until the independent verifier records a verdict for it (`NOT_A_CITATION` is allowed for a narrative year only). Cost: a true orphan written `Smith (2012, p. 4)` with no entry is now a REVIEW, not a FAIL, and is caught only if the verifier runs. Installed 0.1.0 skipped it silently. On 43 witness inputs, 0.2.6 is not worse than installed on any legitimate shape. A release check has not been re-run.
- **Release check after round 3 (0.2.5): not release-ready** (superseded in part by 0.2.6 above). No open P0/P1, harness 42/42, the offline workflow passes, and the crash and interval false positive equal installed. But on two shape classes the candidate is worse than installed 0.1.0 on a legitimate paper: an APA entry led by a lower-case surname (`hooks, b.`) and a non-citation year followed by `,` `;` or `:`. Both wait for an owner ruling, and the size budget (iron rule 4) allows no net code growth.

Full mechanism in [SKILL.md](SKILL.md).
