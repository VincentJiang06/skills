# Metrics

For a skill whose whole point is **efficiency**, speed and safety are first-class,
measurable signals — not ceremony. Grounded in skill-principle `pillar.metrics`
(`metric.cost_per_success`, `metric.activation_precision`).

## Headline — speed (cost-per-success, bucketed by tier)

- **time-to-answer (p50 / p90)** per tier. Targets: **simple p50 ≤ 2 min**,
  **complex p50 ≤ 5 min**. The defining metric.
- **tool-calls per answer** (searches + fetches). Lower within the bar = better.

## Search efficiency

- **avg parallel width** (searches issued per round — should be issued together,
  not serially) and **avg fetches** and **avg rounds** per tier. Rising fetches or
  rounds without accuracy gain = rabbit-holing.

## Trustworthiness (the speed-safety guards)

- **claim-traceability rate** — % of load-bearing claims whose citation resolves
  **and** whose cited page actually supports the claim. Target **100%**. Measured by
  a reader on a labeled set, not by the script: `scripts/check_answer.mjs` only
  requires ≥ 1 visible `[n]` in the Answer + Key-evidence region that resolves to a
  listed source (a structural floor, not per-claim coverage or support).
- **confident-wrong rate** — % of **High-confidence** answers that are wrong on a
  labeled set. Target **~0**. This is the metric that justifies the speed: fast is
  only acceptable if fast-and-wrong is rare.
- **uncertain-honesty** — on unanswerable items, % correctly returned as
  `uncertain` rather than guessed.

## Activation

- **activation precision** — fires on fast factual questions; does **not** fire on
  deep-research report requests or subjective/opinion questions (the adjacent
  false-triggers). Track false-trigger rate against those two classes.

## How to measure

Paired runs (skill-principle `procedure.paired_skill_eval`): hold model/tasks
constant, run a labeled question set (a mix of simple, complex, contested,
volatile, and unanswerable), and record the above. The deterministic validator
only confirms the answer's structure (fields, resolving citations, source count);
traceability, speed and correctness all need the labeled set. The paired arm must
be the bare model with this skill explicitly disabled — the value of the skill is
the with-minus-without difference, not a green validator. Stamp every
measurement with the base model and effort it ran on; a base-model change expires
it — rerun before relying on it.
