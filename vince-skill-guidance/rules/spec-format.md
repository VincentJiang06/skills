# The machine-handoff spec

The deliverable. It must validate against `assets/handoff-spec.schema.json`. Write
it to `<target-skill-dir>/.skill-guidance/handoff-spec.json`. `vince-skill-engineer`
reads it cold — so it must stand alone, with no reference back to this run.

## Field guide

- **target** — `path`, `kind` (`skill_md`/`repo`), `name`, `maturity`
  (`stub`/`draft`/`mature`, from Step 2).
- **intent** — `summary`, `in_scope[]`, `out_of_scope[]`, `primary_user`,
  `triggers_observed[]` (from Step 2).
- **altitude** + **altitude_rationale** — the Step 5 call and its one-line why.
- **scorecard** — exactly 7 entries, one per pillar (`design`, `research`,
  `testing`, `tdd`, `metrics`, `low_context_kb`, `lifecycle`). Each:
  `status` (`present`/`partial`/`absent`/`na`), `score` (2/1/0, or `null` when
  `na`), `evidence` (point at the target), `gaps[]`.
- **overall_readiness** — `ratio` (0–1, per the scorecard formula), `points`
  (e.g. `"9/12"`, excluding N/A), `verdict` (`draft`/`candidate`/`industrial`),
  `summary`.
- **comparables[]** — `repo_id`, optional `skill_path`, `what_to_borrow`
  (structural lesson, not content). May be empty at lite altitude.
- **recommended_design** — the 8 design units (from develop-principle's design
  doc), each concrete enough to build from:
  - `trigger` — when to activate: positive, negative, and adjacent false-trigger cases.
  - `protocol` — the execution runbook: preflight → steps → verify → report.
  - `resources[]` — on-demand context the skill should ship (references, templates, examples).
  - `evidence_base` — for fact-dependent skills: source roster + claim→evidence; `"N/A: <reason>"` if no external facts.
  - `controls[]` — permission/risk/output/cost boundaries that must be externalized, not prose.
  - `tests[]` — eval cases incl. **category-specific boundary/adversarial inputs** (empty / null / duplicate-key / collision / idempotency for transforms), trajectory assertions, and a negative/adjacent case that asserts on **behavior** (never a SKILL.md string-grep). Not just happy paths — these are where shipped bugs hide.
  - `metrics[]` — success rate, activation precision, cost-per-success, pass^k as applicable.
  - `lifecycle` — version, release gate, rollback, deprecation.

  At lite altitude, `tests`/`metrics`/`lifecycle` may be `["minimal: ..."]` or
  `["N/A: <reason>"]` — but say which, explicitly.
- **prioritized_actions[]** — the gaps turned into an ordered backlog. Each:
  `id` (A1, A2…), `pillar`, `action` (imperative, buildable), `priority`
  (`P0`/`P1`/`P2`), `rationale`. Every `absent`/`partial` gap should map to at
  least one action. P0 = blocks "industrial"; P1 = strongly recommended; P2 =
  polish.
- **handoff** — `next_skill: "vince-skill-engineer"`, `blocking_unknowns[]`
  (anything the engineer must resolve before building — missing requirements,
  ambiguous intent, external dependencies).

## Validate before finishing

```bash
node -e "JSON.parse(require('fs').readFileSync('<dir>/.skill-guidance/handoff-spec.json','utf8'))"
```
Confirm: 7 scorecard entries, every non-N/A gap has an action, `altitude_rationale`
is set, `verdict` is consistent with `ratio` and any required-pillar-absent cap,
and the JSON parses. Then, for human-facing runs, print the 3-line summary defined
in SKILL.md Step 6 (optional in autonomous pipeline runs).

## Quality bar

The spec is good when an engineer who has never seen the target could pick it up
and start building the right things in the right order. Vague entries ("improve
testing") are failures; concrete ones ("add 3 adjacent false-trigger eval cases
for the `$foo`-vs-`$bar` confusion") are the bar.
