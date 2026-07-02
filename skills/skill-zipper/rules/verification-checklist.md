# verification-checklist — Step 5 details: post-write verification

Read this when you reach Step 5 of the workflow (verify the restructure),
or when the user asks "did the restructure work?"

Two layers of verification: script (mechanical) and human (semantic).
Both layers must pass before the restructure is considered done.

---

## Layer 1: Script verification

Run both scripts in this order. Each one has a single pass criterion.

### Check 1.1 — Lossless

```
python3 scripts/diff_lossless.py <before_snapshot> <skill_dir>
```

| Outcome | Interpretation | Action |
|---------|----------------|--------|
| Exit 0, 0 LOST, 0 REWRITTEN | Every original line survived verbatim | Pass |
| Exit 1, N LOST and/or M REWRITTEN | Lines disappeared or changed wording | Investigate each LOST and REWRITTEN line |

For each LOST or REWRITTEN line, classify:
- **Accepted Harden rewrite** — the line was vague and the proposed rewrite is in the plan. The diff matcher missed the match because the wording changed significantly. *Mark accepted in the summary.*
- **Accepted Enrich extraction** — the line was a wrapper/header for inline content that moved to a real artifact (template, script). Functionally the content is preserved in the new file. *Mark accepted with a pointer to the new file.*
- **Accepted Retrigger rewrite** — the line was in the frontmatter description and the rewrite is the intended new description. *Mark accepted.*
- **Accepted known-content deletion** — the line re-taught something the model already knows (Compress delete-class) AND the plan listed that chunk for deletion. *Mark accepted with a pointer to the plan entry.* A deletion the plan never named does not qualify — that's a true loss.
- **True loss** — content disappeared with no destination and no plan entry. **This is a bug.** Restore the content or write it to its intended destination.

Do NOT mark a LOST or REWRITTEN line as "accepted" without naming which category
it falls into. The lossless guarantee is the skill's contract with the user;
silently waving losses or rewrites is the failure mode.

### Check 1.2 — Token impact

```
python3 scripts/measure_tokens.py --diff <before_snapshot> <skill_dir>
```

| Outcome | Interpretation | Action |
|---------|----------------|--------|
| Always-loaded tokens decreased | Restructure achieved its primary goal | Pass |
| Always-loaded tokens unchanged | Pure Compress or pure Enrich — fine, but flag in the summary | Pass with note |
| Always-loaded tokens increased | Either Retrigger added explanation, OR the restructure went the wrong way | Investigate — was it intentional? |

On-demand tokens may grow significantly (new rules files, templates,
patterns). That's fine and expected.

---

## Layer 2: Human verification

After Layer 1 passes, do these reads/checks before declaring done:

- [ ] **Re-read the updated SKILL.md as a fresh reader.** Does it still
      describe the skill's full scope? Or has the body become a hollow
      shell of "load this, load that" without explaining what the skill
      does?
- [ ] **For each new rules file, re-read its "Read this when" opening.**
      Does the trigger match what SKILL.md says about when to load it?
      Mismatch = the file will never be loaded, or always be loaded.
- [ ] **For each gated rules file, check the discriminator.** Can the
      model determine the trigger value from context already in hand,
      without reading the gated file? If no, the gate is phantom (per
      `rules/encapsulation-patterns.md` A4).
- [ ] **Each new file is referenced from SKILL.md.** An unreferenced
      rules file is dead weight — Claude will never Read it.
- [ ] **Each reference in SKILL.md points to a file that exists.** A
      broken reference makes SKILL.md lie.

---

## Done summary format

When both layers pass, print this:

```
Done.
  ✓ Created rules/[name].md ([N] lines, [N] tokens)  [compress/encapsulate/enrich]
  ✓ Updated SKILL.md: [before] → [after] lines, [before] → [after] tokens
  ✓ Lossless check: 0 LOST / 0 REWRITTEN lines
    (or: N accepted LOST/REWRITTEN lines — list category for each)
  ✓ Token impact: always-loaded shrunk by [N] tokens ([N]%) per invocation

Per-invocation token math:
  Before: [N] tokens always-loaded + [estimated avg on-demand]
  After:  [N] tokens always-loaded + [estimated avg on-demand]

[Module] only loads when [condition] — saves ~[N] tokens on [typical scenario].
```

If any check failed and was not resolved, do NOT print the done summary.
Print the failure and ask the user how to proceed.
