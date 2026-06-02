# Release Gate Report — low-visibility-ui-fix

Assessed against `meta/release-checklist.json`. Legend: **PASS** / **PARTIAL** /
**DEFERRED**. PARTIAL/DEFERRED items need live agent runs not available in this
build; the harness for them exists.

| Gate | Status | Evidence |
|---|---|---|
| `release.design_record` | PASS | `meta/skill-design-record.json` — trigger, protocol, boundaries, resources, tests, metric link, refs |
| `release.node_budget` | PASS | `SKILL.md` 689 tokens (< 700 target), always-loaded share 6.6% (tiktoken cl100k) |
| `release.eval_cases` | PASS | `evals/eval-cases.json` — 8 cases across happy / boundary / negative / adversarial |
| `release.deterministic_grader` | PASS | `scripts/analyze.py` + `evals/run_all.py`; L1 6/6, L0 schema clean, output reproducible |
| `release.trajectory` | PASS | a held-out **live subagent** ran the full trajectory (analyze → gate → stop, no edit) — `meta/live-eval-results.json`; plus the dogfood trial and design-record assertions. Continuous L3 automation is still future. |
| `release.activation` | PASS | **live subagent routing** among 4 distractor skills: recall 1.0, precision 1.0 (`meta/live-eval-results.json`) |
| `release.paired_eval` | PARTIAL | deterministic fix-resolution paired metric = 1.0 (30/30, score 0→100); a live subagent also passed the adversarial hold (refused contrast-lowering, `meta/live-eval-results.json`). A with/without-skill marginal-lift comparison is still future. |
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

## Verdict

Ready to ship as **v0.2.0** for deterministic audit + gated fix. Deterministic
layers and agent-level activation + protocol compliance are all measured and
passing. The only remaining PARTIAL is `release.paired_eval`'s with/without-skill
**marginal-lift** comparison (needs paired agent runs at scale). **No required
gate is failing.**
