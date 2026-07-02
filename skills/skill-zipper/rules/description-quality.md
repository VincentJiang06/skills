# description-quality — designing a frontmatter `description` that actually triggers

Read this when applying the **Retrigger** operation, or any time the user's
skill is "not getting invoked when it should" or "getting invoked when it
shouldn't."

## Why this is high-leverage

The frontmatter `description:` is the **only** signal Claude sees when
deciding whether to load this skill on a given turn. It appears in the
available-skills list as a one-line summary; the body of SKILL.md does
not exist from Claude's point of view until invocation.

This means:

- A vague description = the skill never triggers, regardless of how good its body is
- An over-broad description = the skill triggers on irrelevant turns, polluting context
- A description without explicit trigger phrases = the model has to *infer* a match, which is unreliable

Retrigger is a near-zero-cost operation with high impact. Always check the
description before any other restructuring.

## Describe WHEN to use — never the multi-step workflow (the "Description Trap")

The single highest-leverage rule, and the easiest to violate: the description
states **when** to use the skill, not a summary of **how** it works (its internal
steps/sequence). A one-line scope sentence ("Restructure a skill for token
efficiency") is fine — enumerating the procedure is not. The community calls
process-prose-in-the-description the **Description Trap**, and both Anthropic's
docs and superpowers converged on the same rule independently.

**Why:** if the description summarizes the workflow, Claude follows that summary
as a shortcut and **skips the body**. Documented evidence (superpowers
`writing-skills`): a description saying "code review between tasks" caused Claude
to run **one** review even though the skill body specified **two** (spec-compliance
then code-quality); rewriting it to a pure trigger ("Use when executing
implementation plans with independent tasks") made Claude read the body and run both.

- ❌ `Use when executing plans — dispatches a subagent per task with review between tasks` (summarizes the workflow)
- ❌ `Use for TDD — write the test first, watch it fail, write minimal code, refactor` (summarizes the steps)
- ✅ `Use when executing implementation plans with independent tasks in the current session` (trigger only)
- ✅ `Use when implementing any feature or bugfix, before writing implementation code` (trigger only)

This bans summarizing the *process*; the "no promises about the contents" rule
below bans summarizing what's *in* the skill. Both failure modes cost the same —
the body gets skipped.

## The `name` is not the trigger (and has its own rules)

Since mid-2026 the frontmatter `name` is a **display label only** — the
directory name is the invocable command, so keep them equal. Name rules the
spec/platform now enforce: ≤64 chars, lowercase letters/digits/hyphens, no
consecutive hyphens, must NOT contain "anthropic"/"claude" or XML tags; a
gerund phrase (`processing-pdfs`) reads best. Don't spend Retrigger effort on
the name — the description does the triggering; just lint these rules.

## Anatomy of a good description

A good description has four parts, in this order:

1. **Scope sentence (1 sentence)** — what the skill does, in plain action verbs.
   Lead with the verb. No marketing copy.

2. **Trigger phrases (2-6 examples)** — exact phrases or shapes of user
   requests that should invoke this skill. Quote them.

3. **Anti-triggers (optional but valuable)** — phrases that look similar
   but should NOT invoke this skill. Cite the closest skill that should
   handle those instead, if one exists.

4. **Domain markers (optional)** — file extensions, library names, tool
   names that, when present in the conversation, tip toward invocation.

Total length: aim for **~300 characters (≈ 60–80 tokens)** — enough for the verb
+ 2–3 triggers + one anti-trigger, no more. Two hard limits exist in mid-2026:
the **portable Agent Skills spec caps `description` at 1,024 chars**, and
Claude Code truncates the combined `description`+`when_to_use` at **1,536** in
its skill listing. Stay ≤320 and both are irrelevant. Below ~240 chars (60 tok)
is usually too vague; above ~600 chars (150 tok) dilutes the signal — and the
whole skill listing shares roughly **1% of the context window across ALL
installed skills**, so one bloated description gets *other* skills' descriptions
silently shortened or dropped under pressure. Tightness is a per-install
courtesy, not just per-skill hygiene. `measure_tokens.py` reports the char/token
count and flags over-target/over-limit — **read that number, don't eyeball it**.

### Compressing an over-long description (the Retrigger + Compress fix)

An over-long description is almost always crammed with **feature detail, edge
cases, mode tables, version notes, or eval numbers** — content that belongs in the
SKILL.md body, not the trigger line. Cut it to four parts only: (1) one clause on
WHAT it does · (2) WHEN to use it + the `$name` trigger · (3) the single most
important do-NOT / route-away · (4) optional domain markers. Everything else moves
into the body. This is **lossless**: the cut detail isn't deleted, it's relocated
to where Claude actually reads it (on invocation).

## Template

```yaml
description: >
  [Verb-first scope sentence describing what this skill does.]
  Use when [primary trigger condition]. Triggers on phrases like
  "[phrase 1]", "[phrase 2]", "[phrase 3]".
  Do NOT use for [anti-trigger scope]; use [other-skill] instead.
  [Optional domain markers: file extensions, library names.]
```

## Diagnosis rubric — score an existing description

For each item, mark ✓ / ✗:

- [ ] **Starts with a verb** describing the action (Create / Audit / Review / Convert / Debug)
- [ ] **Contains at least 3 explicit trigger phrases** in quotes or clearly identifiable
- [ ] **States the boundary**: what's in scope vs out
- [ ] **Length 60-150 tokens** (run `measure_tokens.py` on a snippet to check)
- [ ] **No marketing fluff** ("powerful", "advanced", "intelligent", "comprehensive" — these are anti-signal)
- [ ] **No promises about the body** ("contains best practices for...") — describe behavior, not contents
- [ ] **Differentiates from nearby skills** if any exist in the user's setup
- [ ] **Describes WHEN to use, not the workflow** — no summary of the skill's internal steps/sequence (a one-line scope sentence is fine); see the rule at the top

Score 0-4: rewrite from scratch.
Score 5-6: targeted improvements per missing item.
Score 7-8: ship as-is.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|--------------|--------------|-----|
| "Helps with X" | "Helps with" is filler; doesn't tell Claude when to invoke | Lead with the verb the user uses |
| Pure noun list ("React, Next.js, TypeScript") | No action; ambiguous trigger | Add what the skill *does* with those nouns |
| Generic "best practices for X" | Triggers on every X-adjacent turn | Specify the action: "Review X for Y issues" |
| Single long run-on paragraph | Hard to scan; triggers blur together | Break into scope + triggers + anti-triggers |
| All triggers in body, none in description | Body isn't visible at trigger time | Move 2-3 representative triggers up to description |
| Triggers buried at the end after long prose | Model gives less weight to tail tokens | Triggers in the first 50 tokens after the scope sentence |
| Summarizes the workflow ("…with review between tasks") | Claude follows the summary and skips the body — one documented case ran 1 review instead of the body's 2 | State only WHEN to use; move the process into the body |

## Example: before → after

### Before (vague, marketing-flavored, no triggers)

```yaml
description: >
  A powerful skill that helps you create amazing presentations. Supports
  PowerPoint format with advanced features like animations, transitions,
  and beautiful themes.
```

Score: 0-1. Lead verb is buried, no trigger phrases, marketing words.

### After (verb-first, trigger-explicit, scoped)

```yaml
description: >
  Create, read, edit, and convert PowerPoint (.pptx) files. Use when the
  user mentions a deck, slides, or .pptx by name, or asks to make/edit/
  extract from a presentation. Do NOT use for Google Slides (no .pptx
  involved) or for static image-only mockups.
```

Score: 6-7. Verb-first, explicit triggers, named anti-trigger.

## Edge cases

- **The skill has a narrow scope.** Even narrower descriptions work fine —
  just keep the verb-first structure. "Generate Conventional Commits commit
  messages from staged changes" is a complete description.

- **The skill spans modes (design / audit / research).** Describe the
  scope at the broadest level. The internal mode selection lives in
  SKILL.md, not the description.

- **The skill chains with other skills.** Anti-triggers become especially
  important. Spell out which neighbor handles what.

## Verification

After rewriting a description:

1. Re-run the diagnosis rubric. It should score 7-8.
2. Run `measure_tokens.py` on the SKILL.md frontmatter only — confirm 60-150 tokens.
3. For an empirical check (not just eyeballing), run the engineer's trigger eval
   on a labeled set (sibling may be installed with a prefix — resolve
   `../skill-engineer` or `../*-skill-engineer`):
   `node <engineer>/scripts/trigger_eval.mjs <skill-dir> cases.json --judge cli --runs 3 --threshold 0.9`
   Use the spec's `Do NOT use` neighbours as the `should_trigger: false`
   cases, mark ~40% of cases `"holdout": true`, and when comparing an old vs
   new description, **select by the holdout score** — a rewrite that only wins
   on the cases you tuned against is overfit, not better. Details:
   `<engineer>/rules/trigger-eval.md`.
