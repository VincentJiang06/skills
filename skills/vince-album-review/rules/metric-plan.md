# Metric plan

| Metric | Definition | Target | Instrument |
|---|---|---|---|
| length-window conformance rate | % of runs landing in [10000,15000] 汉字 | ≥ 0.9 | `scripts/check_review.py` exit code per run |
| ungrounded-claim rate | fact-class claims with no valid `source_id` per review | 0 | `scripts/validate_backing.py` |
| section-coverage pass rate | % of reviews passing the genre-adapted section linter | high | `scripts/check_review.py` |
| activation precision | correct routing on a labeled trigger set (album-review vs hifi-review vs lyric-translation/buy) | high | `classify_route` over `evals/fixtures/routing_cases.json` |

The first three are read straight off the validator's exit semantics, so they are
mechanically observable per run. Activation precision is sampled from the routing
fixture (and should be re-sampled when the trigger surface changes).
