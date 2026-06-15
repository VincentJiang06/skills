# rules/controls.md — destructive-op guardrails

neat-freak deletes memory files and rewrites `CLAUDE.md` / `docs/`. These are the
controls that keep a bad run recoverable. Load before any delete/rewrite (第三步).

## 1. Never delete what you can't classify

Only delete a file you can positively classify as **disposable knowledge**:
- a memory file that has been promoted into `docs/`/`CLAUDE.md` (graduated), or
- a completed/temporary plan, an overturned decision, a single-incident postmortem.

If `kb_audit` (or you) cannot classify a file as memory / docs / CLAUDE.md /
README, **leave it alone**. Source code is always out of scope — this skill edits
knowledge artifacts only.

## 2. Dry-run / preview before applying

Before deleting or batch-rewriting, list the intended deletions/edits first (a
preview), so the user can see "what will change" before it happens. Apply only
after the preview is acceptable. The 第五步 summary lists what was actually changed.

## 3. Require a git working tree (or an explicit waiver)

The repo should be a git working tree so a bad destructive run is recoverable.
If it is not, record an explicit waiver in the summary ("not a git repo — deletions
are irreversible, proceeded on user confirmation").

**Recovery one-liner** (a bad run): `git restore .` (or `git checkout -- <file>`)
restores deleted/overwritten knowledge files.

## 4. HARD blocks, SOFT advises

- `kb_audit` exit != 0 (any HARD violation: `memory_index_bytes`,
  `memory_index_lines`, `memory_index_broken_link`) **blocks** the "sync complete"
  report — fix it first.
- SOFT violations (`single_memory_lines`, `claude_md_size`, `claude_md_missing`,
  `relative_time_leakage`, `memory_docs_inversion`) are **advisory**: surface them
  in the「未处理」section, do not block. The audit is advisory for soft gates,
  blocking only on HARD gates.

## 5. Global-config restraint

`~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` are touched **only** on explicit
cross-project user intent. Day-to-day project detail never goes into global config.
