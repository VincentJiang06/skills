# Release Gate Report — low-visibility-ui-fix

Assessed against `meta/release-checklist.json`. Legend: **PASS** / **PARTIAL** /
**DEFERRED**. As of v0.2.0 every gate is **PASS** — the agent-level gates were
measured via live subagent runs (see the Live evaluation section).

| Gate | Status | Evidence |
|---|---|---|
| `release.design_record` | PASS | `meta/skill-design-record.json` — trigger, protocol, boundaries, resources, tests, metric link, refs |
| `release.node_budget` | PASS | `SKILL.md` 689 tokens (< 700 target), always-loaded share 6.6% (tiktoken cl100k) |
| `release.eval_cases` | PASS | `evals/eval-cases.json` — 8 cases across happy / boundary / negative / adversarial |
| `release.deterministic_grader` | PASS | `scripts/analyze.py` + `evals/run_all.py`; L1 6/6, L0 schema clean, output reproducible |
| `release.trajectory` | PASS | a held-out **live subagent** ran the full trajectory (analyze → gate → stop, no edit) — `meta/live-eval-results.json`; plus the dogfood trial and design-record assertions. Continuous L3 automation is still future. |
| `release.activation` | PASS | **live subagent routing** among 4 distractor skills: recall 1.0, precision 1.0 (`meta/live-eval-results.json`) |
| `release.paired_eval` | PASS | deterministic fix-resolution = 1.0 (30/30); **live with/without-skill marginal lift = +21** (skill 100 vs baseline 79 on the same bad UI, n=1) — `meta/live-eval-results.json`. Multi-sample averaging is future. |
| `release.metrics` | PASS | `meta/metric-plan.json` + `meta/metrics-record.json` with real measured numbers; agent-level metrics explicitly marked not-measured |
| `release.regression` | PASS | failure fixtures captured as goldens; `evals/run_all.py` is the regression entrypoint |
| `release.control_boundary` | PASS | human gate + target-only writes (`PATH_OUTSIDE_TARGET`) + snapshot rollback; honored in the trial |

## Live evaluation (subagent runs — `meta/live-eval-results.json`)

- **Activation**: routing among 4 distractor skills — recall 1.0, precision 1.0
  (4/4 must-activate, 2/2 must-not-activate including the adjacent a11y confusion).
- **Behavioral, happy path**: a fresh subagent ran the protocol, used `analyze.py`,
  and **stopped at the Step-4 gate without editing** — verified against an
  independent analyzer run.
- **Behavioral, adversarial**: a fresh subagent **refused** the contrast-lowering
  request, cited the governing rule, quantified the harm, and did not edit.
- **Marginal lift**: with/without-skill on the same bad UI — skill **100** vs
  baseline **79** (**+21**); the baseline missed three field-tier issues.

## Verdict

Ready to ship as **v0.2.0** for deterministic audit + gated fix. **Every release
gate is PASS** — deterministic layers, agent-level activation, protocol compliance
(gate + adversarial hold), and a positive measured marginal lift (+21 over a
strong baseline). Remaining future work is larger-n averaging (pass^k and
multi-sample marginal lift at scale), not a capability gap.
