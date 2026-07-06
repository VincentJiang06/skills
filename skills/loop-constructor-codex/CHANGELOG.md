# Changelog — loop-constructor-codex

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to (shared verbatim with `loop-constructor`): a new required
field / renamed key is a breaking change.

## 0.1.0 — 2026-07-06

Initial release. A Codex-CLI variant of `loop-constructor` 0.2.0 — same
SELECT → NEGOTIATE → FILL → VERIFY → PERSIST mechanism, same loop-design JSON
**schema and linter** (`lint_loop_design.mjs`, copied verbatim), so **designs are
cross-compatible** between the two skills. What changes is the runtime prose: the
loop's abstractions are realized on the OpenAI Codex CLI (single-agent, `codex exec`)
instead of Claude Code.

### Added
- **`references/codex-runtime.md`** — the concrete mapping: three roles = three
  separate `codex exec` invocations (the evaluator a fresh `read-only` one given only
  the diff + contract); `harness_primitives` = durable on-disk state (`.loop/`,
  a ledger, `contract.md`, **AGENTS.md**, `codex resume`); D4 `large` fan-out =
  concurrent `codex exec` processes in git worktrees coordinating via the ledger;
  sandbox/approval mapping for `risk_guards` / `human_placement`; the operator loop;
  and what does NOT map (hooks → shell wrappers; memory → AGENTS.md + `.loop/`;
  `/compact` → irrelevant, each `codex exec` is already fresh, survival = disk).
- **SKILL.md** — a "Codex runtime mapping" section, a "Single-agent runtime" control,
  and a `codex-runtime.md` modules row.
- **`render_loop_doc.mjs`** — emits a **"How to run this loop (Codex CLI)"** preamble
  (per-stage `codex exec`, evaluator-as-separate-`codex exec`, re-read-disk on
  `codex resume`), and the large-altitude Orchestration block now names concurrent
  `codex exec` + worktrees. The emitted JSON, the validation gate, and the REFUSED
  behavior are unchanged.
- **evals** — C41 (codex-preamble present + a `codex exec` occurrence in the rendered
  runbook) and C42 (no Claude primitives — no `subagent` / `Task tool` / `CLAUDE.md`
  / `/compact` — in each golden's rendered runbook). Battery is 71/71 (the 69
  inherited linter/renderer cases + these 2).
- **`assets/golden-loop-design-large.json`** — a passing **large-altitude** (fan-out)
  fixture, so the render set covers the large Orchestration preamble (see Fixed).

### Fixed (pre-release)
- **Banned-token self-check coverage gap (NB-1).** The large-altitude Orchestration
  preamble in `render_loop_doc.mjs` used the literal word "subagents" (in a clause
  saying Codex *lacks* them), but C41/C42 only rendered the flat + medium goldens —
  the `large` path was never checked, so C42's own `/subagent/i` ban would have
  flagged the skill's own `large` output. Reworded the preamble to carry no banned
  token ("Codex is single-agent, so fan-out is N concurrent OS processes, not
  in-process spawning") and extended C41 + C42 to also render the new large golden.
  Escaping/validation untouched; still 0.1.0.

### Changed (surgical prose deltas vs the sibling)
- `references/loops-model.md` — "compaction-survival contract" → context-loss /
  `codex resume` survival.
- `references/loop-selection.md` — D4 fan-out now names concurrent `codex exec`
  processes + worktrees + on-disk ledger (no in-process subagents).
- `assets/fresh-reader-checklist.md` — "survives a compaction" → survives context loss
  / `codex resume`.

### Grounding
- The loop-principle KB is **referenced, not embedded** (no duplicate 5.5 MB copy).
  Default `<kb>` = the sibling `../loop-constructor/loop-principle`; `$LOOP_PRINCIPLE`
  overrides. Installed without the sibling ⇒ KB-degraded mode (acceptable; the skill
  says so in its report).

### Compatibility
- The loop-design JSON schema is identical to `loop-constructor` 0.2.0. A design
  produced by either skill lints and renders under the other.
