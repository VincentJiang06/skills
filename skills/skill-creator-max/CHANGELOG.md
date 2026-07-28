# Changelog

## [1.1.0] — 2026-07-26

**R16 alignment (Claude 5 generation settlement, from the philosophy KB's P11/E11/A44/ADC2).**

- **battery: PROVE-OR-FLAG is now classify-not-delete.** The striking subagent reports EVERY
  noticed anomaly and only proposes labels (finding/flag + severity); deletion authority sits
  solely with the adjudicating judge. Rationale: frontier models obey "only report proven/severe"
  literally and silently under-report — recall dies at discovery (Anthropic's Claude 5 model docs
  prescribe full-coverage report + independent filter). Wording fixed in the charter, mechanism
  step 4, judge topology, and the SKILL.md battery gate description.
- **engineer: baseline-delta arms (E11/A44).** The day-one harness now runs with-skill vs
  without-skill arms and reports the triple delta (pass/token/wall-clock); assertions passing in
  both arms are deleted (anti-vacuity); the skill is classified capability-uplift (baseline arm =
  expiry detector) vs encoded-preference (fidelity, not uplift), gate-confirmed; pass-rate
  plateau ⇒ delete rules and re-test before adding more.

### Tested (2026-07-29, opus5 · medium, pre-publish gate)
Blind engineer-role run on a toy skill: pre-registered stop conditions, with/without arms with the
triple delta, anti-vacuity applied (23 zero-information assertions marked for deletion),
uplift-vs-preference classified, and a NOT-releasable verdict routed upstream instead of chasing
green — the v1.1.0 protocol was followed end-to-end at the anchor tier.

## [1.0.0] — 2026-07-14

Promotion from draft to **the** skill-building pipeline. skill-creator-max now REPLACES the retired four-skill pipeline (skill-guidance / skill-engineer / skill-zipper / skill-conductor — removed from the repo).

- **Standalone confirmed**: the `skill-philosophy` KB is design-time provenance kept outside the repo — not shipped, not read at runtime. The role-packs operationalize the rules and inline the anchors as citation labels; no KB needs to be present to run.
- **Live-tested this session**: built a new skill (`paper-writer`) end-to-end AND rebuilt `humanizer-academic` to v4.0.0 through the pipeline — both with genuine per-role fresh-context independence (a separate subagent per role). This CLOSES the 0.1.0-draft "one agent played all roles" coverage gap.
- **The independent battery caught real defects** the builders' own green test suites missed: a paper-writer P1 integrity gap and the humanizer hemoglobin fact-invention.
- **Honest residual**: the cross-vendor (model-tier) battery has still not been run — the one remaining independence gap. Self-rated strong-candidate / 1.0 with that caveat.

## [0.1.0-draft] — 2026-07-14

Ground-up build. One skill replaces the old four-skill pipeline (guidance / engineer / zipper / conductor), re-derived from the `skill-philosophy` KB — every rule cites a KB anchor.

- **Thin conductor** SKILL.md: performs no function itself; dispatches a fresh subagent per role, gates on the returned typed artifact, routes via min() hypotheses. Trigger discipline hardened for an EXPENSIVE skill (explicit skill-authoring requests only; hard anti-triggers incl. daily-memory-summary/journaling; trigger holdout 0/12 false-fires).
- **Five on-demand role-packs** (`roles/composer|guidance|engineer|zipper|battery.md`) — loaded only into the dispatched subagent's context, never the conductor body.
- **Five artifact schemas** (`schemas/`): SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord — six-vendor-intersection JSON, portable.
- **Deterministic L0 gate scripts** (`scripts/validate_*`, 7 scripts): structure-only by design (schema-valid ≠ true); each carries a `--selftest` discrimination proof (traps caught).
- **O5 independent battery** (`roles/battery.md`): self-contained, distilled from the vince-attacker five lenses; SEED anti-false-negative gate, pre-registered E9 budget/marginal stop (never "N clean rounds"), different-vendor attacker at high stakes; `effective_verdict = min(re-audit, battery)`.
- **Dogfood result**: built a real tiny skill end-to-end; all five L0 gates passed on genuine (non-fixture) artifacts with a real RED→GREEN harness.
- **Honest coverage**: the dogfood was one agent playing all roles — true fresh-context per-role independence NOT exercised; the battery NOT yet run cross-vendor. Self-rated `candidate`, not `industrial`.
