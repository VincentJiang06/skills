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

Total length: aim for 60-150 tokens. Below 60 is usually too vague; above
150 dilutes the signal and starts wasting per-conversation context (the
description sits in the available-skills system reminder on every turn,
not just when invoked).

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

Score 0-3: rewrite from scratch.
Score 4-5: targeted improvements per missing item.
Score 6-7: ship as-is.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|--------------|--------------|-----|
| "Helps with X" | "Helps with" is filler; doesn't tell Claude when to invoke | Lead with the verb the user uses |
| Pure noun list ("React, Next.js, TypeScript") | No action; ambiguous trigger | Add what the skill *does* with those nouns |
| Generic "best practices for X" | Triggers on every X-adjacent turn | Specify the action: "Review X for Y issues" |
| Single long run-on paragraph | Hard to scan; triggers blur together | Break into scope + triggers + anti-triggers |
| All triggers in body, none in description | Body isn't visible at trigger time | Move 2-3 representative triggers up to description |
| Triggers buried at the end after long prose | Model gives less weight to tail tokens | Triggers in the first 50 tokens after the scope sentence |

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

1. Re-run the diagnosis rubric. It should score 6-7.
2. Run `measure_tokens.py` on the SKILL.md frontmatter only — confirm 60-150 tokens.
3. If possible, ask the user for 2-3 sample user messages and dry-run
   whether the description would (in their judgment) cause the skill to
   trigger on each.
