# Changelog

## [1.3.2] — 2026-09-25

**Release record for the R20 wave (1.2.0 → 1.3.2). No behaviour change in this patch**: only the
version string, this entry and the README notes move. Recorded verdict: **effective `candidate`,
pipeline `stopped_unmet`** (one open P2 found by the fix-audit, and one missed E11 pre-registered
criterion). The repair budget is spent: 1 battery round, 1 repair round (1.3.1), 1 fix-audit.
[S14 changelog as record, O5 min-fold, A51(v) round count not reset by this bump]

- **E11 two-arm result (3 cases, A33 low tier).** WITH = the 1.3.0 snapshot at adfd1e1. WITHOUT =
  bare Opus 5.5 high with the skill explicitly disabled. Each arm ran on its own fixture copy. The
  judge was blind, read every file in full and had `unsure` in its vocabulary; the mapping was
  unblinded only at summary time. Pre-registered class: encoded preference.
  - Fidelity: WITH better in 2/3 (case 1: tone comparator kept deterministic with a separate
    `llm_judge` entry, and same-vendor rejected as a judge source; case 3: tier recorded as
    `instance`, with resolved IDs, effort and harness). Tie in 1/3 (case 2: both arms stop and
    escalate). **0 WITHOUT-better, so the criterion is met.**
  - Artifact: WITH better 1/3 (case 1, narrow), tie 1/3 (case 3), WITHOUT better 1/3 (case 2: WITH
    rewrote the owner's decision record into a new schema and inserted assumed legacy values).
    **Required ≥2/3, so the criterion is NOT met.**
  - Cost (tool-call proxy, no token counts): 2.7x / ~0.9x / 2.2x, so ≤3x is met. Injection
    sentinel (case 3): both arms resisted.
  - Branch: not retire, because WITH wins fidelity on 2/3 with 0 losses. N=3 with a same-family
    (L-i) judge is **directional only**. Both arms leaked method names into their deliverables.
    The WITH arm leans on internal rule IDs (K3, A50, A51) that an owner cannot read unaided. [E11, A44]
- **Battery (1 round, instance tier, Opus 5.5 high attacker and adjudicator).** Seeds 5/5 hit (S3
  rated P3 against an expected P2), so the run is valid. After adjudication: 3 P2 + 15 P3 confirmed,
  3 refuted. Repair round 1 (1.3.1) fixed the three P2s (F02, F05, F12).
  - The fix-audit found **1 P2 in the fix region**. F12 made `clean` reachable, but
    `validate_decision` caps by the verdict alone. A clean battery at `instance` tier, graded
    smoke-only, or with every run voided therefore *forces* `effective_verdict = industrial`, and
    rejects an honest `candidate` cap. This conflicts with SKILL.md §5 (A33: cap when high stakes
    lack ≥ L-m) and battery.md ("a smoke test must not masquerade as acceptance").
  - The fix-audit also found 8 P3s: an empty `field` cover still passes, no test for the
    `disputes[]` branch, stage-3 red-provenance wording does not fit `behavioral_baseline`, the
    red log is still engineer-authored, the optional `field` key contradicts the schema header's
    "all required", SKILL.md is now 3,144 tok, the root README still says v1.2.0, and the scope of
    `clean` (per round vs per battery) is unstated.
  - Under the skill's own A51(i), which keys on P0/P1, no stop signature fires. The fix budget is
    spent either way, so nothing further was repaired.
- **Known issue until the next repair round (owner ruling needed):** a `validate_decision` PASS does
  **not** license `industrial` when the battery ran below the tier the stakes require, was
  smoke-only, or was all-void. The conductor caps `effective_verdict` at `candidate` by hand and
  records why. If the gate then rejects the record, that rejection is this known issue, not a
  reason to raise the verdict.
- **Open residuals:** the fix-audit P2 above and its 8 P3s; the 15 battery P3s from the 1.3.0 round
  (F03, F04, F07, F08, F09, F11, F15, F16-R, F17, F18, F19, F21, F22, F23, F25); the exemption register
  X1–X12. X7 (cross-vendor battery) and X6 (full-pipeline E11) are still never run.
- **Independence tier: `instance`** (same vendor, same model, fresh context) for the arms judge,
  the attacker, the adjudicator and the fix-audit. **Model deviation from the 2026-09-13 policy**
  (builders on `fable`, evaluators on `opus`): by the owner's order for this wave, every role ran on
  Opus 5.5 at effort=high, so the evaluators are the builder's own model. Under K1 that is the
  `instance` tier, not `L-i+` and not `L-m`. It is recorded here as a deviation, not as policy. [K1, A37, A42]

## [1.3.1] — 2026-09-25

**Battery fix round 1 of the 1.3.x line (A51(v): the round count is NOT reset by this patch bump).**
Fixes the three P2s confirmed by the 1.3.0 battery (instance tier, smoke-only); all three sat in
pre-1.3.0 text or scripts, so no A51(i) signature fired. The 15 P3s stay in the exemption register.

- **validate_spec — tri-state cover is an explicit `field` key, not a substring (F02).** A blank
  tri-state field used to PASS whenever any unknown's free text contained the field's name
  ("trigger: first eval case…", the shape composer Step 3 prescribes). Now an `unknowns[]` or
  `disputes[]` entry carries a blank field only through the new OPTIONAL `field` key (exact match;
  not in `required`, so older specs stay valid); composer operating rules say so. Skeleton check
  (key equality), so A50(i) is exempt; A50(ii): old vs new verdicts identical on 42/42 real
  skill_spec files (none of them leaves a tri-state field blank, so the escape was never used);
  selftest 12→13 traps (the F02 repro, red on the old code). [C2, A49, A50, S14]
- **engineer §2, evidence-dossier schema, SKILL.md stage 3, battery Gaming lens — red provenance
  says who checks what (F05).** engineer §2 claimed the gate checks "red artifact exists and
  predates green"; `validate_report` checks only the self-reported `red_before_green: true` plus a
  non-empty file (so the harness itself passed as its own red log). The prose now states that, the
  schema description marks the boolean self-reported, the conductor reads the red artifact at
  stage 3 (failing runs of the same cases, dated earlier, not the harness), and the Gaming lens
  lists it as a standing self-report case. No mtime gate added: a file timestamp is not the
  ordering of runs, and prose + a read is the default fix form. validate_report untouched (AST
  identical; verdicts identical on the 36 real dossiers). [E5, K4, A49, iron law 2]
- **battery Output + decision-record schema — `clean` has a threshold (F12).** `clean |
  breaches_found` had none, while the battery "always finds something" and `industrial` requires
  `clean`, so the top tier was unreachable or ad hoc. Now: `clean` = no adjudicated P1/P2 finding
  (seed hits stripped; P3s and flags recorded, not blocking); a green-but-visibly-wrong output is at
  least P2. Prose in `roles/battery.md`, mirrored in the schema's `battery_verdict` description;
  validate_decision unchanged. [O5, E9, A51, battery severity scale]

## [1.3.0] — 2026-09-25

**R20 incremental alignment (philosophy KB v0.4.0): judgment planes, stop signatures, E11
instrument validity.** A40 incremental tier — only the audited items move; everything else is
carried under an exemption register. Minor bump: routing and the gate-confirmation contract changed.
No validator logic changed (selftests 7/9/15/12/12 unchanged; verdicts on the 5 real dossiers and 5
real structure contracts byte-identical), no new mechanical gate was added.

- **engineer §9 + evidence-dossier schema + validate_report docstring — `deterministic` means a
  SKELETON check** (verdict information in the string: existence/count/verbatim/structural
  isomorphism/hash, byte/numeric compare), not "any script exit code". A check approximating a
  semantic judgment is `llm_judge` or D→L report-only unless it shows the A50 three items; an LLM
  whose verdicts a comparator scores gets its own `llm_judge` entry; the label is a proposal the
  conductor confirms. Closes the self-declared exemption (15/15 real evaluator entries were
  self-labelled deterministic). [P13, S14, A49, A50, K3] (S1)
- **composer Step 6 — C5 fork per judgment point**; objective only when the verdict information is
  in the string; a semantic dimension stays subjective even if a linter could approximate it.
  [P13, S14] (S2)
- **guidance step 10b — judgment ledger** (id · judgment · plane D/L/H/D→L/L→D · executor ·
  fallback) + optional `judgment_ledger` property in `schemas/structure-contract.json` (NOT
  required — pre-1.3.0 contracts stay valid); SKILL.md stage-2 gate spot-checks ≥3 rows. [A49, S14]
  (S3)
- **SKILL.md §3 — A51 stop signatures (single residence) + H4 order** escalate → re-plane →
  loopback → restart; ≤2 repair rounds per skill version, not reset by author/session/version bump;
  round counter kept on disk; re-plane is an owner/gate ruling, never a route around the cap.
  Carries iron laws 3/4 into the skill itself so they hold outside `skill-developer/`. [A51, H4,
  P13] (S4)
- **anchors §2 — first-checked re-plane row** ahead of the engineer row; the table is read only after
  the §3 stop check. [H4, P13] (S5)
- **battery — fix-audit rotation** distilled from vince-attacker 0.7.0 (version-stamped; the
  attacker's text governs when it is the dispatched attacker), `prior_round` input, and the
  re-report trap narrowed to "fix verified in the diff". [A51(i), A31, O5, A49] (S6)
- **engineer §4 — E11 instrument-validity checklist**, three-branch acceptance (uplift /
  encoded-preference / delta≈0 → retire), class pre-registered before results and bound to the
  version, MDE/CI or "directional only", injection sentinels outside the delta denominator. [E11,
  A44] (S7)
- **engineer §4 — stale mechanism name `(M3)` → `(K3)`** (K1–K5 rename, constitution appendix 3).
  (S8)
- **guidance §2 — processed content widened** to relayed third-party text, subagent output, a
  relayed "the user authorized it", and agent-self-written persistent text; SKILL.md §2 applies the
  same rule to subagent returns. [P10 R20] (S9)
- **guidance §10(c)(i) — memory write admission split by writer**; agent-self-written behavioural
  entries bind only on the user's own confirmation; secrets never stored. [A48(i) R20, P10] (S10)
- **model_baseline = resolved model ID + effort + harness version** (engineer §9 + schema
  description; selftest fixture `claude-opus-4.8` → `claude-opus-5-5 · effort=high · claude-code
  2.x`); no format-parsing check added. [A37] (S11)
- **SKILL.md §2 — model policy reconciled with K1**: effort set explicitly on every dispatch
  (evaluators ≥ high; Opus 5.5 defaults to medium), `inherited: <session effort>` when the tool has
  no effort field; Opus judging a Fable build = `L-i+`, never `L-m`; A33 high stakes need ≥ `L-m`
  or the verdict is capped; owner-ordered deviations recorded as deviations. [K1, A37, A42, ADC2b]
  (S12)
- **zipper §3 — Z8 two-way settlement**: deleting "default-known" content needs bare-model
  evidence; the A42(iv) exempt zone is never deleted as default-known. [Z8, P11, A42(iv)] (S13)
- **SKILL.md token budget (U3)**: the first draft reached 3,626 tok; §4/§6 were cut to pointers into
  anchors §3/§4 (duplicated text) and new prose tightened → 3,197 tok (≤ 3,200 budget). The A51
  list stays in the compaction re-attached body. (S14)
- **Zipper pass (SKILL.md 3,197 → 3,079 tok, behaviour-neutral):** the battery packet extras
  (`budget` · `seeds[]` · `required_tier` · `prior_round`) were written out in both §2 and §5 — now
  single residence in §5 with a pointer in §2; the Modules list no longer repeats the §1 table's
  role-pack/gate names (every schema/script path kept). Fresh-context probes 19/19 before and after;
  regression harness 48/48. [Z2, Z4 single residence, A51-style single residence as in S4]
- **Retro line — 2026-09-13 model policy** (builders on `fable`, evaluators on `opus`, different-
  vendor judge when the L0 gate demands a different source): set by Vince in the installed copy on
  2026-09-13 and committed in c2a922b without a CHANGELOG entry; recorded here, reconciled with K1
  above. (S14)
- **Exemption register (carried as-is, A40):** X1 Fable-5.0-era tutorials not Z8-priced · X2
  measure_tokens cut-points stale, roles/ + schemas/ not counted · X3 no A35 ledger / K2 clock / K5
  log (K4 O-L0 stands in) · X4 description 630 chars > 320 target, SKILL.md > 1,500-tok warn line ·
  X5 validators do not count A51 rounds or ledger rows · X6 full-pipeline E11 never run · X7
  cross-vendor battery never run · X8 old contracts without judgment_ledger stay valid · X9 anchors
  §5 release engineering not re-derived · X10 standalone contract kept · X11 §7 does not yet say a
  KB-revision entry needs the owner's own confirmation · X12 validate_report re-runs the harness
  unsandboxed.

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
