# Pipeline gates and the loop

Load this for Steps 2–4. It says how each stage's gate **runs** (an executable
script, not prose you re-derive), **which gap loops back to which stage**, and
the **max-iteration bounds** that keep the loop finite.

The principle: **gate after every stage; never pass a failing artifact
downstream.** When a gate fails, repeat the stage (or loop back) until it
passes or the budget is spent — then stop and report
(`rules/final-acceptance.md`). Each stage attempt — pass *or* fail — is one
entry in the run-log `stages[]`.

## Resolving the gate scripts (installed names carry a prefix)

The G and E gates are scripts shipped by the stage skills themselves — the
same scripts those stages self-gate with, so builder and gatekeeper can't
drift. Resolve the sibling dirs first (repo: `skill-guidance`; installed:
e.g. `vince-skill-guidance`):

```bash
cd <this skill-conductor dir>
SG=$(ls -d ../skill-guidance ../*-skill-guidance 2>/dev/null | head -1)
SE=$(ls -d ../skill-engineer ../*-skill-engineer 2>/dev/null | head -1)
```

---

## Stage G — Guidance gate

**Artifact:** `<target>/.skill-guidance/handoff-spec.json`
(contract: `$SG/assets/handoff-spec.schema.json`).

**Gate — exit 0 required:**

```bash
node "$SG/scripts/validate_spec.mjs" <target-dir>
```

It enforces schema validity plus internal consistency: exactly 7 scorecard
pillars, score↔status agreement, ratio/points arithmetic, verdict vs the ratio
bands **and** the required-pillar cap, checklist entries in
`input → expected output` form, every absent/partial pillar mapped to an
action, no TODO/TBD placeholders. Record its final `G gate ok: …` line as
`gate_evidence`.

A **low verdict does not fail this gate** — guidance is allowed (required) to
report a draft skill honestly; the gate checks that a usable, self-consistent
plan exists. Whether the *finished* skill is good enough is Final Acceptance's
question (Step 5).

**On fail** (unparseable, schema-invalid, inconsistent): `action: "repeat"`
Stage G, up to **MAX_G** attempts; if still failing, `action: "stop"` — without
a valid plan there is nothing to build.

---

## Stage E — Engineer gate

**Artifact:** `<target>/.skill-engineer/build-report.json`
(contract: `$SE/assets/build-report.schema.json`).

**Gate — exit 0 required:**

```bash
node "$SE/scripts/validate_report.mjs" <target-dir>
```

It enforces the five criteria that used to be checked by hand, and **re-runs
the harness itself** — never trust a self-reported pass count:

1. verification actually ran (`verification.ran`, `all_required_passed`);
2. all cases green (`totals.failed == 0`, `total > 0`, totals arithmetic);
3. every spec **P0** action `done` (join by id against the spec);
4. every spec `adversarial_checklist` edge covered by an existing **passing**
   case (`tests.checklist_coverage` join) — the point is to catch the domain
   bug *here in the loop*, where it can still reach `industrial`, not at Final
   Acceptance, which can only demote;
5. for any skill that ships scripts: an executable harness that **re-runs
   green right now** (stale `command_output` fails), plus a genuine red log
   (`.skill-engineer/red/red.log` with `FAIL <case>` lines — a
   module-not-found crash or bare `EXIT:1` proves the file was absent, not
   that assertions came first).

Record its `E gate ok/FAIL: … | ran … | pass … | P0 … | checklist … |
harness … | red …` line as `gate_evidence`.

**On fail — route by cause (read the report to decide):**

| Symptom | Cause | Action |
|---|---|---|
| Gate errors about tests/harness/red/coverage (`verification.ran false`, failing totals, uncovered checklist edge, stale harness…) | **The build isn't green yet.** | `action: "repeat"` Stage E (the engineer owns red-green-refactor), up to **MAX_E** attempts. |
| Build-report `handoff.blocking` names intent/spec problems; a P0 is `blocked` as "unbuildable as specified"; the fix needs a different plan | **The design is wrong** — this can't be built correctly from this spec. | Check `loops_taken < MAX_FULL_LOOPS` first. Budget spent → `action: "stop"`, `final_verdict: "stopped_unmet"`. Otherwise `action: "loopback"` to Stage G (re-plan), then re-run E. **Each E→G loopback increments `loops_taken`.** |

Decision rule: *"not green yet"* → repeat E; *"can't be built from this
spec"* → loop back to G. When unsure, prefer one more E attempt — repeating
the cheaper stage first.

> **Field names.** The build-report's field is `handoff.blocking`; the
> guidance spec's is `handoff.blocking_unknowns`. They live in different
> files — don't read one off the other.

**MAX_E ceiling (terminal rule).** If a *not-green* failure persists after
**MAX_E = 3** in-pass attempts: loop back to Stage G once (counts as a full
loop; check the budget) **if** a G loopback hasn't already been tried this
pass; otherwise stop with `final_verdict: "stopped_unmet"` and the failing
tests in `blocking_gaps`. Never silently repeat E past its cap.

---

## Stage Z — Zipper gate

**Artifact:** the restructured skill in place; the zipper proves losslessness
with its own `diff_lossless.py` and reports LOST/REWRITTEN counts in its Done
summary.

**PASS when** the restructure is lossless — `0 LOST / 0 REWRITTEN`, **or**
every such line explicitly classified as an accepted Harden / Enrich /
Retrigger rewrite per the zipper's checklist. Read the Done summary's counts
(and classifications) as `gate_evidence`; the conductor does not re-run the
diff.

If the Done summary omits the counts, fall back: snapshot before invoking
Stage Z (`cp -RL <target> /tmp/<name>-before`), then run
`python3 <zipper-dir>/scripts/diff_lossless.py /tmp/<name>-before <target>`
and read its exit code + counts (resolve `<zipper-dir>` like the other
siblings: `../skill-zipper` or `../*-skill-zipper`).

**On fail** (true loss or unclassifiable rewrite): `action: "repeat"` Stage Z
with a more conservative plan, up to **MAX_Z**; **or skip compression** — set
`action: "proceed"` with a run-log note. **Never ship a lossy result.** Z is
the one optional stage: a noted skip does not block `final_verdict: "done"`.

---

## Max-iteration bounds (single source — final-acceptance refers here)

| Bound | Value | Meaning |
|---|---|---|
| **MAX_G** | 2 | Stage G repeats within one pass. |
| **MAX_E** | 3 | Stage E repeats within one pass before escalating. |
| **MAX_Z** | 2 | Stage Z repeats before skipping compression. |
| **MAX_FULL_LOOPS** | 3 | **Every** return to an earlier stage — Stage-E→G design-wrong loopbacks **and** Final-Acceptance-driven returns. |

`loops_taken` counts every return to an earlier stage; in-stage repeats show
as repeated `stages[]` entries with increasing `iteration`, not here. Before
any return, check `loops_taken < MAX_FULL_LOOPS`; budget spent → **stop** with
`final_verdict: "stopped_unmet"`.

**Termination by arithmetic, not prose:** at most `MAX_FULL_LOOPS + 1 = 4`
passes; per-stage counters reset each pass; total attempts per stage are
bounded by `4 × max(MAX_G, MAX_E, MAX_Z) = 12`. Finite regardless of which
gates fail.

When a bound is hit and the gate still fails: stop, write
`final_verdict: "stopped_unmet"`, list the unmet gates in `blocking_gaps`.
Never loosen a gate to force a pass — an honest `stopped_unmet` is a correct
outcome, and the whole pipeline trusts these flags.
