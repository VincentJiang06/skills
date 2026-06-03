# Final acceptance — the detection mechanism

Load this for Step 5, after Stages G → E → Z have each passed their own gate.
The per-stage gates (`rules/pipeline-loop.md`) prove each stage finished its
own job. **Final acceptance proves the finished skill actually meets the
original goal** — and routes any remaining gap back to the stage that owns it.

The detector is **guidance itself**: guidance is the auditor as well as the
planner. We re-run it on the **built** skill and read the fresh verdict.

---

## The re-audit

**Re-run vince-skill-guidance on the BUILT skill** (the real files on disk now,
not the original stub/spec). It writes a fresh
`<target>/.skill-guidance/handoff-spec.json` — the **post-build audit**. Read:
- `overall_readiness.verdict` (`draft | candidate | industrial`)
- the `scorecard[]` per-pillar `status` (`present | partial | absent | na`)
- the fresh `intent.summary`

Record this as a `stages[]` entry with `stage: "final_audit"`.

> The re-audit **overwrites** the Step-2 handoff-spec. If you may need to loop
> back to Stage E (which builds from that spec), copy the audit aside first
> (e.g. `cp <target>/.skill-guidance/handoff-spec.json <target>/.skill-guidance/post-build-audit.json`)
> so a re-plan and the audit don't clobber each other.

---

## Pass criteria

**PASS** (`final_verdict: "done"`) only when **all three** hold:

1. **Verdict clears the bar:** `overall_readiness.verdict` is **not `draft`**
   (i.e. `candidate` or `industrial`, per the target bar set in Step 1).
2. **Required-at-altitude pillars satisfied** — judged against the **single
   source of truth**, the *Required-pillars-by-altitude* table in
   `vince-skill-guidance/rules/altitude.md`. The post-build audit was produced by
   that same guidance run, so its cap rule already applies; do not paraphrase a
   second copy of the rule here. Read the pillar's altitude classification from
   that table and apply:
   - every pillar the altitude marks **required** must be `present` (not
     `absent`/`partial`);
   - every pillar marked **expected** must be at least `partial`;
   - pillars marked **N/A-eligible** may be `na`.

   Note what the table says (don't re-derive it): `design` **and**
   `low_context_kb` are **required at both** altitudes. At **lite**, `testing` is
   only *expected* (partial is acceptable) — so a lite skill must **not** fail
   this criterion on `testing: partial`; at **full**, `testing` is required and
   `tdd`/`metrics` are required too. Do not demand full-altitude pillars from a
   lite skill, and do not wave through a full-altitude skill missing them.
3. **Intent matches the original goal:** the fresh `intent.summary` still
   matches the **goal recorded in Step 1**. A skill that got built well but
   drifted off the original intent **fails** this criterion.

When all three hold: write `final_verdict: "done"`, set `blocking_gaps: []`,
finish. Print a short summary (verdict, loops taken).

---

## Gap → stage routing

If any criterion fails, identify the gap from the scorecard / intent and loop
back to the stage that **owns** it:

| Gap (from the re-audit) | Owner stage | What to do |
|---|---|---|
| `testing` / `tdd` / `metrics` pillar `absent`/`partial`; eval coverage thin | **Stage E** | Re-run the engineer to add the missing cases / metrics, then re-verify. |
| `design` weak; trigger/description wrong; **intent drifted** from the goal | **Stage G** | Re-run guidance to fix the plan (triggers, scope, design), then re-build (E). |
| Skill is **bloated** / verbose; `low_context_kb` weak; too many always-loaded tokens | **Stage Z** | Re-run the zipper to compress losslessly. |

After looping back, re-run the affected downstream stages and their gates
(`rules/pipeline-loop.md`), then return here and re-audit. Each return to an
earlier stage is **one full loop** — increment `loops_taken`.

When several pillars fail at once, fix the **upstream-most** owner first (G
before E before Z): a design fix can change what the build and compression
should contain, so re-planning first avoids wasted downstream loops.

---

## Stop condition (bounded — never fake a pass)

**MAX_FULL_LOOPS = 3.** If after 3 full loops the pass criteria still don't
hold:

- **STOP.** Do not loop again. Do not relax a criterion to manufacture a pass.
- Write `final_verdict: "stopped_unmet"`.
- Fill `blocking_gaps[]` with the concrete, honest gaps — name the pillar(s)
  still `absent`/`partial`, the verdict still stuck at `draft`, or the
  intent-vs-goal mismatch. Point at evidence in the latest audit.

A truthful `stopped_unmet` with clear blocking gaps is a **correct** outcome —
far better than a faked `done`. The whole pipeline trusts these flags.

---

## Writing the run-log

The run-log is the conductor's real deliverable. It conforms to
`assets/conductor-log.schema.json`. Maintain it throughout the run, not just at
the end:

- `schema_version: "1.0.0"`, `generated_by: "vince-skill-conductor"`.
- `target`, `goal` — from Step 1 (the goal is the yardstick this file proves the
  run met or honestly missed).
- `stages[]` — **append one entry per stage attempt** (pass *or* fail), in
  order. Each: `stage` (`guidance` | `engineer` | `zipper` | `final_audit`),
  `iteration` (1-based per stage), `artifact_path`, `gate_passed` (bool),
  `gate_evidence` (the concrete field values you read — e.g. "ran=true,
  pass=4/4, P0 3/3 done" or "0 LOST" from the zipper's Done summary), and
  `action`
  (`proceed` | `repeat` | `loopback` | `done` | `stop`).
- `loops_taken` — count of **full** loops: **every** return to an earlier stage,
  both Stage-E→G design-wrong loopbacks and Final-Acceptance-driven returns,
  capped by **MAX_FULL_LOOPS = 3** (`rules/pipeline-loop.md`); in-stage repeats
  show as repeated `stages[]` entries, not here.
- `final_verdict` — `done` or `stopped_unmet`.
- `blocking_gaps[]` — `[]` on `done`; the honest unmet gaps on `stopped_unmet`.

Validate before finishing:
```bash
node -e "JSON.parse(require('fs').readFileSync('<target>/.skill-conductor/conductor-log.json','utf8'));console.log('run-log parses')"
```
Write it to `<target>/.skill-conductor/conductor-log.json` (create the dir; it
sits beside the target). Print a 3-line summary: final verdict, loops taken, and
either "done" or the top blocking gaps.
