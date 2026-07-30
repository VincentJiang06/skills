# Changelog — loop-constructor-codex

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to (shared verbatim with `loop-constructor`): a new required
field / renamed key is a breaking change.

## 0.2.0 — 2026-07-31

Tracks `loop-constructor` **0.3.0** — the skill-philosophy KB v0.3.0 (R17) **H series**
alignment. Per this skill's standing discipline the shared parts stay in lockstep:
`lint_loop_design.mjs`, `loop-design-shape.md`, `loop-principle-map.md` and the goldens
remain **byte-identical** to the sibling, and the only divergences are still the Codex
runtime hunks (§IV context-loss wording in `loops-model.md`, the D4 concurrent-
`codex exec` fan-out in `loop-selection.md`, the `codex resume` line in the fresh-reader
checklist, the "How to run this loop (Codex CLI)" preamble). Battery **71/71**.
KB anchors: `Philosophy/guidelines/loops.md` H2/H4/H5/H7/H8 ·
`Philosophy/rules/constitution.md` 第九章 A45/A46 + 附录一 A45 参数行.

### Added (mirrored verbatim from `loop-constructor` 0.3.0 — see its CHANGELOG for the full rationale)
- **Two-sided stop gate** (H5 / A45(iv)) at D5: zero-change gate ("N consecutive
  iterations with zero new changes → stop") **plus** a minimum-progress floor below
  which an early stop escalates; caps live inside the condition and may be tripped, not
  raised, by the loop.
- **Pre-registered stall counter** (H4 / T14): `restart`'s "patching has stalled" is
  quantified before iteration 1 and fires mechanically — no in-flight discretion.
- **Write-surface separation** (A45(ii) / H2): with no independent evaluator, the
  check's execution and result-writing sit outside the generator's write surface —
  on Codex this is naturally a read-only `codex exec` for the judge and a verdict file
  the generating process does not write.
- **Paired telemetry / run report** (H7 / A46): new `loops-model.md` §VII·b, and the
  rendered runbook now ends with a **"Run report (emit this when the loop stops)"**
  section — the Codex renderer gained the same static block as the sibling, placed after
  Harness primitives and after the Codex how-to-run preamble.
- **Compensating vs structural harness parts** (H8): different settlement evidence per
  class, and the classification is confirmed by the checker rather than self-declared.

### Changed
- **Contract sizing restated as lower bounds** (A45(i)): endpoint ≥ 8 / module ≥ 12 /
  app ≥ 20 machine-gradable assertions, ceiling 3×; the linter's floor of 3 is the
  lower, absolute anti-vacuity ground and clearing it does not clear the sizing.

### Not changed (deliberately)
- **No schema change, no new linter rule** — the deltas are semantic judgments and land
  in prose + the fresh-reader pass. Designs stay cross-compatible with
  `loop-constructor` 0.3.0 and with anything authored under 0.1.0 / 0.2.x.

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
