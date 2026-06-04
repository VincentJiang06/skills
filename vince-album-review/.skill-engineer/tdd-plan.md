# TDD plan — vince-album-review (full altitude)

Mechanism: `scripts/check_review.py` (CJK-字 window + section linter + backing gate)
imported by `evals/run_all.py`. Backing contract: `schemas/backing.schema.json` +
`scripts/validate_backing.py`. Harness prints `PASS/FAIL <case_id>`, exits non-zero on any fail.

Resolved blocking_unknowns (orchestrator decisions, locked in):
1. 中文字符 = CJK 汉字 ONLY, regex `[一-鿿]`. Latin/digits/punct do NOT count. Window [10000,15000].
2. Backing JSON emitted alongside prose; every fact-class claim's `source_id` must exist in `evidence[]`.
3. Runtime uses web tools when available, degrades to caller material offline. Tests are 100% offline/static.

## Backlog (P0 → P1 → P2), each = red → green → refactor

| Action | Pillar | What it buys | Red case(s) |
|---|---|---|---|
| A1 | research | source roster + claim→evidence map + honest-degradation | backing gate cases (untraced fact FAILs); obscure '资料不足' fixture PASSes |
| A2 | testing | deterministic validator: 字 window + section linter + backing gate | length boundary cases, section-missing case, good case |
| A3 | tdd | red-first against wrong stub; backing/exit-semantics contract | red.log with real FAIL lines; schema rejects bad-evidence-ref |
| A4 | design | frontmatter Use-when/Do-NOT + executable protocol + externalized controls | (covered by behavioral routing fixtures + doc-claim coverage) |
| A5 | low_context_kb | thin SKILL.md + rules/ + references/ + assets/ split | structural; SKILL token budget case |
| A6 | metrics | length-conformance, ungrounded-claim, section-coverage, activation precision | metric-plan note |
| A7 | lifecycle | version + CHANGELOG + release gate | CHANGELOG present |

## 10 adversarial edges → concrete fixture cases (all must pass green)
1. 9,999 字 → FAIL under-floor                → case `under_floor_9999`
2. 15,001 字 → FAIL over-ceiling; 12k PASS    → cases `over_ceiling_15001` + `good_pop_12k`
3. track/personnel/date no source_id → FAIL   → case `untraced_fact`
4. fabricated fact (source_id absent from evidence[]) → FAIL → case `fabricated_evidence_ref`
5. classical work-vs-performance + ref-recording section present → case `classical_workperf`
6. obscure thin-info → explicit 资料不足, no invented specifics → case `obscure_degraded`
7. genre mismatch: symphony not forced into pop template (pop class rejects 乐章-only set; classical needs it) → case `genre_mismatch_pop_missing_movements` + `classical_workperf`
8. non-standard release form (single/EP/box) → unit adapts, no crash, window applies → case `release_form_box`
9. CJK padding: Latin/digit/punct padding, few 汉字 → FAIL floor → case `cjk_padding_fails_floor`
10. adjacent-skill input (耳机/DAC → hifi; translate lyrics; buy recs) → NO review produced → case `routing_adjacent`

Mutation spot-check (full): break the CJK regex / the floor compare → a length case goes red.
