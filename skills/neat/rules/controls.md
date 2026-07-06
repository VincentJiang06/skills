# rules/controls.md — destructive-op guardrails

neat-freak deletes memory files and rewrites `CLAUDE.md` / `docs/`. These are the
controls that keep a bad run recoverable. Load before any delete/rewrite (第三步).

## 0. 最小护栏速览（at-a-glance）

这个 skill **会删除记忆文件、重写 CLAUDE.md / docs**——破坏性。最小护栏（完整版见下文各节）：

- **不分类不删除**：linter 无法归类的文件（既不是记忆、也不是 docs/CLAUDE.md/README）一律不动。删除只针对能明确归类为「已废弃记忆 / 已被取代的临时计划」的文件。
- **先预览再删**：删除/批量改写前，先列出"将删除/将改写"清单（dry-run / preview），让用户能看到再执行。
- **要求 git 工作树**：仓库应是 git 工作树，这样坏的破坏性运行可 `git restore` 回滚；否则记一条显式 waiver。
- **HARD 阻断 / SOFT 咨询**：`kb_audit` 退出非 0（HARD 违规）**阻断**"同步完成"；SOFT 违规只警告、记进「未处理」，不阻断。
- **全局配置极度克制**：`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` 只在用户明确表达跨项目意图时才动。

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
