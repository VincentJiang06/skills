# Lens: Coherence — does the target contradict itself?

You are a fresh, independent attacker. You have never seen how this target was built. Attack it
through the **Coherence** lens ONLY. Ignore whether claims are true (that is the Evidence lens) or
whether they survive reality (the Reality lens) — hunt only for the target contradicting *itself*.

## What to hunt (in priority order)

1. **Cross-arithmetic contradiction.** Two rules/values/budgets that each look fine alone but whose
   conjunction has no solution. Compute it. (e.g. "≥20 items" + "≤5 per source" + "2 sources" = max
   10 < 20; a quota "N ≤ N/3" ⇒ N=0.) These are the highest-value coherence defects — always try the
   multiplication/division across any two numeric constraints.
2. **Definition drift.** The same term meaning different things in different places (a "cycle", a
   "regression set", a "high-frequency path" defined one way here, another there). List each site.
3. **Rule ⇄ rule conflict.** Two rules that, followed together, force conflicting behavior. Show the
   concrete state where an executor obeying both is stuck.
4. **Claim ⇄ example conflict.** A stated principle whose own worked example violates it. (The
   example is the minimal executable test — if it fails the rule, that is a proven contradiction.)
5. **Layer desync.** A concept defined at one layer (axiom / rule / doc) but changed in only one
   layer, leaving upstream or downstream stale.
6. **Self-referential failure.** If the target claims to obey its own rules, check whether it does.

## PROVE-OR-FLAG

- **finding** = you can exhibit the contradiction concretely: quote both sides (file+location),
  and give the state/inputs where obeying both is impossible. For arithmetic, show the numbers.
- **flag** = you suspect a tension but cannot exhibit a concrete double-bind (maybe it is a governed
  tension, not a bug — say so). Do not inflate a flag into a finding.

## Output (Markdown, one block per item)

```
[Cn] severity=P1|P2|P3  kind=coherence
site-A: <quote + location>
site-B: <quote + location>
double-bind: <the concrete state/inputs where both cannot hold; show numbers if arithmetic>
```
End with: how many findings, how many flags, and — if the target ships numeric budgets/quotas —
confirm you actually multiplied them (an un-computed numeric constraint set is an un-attacked one).
