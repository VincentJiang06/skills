# Metric plan

| Metric | Definition | Target | Instrument |
|---|---|---|---|
| length-window conformance rate | % of runs landing in [10000,15000] 汉字 | ≥ 0.9 | `scripts/check_review.py` exit code per run |
| untraced fact-label rate (reference integrity) | fact-labelled claims with no `source_id` or a dangling one, per review. Does NOT count unsupported claims or facts mislabelled as interpretation — those have no instrument (未测; judge read, `rules/judge-must-flag.md`) | 0 | `scripts/validate_backing.py` |
| section-keyword coverage rate (proxy; not header presence) | % of reviews in which every genre-adapted keyword group appears **anywhere** in the text. One sentence naming the keywords over headerless prose passes, so this does not measure structure; header presence + real content per section has no instrument (未测; the writer owns it at Step 5) | high | `scripts/check_review.py` |
| route-classifier agreement (regex proxy; not skill activation) | `classify_route` agrees with the labels on a small routing fixture (album-review vs hifi-review vs lyric-translation/buy) | high | `classify_route` over `evals/fixtures/routing_cases.json` |

**Completeness pairing (H7) — declared 未测, not covered.** All four metrics above
are success-side. Their completeness partner — **distinct-content / repetition
rate** (how much of the 汉字 count is non-repeated substance) — has **no
instrument and is NOT measured**: the length gate counts 汉字 and cannot tell
10,000 字 of analysis from one paragraph pasted twenty times, so a high
length-window conformance rate does not entail a substantive review. That side is
carried only by the judge-must-flag negatives (`rules/judge-must-flag.md`) and a
human/judge read. Stating it as 未测 is the point: reporting the success side
alone would imply a coverage this plan does not have.

The first three success-side metrics are read straight off the validator's exit
semantics, so they are mechanically observable per run. Real activation is decided
by the host reading the `description`, not by `classify_route`; **activation
precision is 未测** until a description-driven trigger eval (positives + near-miss
negatives, run with the skill installed) is run — the route-classifier row is a
proxy and must not be reported as activation precision.
