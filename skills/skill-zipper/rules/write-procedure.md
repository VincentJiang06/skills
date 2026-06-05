# write-procedure — Step 4 details: how to write the files

Read this when you reach Step 4 of the workflow (write the files), or
when the user requests a dry-run preview.

## Two modes

| Mode | When | Output location |
|------|------|-----------------|
| **Apply** (default) | User said "go" without qualifications | The skill directory itself |
| **Dry-run** | User said "preview" / "dry-run" / "show me first" | `<skill_dir>_preview/` (a sibling directory) |

In dry-run mode, do **everything** the same — but write to the preview
directory instead of touching the original. Then run the verification
scripts (Step 5) comparing the preview to the original, and ask the
user whether to apply for real. See "Dry-run procedure" below.

---

## Write order (both modes)

Write in this exact order to preserve losslessness:

1. **Snapshot the before state.** If the skill is under git, the
   current HEAD is your snapshot — note the commit hash and `git status --short`
   for the skill path. Otherwise,
   copy the skill directory to a temp location (e.g.,
   `/tmp/<skillname>-before/`). You need this for `diff_lossless.py`
   in Step 5.

2. **Create new files first.** Write each new `rules/*.md`,
   `assets/*`, `references/*`, or `scripts/*` with the content it will
   hold. Do NOT touch SKILL.md yet.

3. **Update SKILL.md last.** Remove content that has been written
   elsewhere; add references to the new files; apply Harden rewrites;
   apply Retrigger description rewrite.

Never remove content from SKILL.md until it has been written to its
destination file. If interrupted between steps 2 and 3, the skill is
still functional because SKILL.md still has the original content.

---

## File structure

Each new rules file should follow the skeleton in
`assets/rules-template.md` (title with one-line purpose, "Read this
when" trigger, main content, anti-patterns, optional verification). Copy
the template as a starting point rather than reinventing the structure.

If the skill being restructured doesn't have a SKILL.md yet, or its
SKILL.md needs a full rewrite, use `assets/skill-md-skeleton.md` as the
starting point.

References in the updated SKILL.md:

```markdown
## Modules
- `rules/[name].md` — [when to Read it]
```

Match the trigger phrasing to the file's "Read this when" opening so
the model knows from SKILL.md alone whether to load the file.

---

## Dry-run procedure

When the user requests a preview before applying:

1. Create the preview directory.
   ```
   cp -RL <skill_dir> <skill_dir>_preview
   ```
   Use `-RL` (capital L), not just `-R`. Many users keep their skills
   under `~/.claude/skills/<name>` as **symlinks** to the real location
   (e.g., `~/.agents/skills/<name>`, or a checked-out git repo). On
   macOS and most BSDs, `cp -R` preserves a top-level symlink verbatim,
   so the "preview" ends up pointing right back at the original — every
   edit you make in the preview silently writes through to the source.
   `cp -RL` dereferences symlinks and gives you a genuine copy. If you
   forget this, the entire purpose of dry-run mode is defeated.

   Record the source snapshot too: git commit/status if under git, or a compact
   file hash list for non-git directories. The preview is valid only for that
   exact source state.

2. Apply all the planned changes to `<skill_dir>_preview/`, following
   the same write order above.

3. Run the verification scripts comparing the preview to the original:
   ```
   python3 scripts/diff_lossless.py <skill_dir> <skill_dir>_preview
   python3 scripts/measure_tokens.py --diff <skill_dir> <skill_dir>_preview
   ```

4. Print the verification output to the user, then ask:
   ```
   Preview is at <skill_dir>_preview/. Diff above shows the impact.

   Reply:
   - "apply" — write the same changes to the real skill directory
     (and optionally delete the preview)
   - "keep preview, don't apply" — leave the preview for inspection,
     no changes to the real directory
   - "tweak X" — revise the plan; rebuild the preview
   ```

5. Only on explicit "apply" do you write to the real skill directory. Before
   applying, re-check the source snapshot recorded in step 1. If the source
   changed, **abort the apply** and rebuild the preview from the new source.

   Apply by re-running the structured writes against the real directory in the
   same order (new files first, `SKILL.md` last). Do not bulk `rm` and copy the
   preview over the source: that can erase user edits, hidden files, symlink
   targets, or files the preview did not include.

6. After the real apply, run both Step 5 verification scripts again against the
   original before-snapshot and the real skill directory. Preview verification is
   not a substitute for real-apply verification.

---

## Anti-patterns

- **Writing SKILL.md updates before the destination rules files exist.**
  If interrupted, the skill is broken — SKILL.md references files that
  don't exist yet.
- **Applying changes directly in dry-run mode.** The whole point of
  dry-run is to be reversible without git.
- **Skipping the snapshot.** Without a before-state, `diff_lossless.py`
  has nothing to compare against and the lossless guarantee is unverifiable.
- **Applying a stale preview.** If the source changed after preview generation,
  rebuild the preview before touching the real skill.
- **Bulk replacing the skill dir from preview.** This can delete user edits or
  symlink targets; use structured writes and verify the real result.
- **Removing content from SKILL.md "incrementally"** while still writing
  to other files. Either content is in its destination, or it is in
  SKILL.md — never neither.
