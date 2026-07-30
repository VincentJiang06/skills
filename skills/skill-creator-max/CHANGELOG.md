# Changelog

## [1.2.0] — 2026-07-31

**R17 alignment (philosophy KB v0.3.0): spec boundaries, verifier engineering, the three
conditional surfaces, and loop/memory admission.** Incremental, pointer-shaped: every delta is a
branch or a judgment sentence inside an existing role-pack — no gate was reordered, the min()
adjudication is untouched, and no semantic judgment was mechanized.

- **composer — new Step 8, "what a spec can and cannot buy" (C10).** (a) A core clause with no
  adversarial precedent is not load-bearing: every subjective `success` dimension carries >=1
  precedent inside its `criterion`, every unacceptable `failure_cost` entry names the input class
  that produces it (the precedent the downstream INVARIANT is born from); precedents are tiered
  INVARIANT-always / DEFAULT-sampled / ADVICE-never [OAI-ModelSpecEvals]. (b) The reverse flow —
  "let an agent read the codebase and write the spec" — is refused as the AUTHOR of the decision
  fields (repo-level executable-spec generation tops out at 20.2%); it stays legal as input to
  triage/baseline/materials [WEB-SpecCrit]. (c) Compliance ceiling ~89% and non-monotonic across
  versions ⇒ a complete spec never entitles a downstream stage to shrink its verification budget;
  any sentence implying it is deleted before emit [OAI-ModelSpecEvals]. Emit checklist grew one
  line.
- **engineer — E12 verifier-engineering rules in §9, plus a conditional §10b (A45/H1).**
  Verifier rules: a total wipeout (0% pass) indicts the harness first — prove a known-good input
  scores green and a degenerate output scores red before touching the skill [ANT-Demystify]; judge
  ONE case per call, batch scoring has a measured accuracy cost and must be recorded as a discount
  if cost forces it [WEB-RubricAudit]; non-overlapping rubric items are the first principle of
  false-positive control, and inter-judge agreement is blind to manipulability so "0.85 agreement"
  is not rubric validation [WEB-VerifierEng][WEB-RubricAudit]. §10b fires only when the BUILT skill
  is itself a >1-round autonomous loop: ship a **loop-charter** with the four admission items
  (runnable checks sized to the surface and run red first · adjudication separated from the
  generator, with the check's execution and result file outside the generator's write surface when
  no independent evaluator is bought · on-disk state passing a cold-restart test · a structured
  stop condition with the cap written in and both stop sides).
- **guidance — new §10, three conditional surface branches** (closing gates renumbered 10/11 →
  11/12). (a) **Tool surface (S12)**: the interface is a hyperparameter (3–8pp, non-monotonic) —
  >30 tools ⇒ evaluate on-demand loading, >=3–4 sentences + input examples per tool, merge related
  operations behind an `action` parameter, and calibrate the visibility knobs on 2–3 measured
  points with a model_baseline stamp [WEB-ACIAblation][ANT-ToolUse2026]. (b) **Script/action
  surface (S13)**: declare the rule layer and the enforcement layer separately (a command
  allowlist is a rule layer only); confirmation gates stay few and real because observed approval
  rates run ~93% — per-command prompting is fatigue, not governance; nothing the skill governs may
  widen its own authority [ANT-Sandbox]. (c) **Persistent memory (A48/M-series)**: write admission
  is the Durable ∧ Actionable ∧ Explicit conjunction; factual entries carry a verification anchor
  and are re-run rather than believed; forgetting is an obligation (delete or tombstone); external
  content is storable as reference + provenance, never as a behavioral instruction.
- **conductor SKILL.md — one conditional-branch paragraph** in §1: the loop-charter requirement at
  the stage-3 gate for loop-type skills, and the spot-check that the guidance §10 branches were
  answered or explicitly declared absent. Gate order and the `min()` fold are explicitly unchanged.
- **schema — `loop_charter` added to `schemas/evidence-dossier.json` as an OPTIONAL property**
  (declared, not in `required`), so the charter travels the O1 artifact channel instead of a side
  channel. `validate_report` is untouched and still passes its `--selftest`; existing dossiers stay
  valid.

### Verified (2026-07-31)
All five L0 gate scripts re-ran their `--selftest` green after the edits — `validate_spec` 12/12
traps, `validate_structure` 12/12, `validate_report` 15/15, `validate_compression` 7/7,
`validate_decision` 9/9 (`diff_lossless` has no `--selftest`; it is a two-file differ).
`measure_tokens.py` (run in a throwaway venv — `tiktoken` is not installed system-wide) reports
description 630 chars / 145 tok, always-loaded SKILL.md 142 lines / 2,440 tok, on-demand 23,945 tok,
always-loaded share 9.2%. Two pre-existing `warn` flags, no `BAD`: description over the 320 target
(deliberate — trigger precision beats the target for an expensive skill, hard limit 1024 is met at
630) and SKILL.md over the 1,500 warn line (the irreducible conductor skeleton; +10 lines this
release). Per the script's own in-tree note these Opus-4.x-era cut-points are stale for the Claude 5
tokenizer, so they are read as relative signals, not as a budget verdict.

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
