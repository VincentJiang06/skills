# plan-template — Step 3 details: the plan format and confirmation prompt

Read this when you reach Step 3 of the workflow (present the plan).

Use the format below verbatim. Every section must be present even if
empty (with a "no action" note) — this signals to the user that the
dimension was analyzed, not skipped.

---

## The plan format

```
## Restructuring Plan — [skill name]

Current: SKILL.md ([N] lines, [N] tokens always-loaded)
         + [N] rules files ([N] tokens on-demand)
After:   SKILL.md (~[N] lines, ~[N] tokens always-loaded)
         + [N] rules files (~[N] tokens on-demand)

### Compress
→ Move [section name] (~[N] lines, ~[N] tokens) → rules/[filename].md
  Token effect: [neutral / saves N tokens on invocations that skip the Read]
  Rationale: [one sentence]

→ (or: Nothing to compress — SKILL.md is already lean)

### Encapsulate
→ Move [section name] (~[N] lines, ~[N] tokens) → rules/[filename].md
  Pattern: [P1 Mode pack / P2 Feature gate / P3 Variant pack / P4 Rare path / P5 Phase-conditional]
  Condition: only Read when [specific trigger]
  Token savings: ~[N] tokens on typical invocations that skip this path

→ (or: No clear encapsulation opportunities)

### Enrich
→ New file: [rules/ | assets/ | references/ | scripts/][filename]
  Contains: [template, checklist, or script outline]
  Replaces: [what the skill currently does ad-hoc]
  Per-invocation token cost: ~[N] tokens when Read (acceptable because [reason])

→ (or: No enrichment needed)

### Harden
1. [file:line] "[original quote]"
   Pattern: [H1-H10 from rules/hardening-patterns.md]
   Problem: [why it's ambiguous]
   Proposed: "[precise rewrite]"

→ (or: No vague instructions found)

### Retrigger
Current description score (per rules/description-quality.md): [N]/7
→ [Rewrite from scratch / Targeted fixes for items X, Y / No action needed]
  Proposed new description:
  """
  [new description text]
  """

→ (or: Description score 6-7 — no action needed)

---
Lossless check: every line currently in SKILL.md will exist verbatim in
the new file set, OR is an explicit Harden rewrite listed above.
Verification: `scripts/diff_lossless.py <before> <after>` should report 0 LOST lines.
```

---

## The confirmation prompt

After printing the plan, ask the user:

```
Does this look right? Tell me:
- Any changes to the plan
- Which operations to skip
- Whether to write all files at once or one at a time
- Whether to dry-run first (write to <skill_dir>_preview/ for review)

Say "go" to proceed.
```

Do not start Step 4 until the user replies with "go" or an equivalent
explicit approval. If the user gives partial feedback ("change X, skip
Y"), revise the plan and re-confirm.
