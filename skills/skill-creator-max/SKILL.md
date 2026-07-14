---
name: skill-creator-max
description: >-
  Build a NEW agent skill from scratch, end-to-end — a thin conductor dispatches fresh
  subagents through five gated roles (compose spec -> design structure -> red-green build ->
  compress -> independent attack). EXPENSIVE (large token cost): trigger ONLY on an explicit
  user request to author/build/create an agent skill — "build me a skill", "create a new
  skill", "package this repeated workflow so it triggers automatically", "$skill-creator-max".
  Do-NOT fire for: summarizing or writing daily/session memory or journaling (incl. Chinese
  "总结/记录今天的记忆"), or any generic "create/make/summarize X" that is not authoring an agent skill.
metadata:
  version: 1.0.0
  model_agnostic: true
---

# skill-creator-max

This SKILL.md **is the conductor**. It does not compose, design, build, or compress anything
itself. It **dispatches a fresh subagent per role, monitors its return, judges the typed artifact
against a gate, and routes the next move.** All of its power comes from the artifacts, never from
reading a subagent's process (O1/O2). Keep this body thin — every heavy rule lives in `roles/` and
loads only into the dispatched subagent's context, never here.

## 0. Trigger discipline (this skill is expensive — protect the trigger)

Fire ONLY when the user is explicitly asking to **author/build/create an agent skill**. This skill
spends a large token budget; a false trigger is costly.

**Hard anti-triggers — never self-fire on:** summarizing or writing daily/session memory,
journaling, "recall/save what happened today" / "总结/记录今天的记忆", or any generic
"create / make / summarize X" where X is not an agent skill. If skill-authoring intent is ambiguous,
ASK one question before dispatching anything — do not spend the pipeline on a guess.

## 1. The pipeline — five typed artifacts (the conductor judges artifacts, not chat)

Each role runs in its OWN fresh subagent, handed only its role-pack + the upstream artifact(s). The
conductor gates on the returned artifact, then routes.

| # | Role (subagent) | Role-pack | Produces (artifact) | Structure-only gate (L0) |
|---|---|---|---|---|
| 1 | **composer** | `roles/composer.md` | **SkillSpec** (C-series: 15-field decision object; Rejected/Unknowns/Stop/TriggerTests) | `scripts/validate_spec` exit 0 |
| 2 | **guidance** | `roles/guidance.md` | **Structure Contract** (S-series: unit ten-tuples + layering argument + rejected structures) | `scripts/validate_structure` exit 0 |
| 3 | **engineer** | `roles/engineer.md` | **Evidence Dossier** (E-series: layered eval E-L0..L5 + evaluator calibration + red-light history) | `scripts/validate_report` exit 0 (re-runs harness) |
| 4 | **zipper** | `roles/zipper.md` | **Compression Report** (Z-series: per-path token delta + behavioral-equivalence veto + 3 ledgers) | `scripts/validate_compression` exit 0 (`diff_lossless` is the supporting losslessness check) |
| 5 | **battery** | `roles/battery.md` | independent adversarial acceptance (O5/E9: PROVE-OR-FLAG findings, fresh context) | findings adjudicated; see §5 |

The conductor itself produces the sixth artifact: the **Decision Record + Learning Record** (§7).
Structure gates are L0 only — **passing a gate is never evidence the artifact is substantively right**
(schema-valid ≠ true, pit 1). Substance is bought by the battery (§5) and by second-order spot-checks.
Each artifact's charter + grounding: `references/orchestration-anchors.md` §1.

**Two-stage structure check (greenfield build order).** At stage 2 the Structure Contract *names*
files the engineer has not built yet, so `validate_structure` does NOT check on-disk existence there.
After the engineer stage the conductor RE-runs `validate_structure --check-files` so every unit's
`content_ref` now resolves to a real file (fail-closed at that point). Reference-existence is an
engineer-stage gate, not a guidance-stage one.

## 2. Dispatch protocol (O6 — four-piece packet, single writer)

Every dispatch carries four pieces: **goal · output format (the artifact schema) · tools/sources ·
boundaries.** One artifact has exactly one writer at any time. Parallel is legal only as (a) read-only
intelligence (independent review/second-opinion, clean context, returns conclusions) or (b)
mutually-exclusive shards with no shared write surface. Every dispatched role runs from a **fresh
context with no build-history leak** — this is what decorrelates builder from grader (pit 5).

The **battery dispatch carries three extra pieces** its role-pack requires or it refuses/voids:
`budget` (the pre-registered E9 rounds/marginal threshold), `seeds[]` (≥1 planted defect per lens,
by the conductor — never the attacker), and `required_tier` (`instance`/`model`/`human`). See §5.

## 3. min() routing on gate failure (O3 — fix the smallest term, not the alarm)

行为正确性 ≈ min(spec 完整度, 结构承载力, eval 证据力). On any gate failure the conductor MUST emit a
**routing hypothesis**: which upstream artifact/field is the smallest term (not "where it alarmed").
Route the repair budget there. The hypothesis is recorded in the Decision Record; if the repair does
not clear the failure, the hypothesis is void and the failure-mode→stage map is corrected.

The failure-mode→owning-stage routing table: `references/orchestration-anchors.md` §2.

## 4. Two-tier gate economics (O4)

- **High-leverage gates** (first build, major version): independent, veto-holding, expensive — the
  battery (§5).
- **Routine gates** (each iteration, small edit): self-serve machine-runnable checklist distilled from
  incident history — never queue a fresh battery for a wording fix (don't send the Bar Raiser to check
  attendance).

## 5. Independent battery — O5 constitutional mandate

The builder's green light is NOT the end of evidence: builder + its own eval share a blind spot. At a
high-leverage gate the conductor dispatches a **fresh, build-history-blind subagent** that attacks the
built skill's observable behavior through `roles/battery.md` and records ONLY proven, reproducible
breakages (PROVE-OR-FLAG). Before dispatch the conductor MUST (a) **pre-register the E9 budget /
marginal threshold** (rounds cap + "N consecutive rounds no new P1/P2", scaled to spec.failure_cost)
and (b) **plant ≥1 seed per lens** (a Coherence arithmetic contradiction, a Gaming existence-check
cheat, a stale Evidence citation, an un-transcribable Reality rule, an un-clocked Foundation param) —
a run that misses its seed is **void**. Stop is **budget/marginal — never "N clean rounds"** (the
battery is asymptotic). At **A33 high stakes, dispatch a DIFFERENT-VENDOR attacker** for model-tier
independence; `roles/battery.md` is self-contained (distilled from the vince-attacker lenses) so the
default path needs no external skill.

`effective_verdict = min(re-audit_verdict, battery_verdict)`; the written verdict may never exceed the
battery verdict. A "green but visibly wrong" output is a gate FAILURE, not a pass. The lens rotation
must periodically include an **evaluator-audit lens** (so cheating can't hide in the evaluation layer),
and upstream-field author-homology is a standing battery check (E6 second shadow).

## 6. Capability ladder (O7 — earn autonomy with evidence)

Ships at **O-L0 (every gate human-judged)**. Upgrade conditions are pre-registered (e.g. O-L1→O-L2:
routine checklist N consecutive rounds zero disagreement with the human). Any serious incident
auto-demotes one level (rollback before autonomy); demotion records its recovery condition.

## 7. Decision Record + Learning Record (O2/O8)

Every gate verdict is saved as a **complete decision object**: question · evidence (pointing at
artifact entries) · options considered · **options rejected + why** · uncertainty · adjudicator ·
remediation path. A `PASS` with no rejected options is an un-thought signal. On pipeline close, emit a
**Learning Record** with three fixed destinations: a checklist entry (O4), a Gotcha backfill (S6), and
a KB revision (may weaken/overturn an existing article). The conductor self-gates this artifact
through `scripts/validate_decision` (min-fold cap, O-L0→human adjudicator, learning-record
completeness). Ladder / release / routing detail: `references/orchestration-anchors.md`.

## Modules (on-demand — loaded into the dispatched subagent, not here)

- Role-packs: `roles/{composer,guidance,engineer,zipper,battery}.md`
- Artifact schemas: `schemas/{skill-spec,structure-contract,evidence-dossier,compression-report,decision-record}.json`
- Deterministic L0 gates (structure-only, each with `--selftest`): `scripts/validate_spec.py`,
  `scripts/validate_structure.py` (`--check-files` post-build), `scripts/validate_report.py`
  (re-runs the harness), `scripts/validate_compression.py`, `scripts/validate_decision.py`.
  Supporting tools: `scripts/measure_tokens.py` (token/architecture flags), `scripts/diff_lossless.py`
  (zipper losslessness check).
- Orchestration anchors + conventions (install, description limits, bilingual README): `references/orchestration-anchors.md`
