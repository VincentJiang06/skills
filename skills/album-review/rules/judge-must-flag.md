# Judge-must-flag registry

Fixtures in this list are **negatives that the deterministic gate cannot catch**.
Each one exits 0 from `scripts/check_review.py` and is nevertheless unshippable.
They exist to keep a known blind spot **visible** instead of silently absent.

**How this list is enforced.** `evals/run_all.py` checks only what a machine can
honestly check: that the registry exists and that each listed fixture is both
present on disk and named here (case `judge_must_flag_registry`). Whether a piece
is actually junk is a **semantic judgment** — it belongs to a human reader or an
LLM judge, not to a regex, a ratio, or a similarity threshold. No repetition-rate
gate is added here on purpose: "is this 10,000 字 of distinct content or one
paragraph in a hall of mirrors" cannot be decided stably by a count, and a
mis-firing gate that flags legitimate reviews would be worse than no gate at all
(false positives first).

**How to use it.** When the review pipeline changes in a way that touches length,
substance, or the honest-degradation path, a human or an independent judge reads
these fixtures and must reject every one of them. A run in which they all pass the
judge means the judging is broken, not that the fixtures got better.

## Registry

| Fixture | Deterministic gate | Why a judge must reject it |
|---|---|---|
| `fixtures/repetition_padded_10k.md` | **exits 0** (10,500 字, all 9 standard sections present) | The entire body is one ~150-字 paragraph repeated to the floor. The 汉字 counter sees 10,500 字 of content; a reader sees one paragraph. It says nothing about any album, carries no thesis, no per-track analysis, no evidence. Shipping it would be the length contract satisfied and the review contract destroyed. |

## Related, and deliberately NOT in this list

- `fixtures/cjk_padding_fails_floor.md` — Latin/punctuation padding. The gate
  **does** catch this one (500 真汉字 → below floor). It is a positive proof of the
  CJK-only counting rule, not a blind spot.
- The other generated fixtures (`good_pop_12k.md`, `classical_workperf.md`, …) are
  also filler prose. They are **mechanism fixtures** — they exercise the counter,
  the section linter, and the routing classifier, and their assertions claim
  nothing about writing quality. Do not read them as exemplars of a good 乐评;
  `assets/review-template.md` and `rules/output-template.md` are the exemplars.
- `fixtures/obscure_degraded.md` is hand-written prose (not generator output),
  because its assertion **is** semantic: it claims to be a legitimately thin-material
  review that should still pass. A repetition-padded file could never honestly
  carry that claim.

**Repo note.** The fixture files themselves live in `evals/fixtures/`, which is
local-only (the repo `.gitignore` excludes `skills/*/evals/`). A fresh clone gets
this registry but not the fixtures; regenerate the padded negative with
`evals/fixtures/_gen_fixtures.py` (local installs keep the full set). This file
lives in `rules/` precisely so the contract survives cloning — same precedent as
blind-judge-rubric.md moving out of `evals/` (2026-06-08 cleanup).
