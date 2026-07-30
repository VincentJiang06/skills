# Metric plan

| Metric | Definition | Target | Instrument |
|---|---|---|---|
| length-window conformance rate | % of runs landing in [10000,15000] 汉字 | ≥ 0.9 | `scripts/check_review.py` exit code per run |
| ungrounded-claim rate | fact-class claims with no valid `source_id` per review | 0 | `scripts/validate_backing.py` |
| section-coverage pass rate | % of reviews passing the genre-adapted section linter | high | `scripts/check_review.py` |
| activation precision | correct routing on a labeled trigger set (album-review vs hifi-review vs lyric-translation/buy) | high | `classify_route` over `evals/fixtures/routing_cases.json` |

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
semantics, so they are mechanically observable per run. Activation precision is
sampled from the routing fixture (and should be re-sampled when the trigger
surface changes).
