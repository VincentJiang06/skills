# Ingest the guidance handoff-spec

This stage builds **from a plan**. The plan is a `handoff-spec.json` produced by
`skill-guidance` (its contract: `skill-guidance/assets/handoff-spec.schema.json`).

## Locate the input

You need two things:
- the **target skill dir** (where the skill will live / already lives), and
- its **`<target>/.skill-guidance/handoff-spec.json`**.

If the user gave a spec path, use it. If they gave only a target dir, look for
`<target>/.skill-guidance/handoff-spec.json`.

**If there is no spec: stop and run `skill-guidance` first.** Do not invent
a plan here — guidance owns intent detection, scoring, and the design. Building
without a plan is how skills drift. (The one exception: the user explicitly says
"skip guidance, here's the design" and hands you an equivalent spec — then treat
their input as the spec.)

Validate it parses and has the fields you'll use:
```bash
node -e "const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));['recommended_design','prioritized_actions','altitude','scorecard','handoff'].forEach(k=>{if(!(k in s))throw new Error('spec missing '+k)});console.log('spec ok:',s.target.name,s.altitude,s.overall_readiness.verdict)" <spec-path>
```

## Read what matters

- **`recommended_design`** — the 8 units to implement (Step 4). This is the build target.
- **`prioritized_actions`** — the ordered backlog. P0 first; P0 = blocks "industrial".
- **`scorecard`** — `absent`/`partial` pillars tell you what's missing vs. present; don't rebuild what already scores `present`.
- **`altitude`** (`lite`/`full`) — sizes your rigor. Honor it: a lite skill gets fewer eval cases and no mutation pass; do not gold-plate.
- **`handoff.blocking_unknowns`** — resolve these before building past the
  point they affect; record what you can't resolve in the build report's
  `handoff.blocking` (scratchpad: `<target>/.skill-engineer/blockers.md`), and
  build everything *not* gated by it.

  **Gating vs touching** — classify each unknown before it stalls you:

  | The unknown… | Classification | What you do |
  |---|---|---|
  | makes a correct implementation impossible until resolved (a true prerequisite — e.g. "which external API?") | **gates** the unit | Mark the action `blocked`, explain in `handoff.blocking`, never guess past it. |
  | is a choice between valid implementations (e.g. "error or first-wins on duplicates?") | only **touches** the unit | Pick one, note the decision in `handoff.blocking` or a `rules/*.md` note, keep building — the action stays `done`. |

  When the two valid options would differ in observable test behavior, add an
  eval case covering the path you chose, so the decision is pinned instead of
  silent.

## Turn actions into a backlog

Order `prioritized_actions` P0 → P1 → P2. Each becomes one red-green-refactor
cycle (Step 2). Map each action back to the pillar/unit it serves so the build
report can show coverage. Carry the action `id`s through to `actions_resolved`.
