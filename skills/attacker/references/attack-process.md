# Attack process — READ → DESIGN → EXECUTE → PROVE → RECORD

The full per-round procedure. SKILL.md is the thin runbook; load this for detail.
Synthesized from the pentest kill-chain (skeleton), fuzzing/PBT (input derivation
+ oracle + shrinking), and chaos engineering (baseline-anchored, scoped,
reproducible experiments). The unifying move is **invert the spec**.

## The fresh-context independence mechanism (the entire value proposition)

The attack round runs in a **fresh, isolated subagent** (spawn one — do not run
the attack inline in the orchestrator's context). The orchestrator hands it a
**curated context bundle containing ONLY**:
1. the **requirement / intended behavior** (the only spec artifact admitted), and
2. the **observable behavior of the running target** (how to invoke it + read its
   output + measure a baseline — the target-adapter contract below).

The orchestrator MUST NOT pass into the attacker's window: the **implementation
source**, the **existing TDD/unit suite**, or the **author's spec framing /
commentary**. Seeing the impl re-derives "this looks right"; seeing the tests
teaches it to mirror them; seeing the framing imports the dominant common-mode
error (Knight–Leveson: the specification is the dominant common-mode channel).

**What concretely enforces it (Q1):** subagent delegation is the mechanism — a
new subagent starts with an empty context window; the only project content it
sees is what the orchestrator's spawn prompt + the curated bundle put there. The
withholding is therefore a property of *what the orchestrator chooses to include*,
audited after the fact by the per-record `independence_attestation.withheld`
field (the validator REJECTS a confirmed record whose `withheld` omits
`implementation_source` or `tdd_suite`). If the same model wrote the target,
verification additionally routes to a SEPARATE fresh-context checker instance
(generator ≠ judge); a self-review pass is structurally compromised → mark it.

## Target-adapter contract (Q2)

Attacker is **target-type-agnostic via a small documented contract**, not a
universal executor. An adapter answers three questions for a target type:
- **invoke**: how do I drive the target with an input? (call a fn / spawn a CLI /
  HTTP request / drive the live app via a CLI like `vince-mp`)
- **observe**: how do I read the observable output? (return value / stdout+exit /
  response body+status / `pageData`)
- **baseline**: how do I measure the steady-state healthy value?

Ship worked examples for **function / CLI / HTTP / live-app**; runnable code
adapters are a v0.2 follow-up. No observable baseline ⇒ emit
`needs_judgment.needs_instrumentation`, never a guessed failure.

## READ — recon + steady-state baseline
1. Map the attack surface from **observable behavior, not source**: inputs,
   states, transitions, trust boundaries, dependency seams. Assume-breach
   altitude — attack post-entry feature behavior, not the auth wall.
2. Derive intended behavior **independently** from the requirement; record it as
   the attacker's own `expected` with its source.
3. Measure a **steady-state baseline** (the normal observable output). No
   baseline ⇒ `needs_instrumentation` → `needs_judgment`, never a guess.

## DESIGN — derive attacks, don't poke randomly
**Round>1: reuse the inherited attack ledger FIRST** (the carry-forward — see
`rules/loop-and-metrics.md` §c). Load this skill's OWN prior ledger from `<project>/.loop/`
(surface map + attack tree + attempted-breaks + confirmed/fixed records by `regression_key`)
and **skip/deprioritize already-tried low-yield attacks**, spending fresh budget on **new
surface + unconfirmed leads** — do NOT re-derive the whole plan from scratch (token waste).
Record the inherited round as `carried_from_round` (null only at round 1). What is NEVER
inherited: impl source / TDD suite / author framing (independence preserved).

Then run three derivation engines together over `assets/payload-library.json`:
- **Invert each stated behavior/invariant** into its violations.
- **STRIDE-per-component breadth checklist** so no abuse category is skipped.
- **Business-logic abuse catalog** (the OWASP-WSTG part scanners can't automate).

Structure as a small **attack tree** per behavior; tag each leaf with
cost/likelihood/prereq; attack cheapest-highest-impact first; **stop on the dual budget**
(below).

## EXECUTE — scoped experiments against the REAL product
- Frame each attack as a **falsifiable experiment**: "under perturbation P scoped
  to S, metric M deviates beyond T from baseline B."
- **Blast-radius control is a HARD rule**: smallest unit (one request/flag/input/
  session), declare the scope in the record, **stage escalation**, carry
  abort/stop conditions so the target is never left degraded.
- **No mocks at the attacked seam** — a fully-mocked passing path is zero
  evidence (`real_collaborator_at_seam:true` is required on confirmed records).
- **Stop on the DUAL hard budget — whichever cap hits first:** `--budget N`
  (attempts, rolled up as `ASR@n`) OR `--max-tokens T` (per-round token consumption,
  NOT wall-clock). **Exhaust-budget mode:** do NOT stop on the first break — report
  ALL proven breaks within budget for a batch fix round. A round that hit a cap with
  no break is `inconclusive`, not `clean`.

## PROVE — name the oracle (load references/oracle-menu.md)
Pick from the ranked oracle menu; state which fired; confirm `observed != expected`
against baseline/control; **shrink to a 1-minimal reproducer**; **re-run the
shrunk case** to confirm it still fails (`repro.replayed_ok:true`). For flaky
targets, replay k/n and record `replays_passed`/`replays_total`.

## RECORD — emit machine-checkable records
One record per **proven** defect → `records[]`; unprovable/ambiguous →
`needs_judgment[]`. Store the **shrunk** input (never the raw discovery), pin
randomness (`seed`/`temperature`/`env`), compute `regression_key` over
**semantics** (so paraphrased variants of one bug collapse), dedup, roll up
`ASR@n` + unique-finding count + severity histogram. **Also emit the round verdict
on the summary** (the loop branches on it): `round_verdict` (broke|clean|inconclusive)
+ `stop_reason` (plan_complete|budget_exhausted) + `tokens_used`/`max_tokens` +
`carried_from_round`. `broke` ⟺ ≥1 confirmed record; `clean` requires
`plan_complete`; `inconclusive` requires `budget_exhausted`. Validate with
`node scripts/validate_attack_records.mjs <records>` then hand to the fresh-reader
checklist.

## REGRESSION (start of each new round)
Re-run every prior record's repro by `regression_key`: now-passing →
`status:"fixed"`; still-failing → stays `confirmed` and **blocks**. This is the
differential/regression oracle applied across rounds.
