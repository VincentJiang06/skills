# Pipeline gates and the loop

Load this for Steps 2–4. It says **exactly how to read each stage's artifact**
to decide pass/fail, **which gap loops back to which stage**, and the
**max-iteration bounds** that keep the loop finite.

The principle: **gate after every stage; never pass a failing artifact
downstream.** When a gate fails, repeat the stage (or loop back) until it passes
or the budget is spent — then stop and report (`rules/final-acceptance.md`).

Read the artifacts directly with `node -e` / `cat`; the conductor runs no
scripts of its own. Each stage attempt — pass *or* fail — is one entry in the
run-log `stages[]` array.

---

## Stage G — Guidance gate

**Artifact:** `<target>/.skill-guidance/handoff-spec.json`
(contract: `vince-skill-guidance/assets/handoff-spec.schema.json`).

**PASS when both hold:**
1. The spec is **schema-valid** — it parses and carries the fields downstream
   needs (`recommended_design`, `prioritized_actions`, `altitude`, `scorecard`,
   `handoff`).
2. A **verdict is recorded**: `overall_readiness.verdict` is one of
   `draft | candidate | industrial`.

```bash
node -e "const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));['recommended_design','prioritized_actions','altitude','scorecard','handoff'].forEach(k=>{if(!(k in s))throw new Error('spec missing '+k)});if(!s.overall_readiness||!s.overall_readiness.verdict)throw new Error('no verdict');console.log('G gate ok:',s.target.name||s.target.path,s.altitude,s.overall_readiness.verdict)" <target>/.skill-guidance/handoff-spec.json
```

A low verdict (e.g. `draft`) does **not** fail this gate — guidance is *allowed*
to report a draft skill; that is its job. The G gate only checks that a usable,
schema-valid plan **exists**. (Whether the *finished* skill is good enough is
decided by Final Acceptance, Step 5.)

**On fail** (spec missing / unparseable / no verdict): `action: "repeat"` Stage
G, up to **MAX_G** attempts. If still failing, `action: "stop"` and report —
without a spec there is nothing to build.

---

## Stage E — Engineer gate

**Artifact:** `<target>/.skill-engineer/build-report.json`
(contract: `vince-skill-engineer/assets/build-report.schema.json`).

**PASS when all three hold:**
1. **Verification actually ran:** `verification.ran == true`.
2. **All required eval cases pass:** `verification.all_required_passed == true`
   **and** `tests.totals.failed == 0` (`tests.totals.total > 0` — a build with
   zero cases has not been verified).
3. **Every P0 is done:** every action whose spec `priority == "P0"` appears in
   `actions_resolved` with `status == "done"`. A `blocked`/`deferred` P0 fails
   the gate.

The build-report's `actions_resolved` carries **no** `priority` field, so the
gate must take the P0 id list from the **spec** and join by id. Pass the
handoff-spec as the **second** argument so the P0 ids are real (not invented from
the report):

```bash
node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),s=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const p0=s.prioritized_actions.filter(a=>a.priority==='P0').map(a=>a.id);const done=new Set(r.actions_resolved.filter(a=>a.status==='done').map(a=>a.id));const p0ok=p0.every(id=>done.has(id));const t=r.tests.totals;const ok=r.verification.ran===true&&r.verification.all_required_passed===true&&t.failed===0&&t.total>0&&p0ok;console.log('E gate',ok?'ok':'FAIL','| ran',r.verification.ran,'| pass',t.passed+'/'+t.total,'| P0',p0.filter(id=>done.has(id)).length+'/'+p0.length+' done')" <target>/.skill-engineer/build-report.json <target>/.skill-guidance/handoff-spec.json
```
The gate `ok` boolean now **enforces** criterion #3: it is false unless every
spec-`P0` id appears with `status: "done"` in `actions_resolved`. A
`blocked`/`deferred` P0 makes `p0ok` false and fails the gate; the evidence line
reports the real P0 done-count (e.g. `P0 2/3 done`).

**On fail — route by the cause (read the report to decide):**

| Symptom in the build-report | Cause | Action |
|---|---|---|
| `verification.ran == false`, or `tests.totals.failed > 0`, or `total == 0` | **Tests are bad / not green / not written.** | `action: "repeat"` Stage E (re-run the engineer; it owns the red-green-refactor loop). Up to **MAX_E** attempts. |
| **build-report `handoff.blocking`** non-empty pointing at intent/spec problems; a P0 marked `blocked` as "unbuildable as specified"; or the re-plan would need to clear the guidance spec's `handoff.blocking_unknowns` | **The design was wrong** — the plan can't be built as written. | **First check `loops_taken < MAX_FULL_LOOPS`.** If the budget is exhausted, `action: "stop"` → `final_verdict: "stopped_unmet"` (do **not** loop). Otherwise `action: "loopback"` to Stage G: re-plan (guidance), then re-run E. **Each E→G loopback increments `loops_taken`** (it is a full loop). |

Decision rule: if the failure is *"the implementation/tests aren't green yet,"*
**repeat E**. If it is *"this can't be built correctly from this spec,"* **loop
back to G**. When unsure, prefer one more E attempt before loopback — repeating
the cheaper stage first is the user's intent ("keep testing").

> **Field names — don't confuse them.** At the E gate the only artifact on disk
> is the **build-report**, whose field is **`handoff.blocking`** (an array of
> strings). The guidance-spec field is named **`handoff.blocking_unknowns`** and
> is a *different* file — read it only after a re-plan (Stage G re-run). Do not
> read a bare "`handoff.blocking`" off the guidance spec, and do not look for
> `blocking_unknowns` on the build-report; neither exists.

**MAX_E ceiling (terminal rule).** If a *not-green* E failure (tests still
failing — the top "repeat E" row, not a design-wrong cause) persists after
**MAX_E = 3** in-pass attempts, escalate: **loop back to Stage G once** (this
counts as a full loop and increments `loops_taken`, so first check
`loops_taken < MAX_FULL_LOOPS`) **if a G loopback has not already been tried this
pass**; otherwise **stop** with `final_verdict: "stopped_unmet"` and the failing
tests listed in `blocking_gaps`. Do not silently keep repeating E past its cap.

---

## Stage Z — Zipper gate

**Artifact:** the restructured skill in place. The zipper proves losslessness
with `scripts/diff_lossless.py` (its `rules/verification-checklist.md`).

**PASS when:** the restructure is **lossless** — 0 LOST lines, **OR** every
`LOST` line is **explicitly classified** as an accepted Harden / Enrich /
Retrigger rewrite per the zipper's checklist. No content is silently lost.

**Where the lossless verdict comes from (the conductor runs no scripts of its
own):** the zipper creates its own before-snapshot (git HEAD, or
`/tmp/<skillname>-before/` per its `rules/write-procedure.md`), runs
`scripts/diff_lossless.py` itself, and reports the diff result in its **Done
summary**. Read that summary's **LOST count** (and any classification of LOST
lines) as `gate_evidence`; the conductor does **not** re-run `diff_lossless.py`.

If the zipper's Done summary does not state a LOST count, fall back: snapshot the
skill dir **before** invoking Stage Z to `/tmp/<name>-before/` (`cp -r <target>
/tmp/<name>-before`), then after Z run
`python3 ../chore-develop-vince-skill-zipper/vince-skill-zipper/scripts/diff_lossless.py /tmp/<name>-before <target>`
and read its exit code + LOST count.

Record `gate_evidence` as the diff result (LOST count, plus the classification of
any LOST lines) — e.g. `0 LOST` or `3 LOST, all classified Harden/Retrigger`.

**On fail** (true content loss, or LOST lines that can't be classified):
- `action: "repeat"` Stage Z (re-run with a tighter, more conservative plan),
  up to **MAX_Z** attempts; **or**
- **skip compression**: leave the built+tested skill uncompressed, set this
  stage's `action: "proceed"`, and add a run-log note that Z was skipped and
  why.

**Never ship a lossy result.** Z is the one optional stage — a clearly-noted
skip is acceptable, a lossy compression is not. A skipped Z does **not** block
`final_verdict: "done"`.

---

## Max-iteration bounds

| Bound | Value | Meaning |
|---|---|---|
| **MAX_G** | 2 | Stage G repeats within one pass before stopping. |
| **MAX_E** | 3 | Stage E repeats within one pass before escalating (loopback to G or stop). |
| **MAX_Z** | 2 | Stage Z repeats before skipping compression. |
| **MAX_FULL_LOOPS** | 3 | **Every** return to an earlier stage — both Stage-E→G design-wrong loopbacks **and** Final-Acceptance-driven returns (Step 5). |

`loops_taken` in the run-log counts **every return to an earlier stage** — both
the Stage-E→G design-wrong loopbacks (above) **and** Final-Acceptance-driven
returns. It does **not** count in-stage repeats, which are visible as multiple
`stages[]` entries with the same `stage` and increasing `iteration`. Before any
such return, check `loops_taken < MAX_FULL_LOOPS`; if the budget is exhausted, do
not loop — **stop** with `final_verdict: "stopped_unmet"`. This makes every path
that returns to an earlier stage finite.

**Worst-case ceiling (confirm termination by arithmetic, not prose):** there are
at most `MAX_FULL_LOOPS + 1 = 4` passes. Each pass runs each stage at most its
per-pass max (`MAX_G`, `MAX_E`, `MAX_Z`), and **per-stage iteration counters
reset at the start of each pass**. Total stage attempts are therefore bounded by
`(MAX_FULL_LOOPS + 1) * max(MAX_G, MAX_E, MAX_Z) = 4 * 3 = 12` per stage —
finite regardless of which gates fail.

When any bound is hit and the gate still fails: **stop**, write
`final_verdict: "stopped_unmet"`, and list the unmet gate(s) in `blocking_gaps`.
Do not loosen a gate to force a pass — an honest `stopped_unmet` is the correct
outcome.
