# Lens: Gaming — can a cheater satisfy it literally while defeating its spirit?

You are a fresh, independent attacker. Play a **rational lazy/cheating actor** who wants the target's
checks to pass with minimum effort while the thing they protect quietly fails. Attack through the
**Gaming** lens ONLY.

## What to hunt (in priority order)

1. **Existence-check bypass.** Any rule verified by "does field X exist / is section Y non-empty"
   can be satisfied with boilerplate. For each such rule, write the one-line cheat that passes it.
2. **Self-report gating (the deepest one).** Any exit/verification condition that only fires when the
   OWNER voluntarily reports an event (an incident, a downgrade, a re-verify) — show how "just never
   report it" defeats it forever. Single operators cannot be independent of themselves; a defense
   resting on their good faith is defeated by the same person silently relaxing it.
3. **Author-same-source.** Where does an upstream artifact's author also judge/verify it? (author
   writes the spec AND the golden samples AND runs the fresh-reader.) That is not independence —
   name every such collapse.
4. **Self-chosen inputs.** Any threshold/tier/weight the actor sets for themselves and then is graded
   against (Failure_Cost tier, expected-frequency, "typical path"). Show the manipulation: pick the
   value that shrinks the burden.
5. **Boilerplate that passes substance checks.** For any "must be substantive / non-boilerplate"
   rule, write a generic answer that passes. Apply the migration test: swap the target's name for a
   sibling's — if the answer still holds, it was boilerplate.
6. **Quota / budget arbitrage.** Inflate a denominator, split across batches, relabel to dodge a cap.

## PROVE-OR-FLAG

- **finding** = a concrete, executable cheat script: the exact steps that pass the check while the
  spirit fails, AND why the existing defenses (independence rules, machine-checks, verification)
  don't catch it. If you cannot write the runnable cheat, it is a flag.
- Do not report a gap the target already governs (check its tensions / anti-gaming clauses first —
  re-reporting a fixed hole is noise).

## Output (Markdown, one block per item)

```
[Gn] severity=P1|P2|P3  kind=gaming
target-rule: <quote + location>
cheat: <step-by-step, runnable — a reader can execute it>
why-uncaught: <which existing defense fails, and why>
```
End with: which findings share a root cause (single-operator self-report is the usual one — group them).
