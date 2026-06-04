# Altitude: lite vs full

Industrial-grade does **not** mean always-heavy. It means *the right rigor for the
stakes*. Forcing a 30-line utility skill through full research + metrics +
lifecycle ceremony is itself a design failure — it produces bloat and friction.
The altitude call protects against that.

## Decide from three factors

- **Stakes** — what breaks if the skill misfires? Touches money/prod/secrets/user
  data → high. Cosmetic/local/reversible → low.
- **Maturity** — `stub` leans toward fuller planning (much to design); `mature`
  leans toward targeted evaluation.
- **Surface area** — many triggers / tools / branches → more rigor. One narrow,
  deterministic transform → less.

Default mapping (override with judgment, and record the reason in the spec):

| Situation | Altitude |
|---|---|
| Touches dangerous capabilities (runs code/git/network, writes files), field-safety, or adversarial controls | `full` (regardless of maturity) |
| High stakes, or wide surface, or "make this production/industrial" | `full` |
| Low stakes + narrow surface + mature | `lite` |
| Stub with real ambition — description signals multi-user / production / pipeline / reuse, not a one-off | `full` |
| Small personal/one-off utility | `lite` |

The first row wins ties: a mature, narrow skill that still gates a dangerous
capability is `full`, not `lite` — don't make the evaluator argue the override
from scratch each time.

## What each altitude includes

| Step | lite | full |
|---|---|---|
| Scorecard (Step 3) | All 7 pillars, but `research`/`lifecycle` may be marked **N/A** when truly out of scope | All 7 pillars scored; N/A only with explicit justification |
| Comparables (Step 4) | ≤1, or skip if gaps are obvious | 2 comparables + `query_kb --exhaustive` on the weakest pillars |
| Recommended design (Step 6) | The 8 units, but `tests`/`metrics`/`lifecycle` may be "minimal / N/A with reason" | All 8 units specified concretely |
| Prioritized actions | P0 + a few P1 | P0/P1/P2, full backlog |

## Required pillars (absent caps the verdict at `draft`)

This resolves the cap rule in `rules/scorecard.md`. A **required** pillar scoring
0 forces `verdict: draft` and a P0 action. A **N/A-eligible** pillar may be
`status: na, score: null` when genuinely out of scope (justify in `evidence`).

| Pillar | lite | full |
|---|---|---|
| `design` | required | required |
| `low_context_kb` | required | required |
| `testing` | expected (partial ok) | required |
| `tdd` | N/A-eligible | required |
| `metrics` | N/A-eligible | required |
| `research` | N/A-eligible | expected; N/A only with justification |
| `lifecycle` | N/A-eligible | expected; N/A only with justification |

"expected" means: don't mark N/A lightly, but a 0 here does not by itself cap the
verdict (it still produces a P1/P2 action).

**Exception for from-scratch stubs:** when the target maturity is `stub` (you're
planning from scratch), keep `tdd` *scored* (`absent`/`partial`), not `na`, even
at lite — forcing red-first before the engineer builds is the whole point.

State the altitude and its one-line rationale in the spec (`altitude`,
`altitude_rationale` — both required by the schema). The downstream
`vince-skill-engineer` uses it to size its own effort — a wrong altitude here
cascades.
