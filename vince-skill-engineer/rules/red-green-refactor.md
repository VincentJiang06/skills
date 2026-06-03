# Red-green-refactor for skills

The build loop, from develop-principle's `pillar.tdd` /
`procedure.red_green_refactor_for_skill`. Pull the canonical method and templates
rather than improvising:

```bash
node <kb>/tools/query_kb.mjs "TDD red green refactor eval case 契约 蜕变 变异" --broad
cat <kb>/templates/tdd_plan.template.md
cat <kb>/testing/tdd_workflow.json        # the red/green/refactor/harden steps
cat <kb>/testing/test_strategy_matrix.json # what to check at each test level
```

## The loop, per backlog item

For each `prioritized_action` (P0 → P1 → P2):

1. **Red** — write the acceptance as a *failing* check first (an eval case, a
   contract assertion, or a structural check). Confirm it fails against the
   current skill. A check that passes before you build proves nothing.
2. **Green** — make the smallest change that passes it (Step 4 builds the design
   unit the action serves). Don't implement beyond the action.
3. **Refactor** — once green, tidy (extract a rules file, clarify wording) and
   re-run to confirm still green. If altitude is `lite` and SKILL.md is thin
   (under ~100 lines, no repeated guidance to extract), refactor is a legitimate
   no-op: re-confirm green and move on — don't manufacture structure.

Keep the backlog ordered: a P0 action gates "industrial"; finish P0s before P1s.

## Techniques (apply by altitude)

| Technique | Use when | Altitude |
|---|---|---|
| **Contract test** | The skill has a defined I/O, tool-arg, file-path, or error contract. | lite + full |
| **Trajectory assertion** | Behavior is about *how* it works (right tool, right files loaded, right order), not just final text. | lite + full |
| **Metamorphic** | No single correct output, but input→output *relations* hold (e.g. reorder inputs → same verdict). | full |
| **Mutation** | You want to know the tests actually bite: deliberately break a trigger/step and confirm a case catches it. | full |

`lite`: contract + a couple of trajectory cases; skip metamorphic/mutation;
regression optional. `full`: add metamorphic where the oracle is fuzzy, a
mutation spot-check on the trigger and one protocol step, and keep a regression
set (failures + adjacent false-triggers) that you rerun after every change.

## Stop conditions

- All required eval cases green (per the spec's altitude and the
  required-pillar set) → go to Step 6.
- A backlog item is blocked by an unresolved unknown → mark the action
  `blocked`, record why, and continue with the rest. Never fake green.
