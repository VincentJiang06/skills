# Final acceptance — the detection mechanism

Load this for Step 5, after Stages G → E → Z have each passed their own gate.
The per-stage gates (`rules/pipeline-loop.md`) prove each stage finished its
own job. **Final acceptance proves the finished skill actually meets the
original goal** — and routes any remaining gap back to the stage that owns it.

The detector is **guidance itself**: guidance is the auditor as well as the
planner. We re-run it on the **built** skill and read the fresh verdict.

---

## The re-audit

**Re-run skill-guidance on the BUILT skill** (the real files on disk now,
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

**PASS** (`final_verdict: "done"`) only when **all four** hold:

1. **Verdict clears the bar:** `overall_readiness.verdict` is **not `draft`**
   (i.e. `candidate` or `industrial`, per the target bar set in Step 1).
2. **Required-at-altitude pillars satisfied** — judged against the **single
   source of truth**, the *Required-pillars-by-altitude* table in
   `skill-guidance/rules/altitude.md`. The post-build audit was produced by
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
4. **An INDEPENDENT behavioral battery passes** (the anti-inflation gate — the
   one that matters). Pillar-presence scoring (`score_skill.mjs` + the engineer's
   self-authored, self-passing eval suite) **caps at `candidate`** — re-running
   the builder's own cases certifies nothing about the inputs they didn't think
   of, which is exactly where bugs hide. To reach **`industrial`** the conductor
   must build and run its **own** battery against the built artifact and have it
   pass — see "The independent battery" below. Guidance is the planner; it does
   not get to bless its own build.

When all four hold: write `final_verdict: "done"`, set `blocking_gaps: []`,
finish. Print a short summary (verdict, loops taken).

---

## The independent battery (criterion 4)

The pipeline's worst failure is a **closed loop**: the engineer writes its own
eval cases and the conductor re-runs *that same battery*, so "11/11 green"
proves only that the builder's chosen inputs pass — never the inputs they didn't
think of, which is where every shipped bug lives. Break the loop here.

**Run the battery in a FRESH subagent, not in your own context.** This is the
crux: a battery you generate in the same context that just built and blessed the
skill inherits the builder's blind spots and reproduces the closed loop — it
reports "16/16 pass" while real bugs sail through. Dispatch a subagent (Task)
that **never saw the build**, handing it only: the built skill's path, the spec's
`recommended_design.adversarial_checklist`, and the skill's own doc-claims to
verify. Tell it to *attack the input domain and report any wrong answer*. Do NOT
reuse the engineer's `evals/`. The subagent derives cases two ways and runs them
against the built artifact:

1. **Domain-derived edges** from the skill's *actual input domain* (not generic
   labels). Reason about what the input really is and attack it:
   - a delimiter/key transform → a key that **contains the delimiter**, leading/
     trailing/double delimiters, collisions between a literal key and a built path;
   - a slug/text transform → **unicode / CJK / accents**, emoji, all-punctuation;
   - a parser → each **token / alias / mode** the grammar allows, plus malformed;
   - any transform → an **idempotency / round-trip** case (run twice, or
     forward-then-back → original).
2. **Doc-claim coverage** — extract **every rule / capability / token-type the
   skill's own `SKILL.md` and `rules/` assert**, and run one case demonstrating
   each on a real input. A capability the docs claim but the implementation does
   not honor (e.g. "flag `USER root`" but the linter only checks for any `USER`)
   is a **P0 gap** → loop to Stage E. This converts "no tautological tests" into
   an enforced *positive-coverage* requirement.

Run these against the skill **the way a user invokes it** — its documented CLI /
entry point, not just an internal function import (this catches entry-point
wiring bugs, e.g. a broken `import.meta.url === file://${argv[1]}` guard). Capture
results as `gate_evidence`.

**Adjudicate the output, don't just trust exit codes.** Re-read the battery's
captured stdout: a case that "passes" while printing a visibly wrong answer (a
`@hourly` described as "daily", a `(#)` empty anchor, a `'on the  of every
month'`) is a **gate failure**, not a pass. A green exit with a wrong string is
exactly the inflation this gate exists to stop.

**`industrial` is unreachable unless this battery passes clean.** If any case
fails or reveals a silent wrong answer, the verdict is **`candidate`**, the
failure is a `blocking_gap`, and you loop to the owning stage (almost always
**Stage E** to
add the missing real case + fix). A skill that ships no executable script gets
its claims checked by reading + behavioral reasoning, and still caps at
`candidate` without an independent executable check.

---

## Verdict = min(re-audit, battery) — guidance can't bless its own build

Record **two** verdicts in the run-log's `quality` object and never conflate them:
- `re_audit_verdict` — guidance's pillar-presence re-audit (structural; closed-loop).
- `battery_verdict` — the **fresh-subagent** battery's finding: `industrial` only
  if it found **zero** bugs (including zero green-but-wrong outputs); `candidate`
  if it found any.

Then `effective_verdict = min(re_audit_verdict, battery_verdict)` and **the
written verdict may never exceed `battery_verdict`.** So a build the re-audit
calls `industrial` but the battery demotes is `candidate`, full stop — that is the
mechanism that ends inflation. `final_verdict: "done"` requires
`effective_verdict` to clear the Step-1 bar; a self-claimed `industrial` with no
clean fresh-battery behind it is invalid.

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

- `schema_version: "1.0.0"`, `generated_by: "skill-conductor"`.
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
- `quality` — record `re_audit_verdict`, `battery_verdict`, and
  `effective_verdict`; `effective_verdict = min(re-audit, battery)` and may
  never exceed `battery_verdict`.
- `blocking_gaps[]` — `[]` on `done`; the honest unmet gaps on `stopped_unmet`.

Validate before finishing:
```bash
node -e "JSON.parse(require('fs').readFileSync('<target>/.skill-conductor/conductor-log.json','utf8'));console.log('run-log parses')"
```
Write it to `<target>/.skill-conductor/conductor-log.json` (create the dir; it
sits beside the target). Print a 3-line summary: final verdict, loops taken, and
either "done" or the top blocking gaps.
