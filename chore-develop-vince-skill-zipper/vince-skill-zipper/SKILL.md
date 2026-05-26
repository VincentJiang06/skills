---
name: vince-skill-zipper
description: >
  Analyzes an existing Claude Code skill and designs an optimal rules/ file structure.
  Covers three operations: (1) compressing SKILL.md by moving verbose content into rules modules,
  (2) encapsulating optional features so they only load when needed — reducing per-invocation token
  cost, (3) enriching the skill with new template or resource files for steps that currently require
  the model to reinvent from scratch each time. Also identifies vague instructions and rewrites them
  to be precise. All operations are lossless — original content is always preserved or explicitly
  moved, never deleted without a destination.
  Use this skill whenever someone says "my skill is too long", "help me structure my rules files",
  "split this skill", "reduce token usage", "add a template to my skill", "make this rule more
  precise", or shows you a SKILL.md and asks how to improve its structure or efficiency.
---

# Skill Rules Designer

You help users restructure existing Claude Code skills. The guiding principle is **lossless
restructuring**: every operation either moves content to a new location, or adds new content.
Nothing is ever deleted without being placed somewhere else first.

There are four things you can do to a skill, and you should analyze which apply:

1. **Compress** — move verbose content from SKILL.md into a rules file. SKILL.md gets shorter,
   total content is unchanged, per-invocation token cost is unchanged (rules files in a skill's
   directory are still loaded). Worth doing for readability and maintainability.

2. **Encapsulate** — move content that is only needed in some invocations into a rules file that
   is loaded conditionally. SKILL.md shrinks AND per-invocation token cost drops. This is the
   highest-value operation.

3. **Enrich** — create a new rules file containing templates, checklists, or scripts for something
   the skill currently handles by ad-hoc reasoning each time. Doesn't shorten SKILL.md but makes
   the skill faster, more consistent, and more capable.

4. **Harden** — rewrite vague instructions in any file to make them precise and unambiguous. No
   structural change; improves reliability.

Always show a plan first. Wait for user confirmation before writing anything.

---

## Step 1: Read the skill

Ask for the skill directory path (or accept it if already provided).

Read:
- `SKILL.md` (required — stop if missing)
- All existing `rules/*.md` files
- Any `scripts/` or `assets/` directories (note what exists)

Build a mental model: what does this skill do, what are its phases, what files exist?

Print a one-line inventory:
```
skill-track — SKILL.md (59 lines) + 6 rules files (640 lines total)
```

---

## Step 2: Analyze each dimension

Work through each of the four operations. For each one, identify specific candidates.

### Compress candidates
Look for content in SKILL.md that is:
- Detailed reference material (tables, schemas, long examples)
- A complete self-contained phase that could be a standalone document
- More than ~30 lines that are unlikely to change what the model does if removed from direct view

For each candidate: name it, estimate line count, state what file it would move to.

### Encapsulate candidates
Look for content in SKILL.md (or existing rules files) that is only needed sometimes:
- Features gated by a user choice (e.g., "only if the user asks for PDF export")
- Error handling paths that rarely trigger
- A whole workflow branch that applies to one mode but not another

For each candidate: name it, estimate token savings per typical invocation, state the condition
that gates it.

### Enrich candidates
Look for steps where the skill currently says something like:
- "generate a report" without a template
- "format the output" without a format spec
- "commit with a conventional message" without examples
- Any multi-step procedure that a user would want to be consistent across runs

For each candidate: describe what the new file would contain, why it saves the model from
reasoning from scratch, and what the skill currently does instead.

### Harden candidates
Look for instructions that use vague verbs or implicit branching:
- "handle X appropriately", "process as needed", "if relevant"
- A check or guard rail with no consequence defined for failure
- A decision (if A then B) where the else case is missing

For each candidate: quote the original, explain the ambiguity, propose a precise rewrite.

---

## Step 3: Present the plan

Use this format:

```
## Restructuring Plan — [skill name]

Current: SKILL.md ([N] lines) + [N] rules files
After:   SKILL.md (~[N] lines) + [N] rules files

### Compress
→ Move [section name] (~[N] lines) → rules/[filename].md
  [One sentence on why this is worth doing]

→ (or: Nothing to compress — SKILL.md is already lean)

### Encapsulate
→ Move [section name] (~[N] lines) → rules/[filename].md
  Condition: only loaded when [specific trigger]
  Token savings: ~[N] lines on typical invocations that skip this path

→ (or: No clear encapsulation opportunities)

### Enrich
→ New file: rules/[filename].md
  Contains: [what it holds — template, checklist, script]
  Replaces: [what the skill currently does ad-hoc]

→ (or: No enrichment needed)

### Harden
1. [file:line] "[original quote]"
   Problem: [why it's ambiguous]
   Proposed: "[precise rewrite]"

→ (or: No vague instructions found)

---
Lossless check: all content currently in SKILL.md will exist in the new file set.
No original content is removed without a destination.
```

After the plan, ask:

```
Does this look right? Tell me:
- Any changes to the plan
- Which operations to skip
- Whether to write all files at once or one at a time

Say "go" to proceed.
```

---

## Step 4: Write the files

Once confirmed, write in this order to preserve losslessness:

1. Create new `rules/*.md` files with the content they'll receive
2. Update SKILL.md — remove only the content that was written in step 1
3. If enriching: create new template/resource files

Never remove content from SKILL.md until it has been written to its destination file.

Each new rules file structure:
```markdown
# [filename] — [one-line purpose]

[Content]
```

References in updated SKILL.md:
```markdown
## Modules
- `rules/[name].md` — [when to read it]
```

Print a summary when done:
```
Done.
  ✓ Created rules/[name].md ([N] lines)  [compress/encapsulate/enrich]
  ✓ Updated SKILL.md: [before] → [after] lines

Token impact: [N] lines removed from always-loaded context.
[Module] only loads when [condition] — saves ~[N] tokens on [typical scenario].
```

---

## Losslessness rules

The restructuring is lossless when:
- Every line removed from SKILL.md appears verbatim (or explicitly rewritten) in a rules file
- No rules file is created without a corresponding reference added to SKILL.md
- Hardening rewrites preserve the original intent — they clarify, not change, behavior
- If the user later removes all rules files, SKILL.md still describes the skill's full scope
  (even if the detail lives elsewhere)

If the user asks you to delete a section with no destination, propose a destination first.
If no destination makes sense, suggest keeping it in SKILL.md even if it's long.
