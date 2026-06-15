# Loop Retro / Postmortem / 循环复盘

Use after a loop misbehaves (head-banged, reward-hacked, drifted, over-delegated) to turn the failure into a harness/rule improvement — the production feedback loop for the loop itself. Derived from `pillar.risks` and `principle.infra_prerequisite`.

```
LOOP RETRO
What happened:     [the misbehavior, with evidence]
Failure mode:      [error_amplification | reward_hacking | context_drift |
                    cognitive_surrender | permission_blast_radius |
                    premature_over_delegation | token_blowup | other]
Why the loop missed it:
                   [which signal/gate/boundary was absent or weak]
Harness fix:       [the check/hook/permission/budget/memory change that would
                    have caught or prevented it]
Captured as:       [new test/regression case | new hook | tightened DoD |
                    skill/rule update | budget cap | escalation trigger]
Autonomy change:   [does this move the task more in-the-loop / on-the-loop?]
```

## Notes
- The goal is not blame but to **make the harness see what it missed** — most loop failures are missing feedback signals, not dumb models.
- Map the failure mode to its node (`anti_pattern.*`) so the fix is traceable.
- A retro that doesn't change a check, hook, boundary, or rule didn't finish.
