---
name: reorganize-logic
description: >-
  Rebuild a project's DESIGN-CONTRACT layer when docs have rotted past sync:
  re-derive architecture + structure + interface contracts from code, gate-verified.
  Use-when: "rebuild the contracts from scratch", "从代码重新推导契约",
  "$reorganize-logic". Do-NOT use for doc sync / cleanup (this REBUILDS and deletes
  legacy) → neat.
metadata:
  version: 0.3.4
---

# reorganize-logic

Rebuild the **design-contract layer** of an existing project from the ground up,
with the **code as the single source of truth**. The old contracts are *untrusted
context* — compacted, read, then discarded as a source: the new contracts are
**re-derived from the code, never copy-pasted** from the legacy docs. Output is
three fresh artifacts (architecture diagram · structure diagram · explicit
interface definitions) plus a review-gated deletion manifest for the stale legacy.

**The anchor (read first):** a contract is only trustworthy once a runnable check
ties it back to the code. So every documented interface is cross-checked against
the code's public surface by `scripts/verify_contracts.mjs`, and the new contracts
are written *before* anything legacy is deleted. *A contract the gate can't tie to
real code is a hallucination; the gate rejects it. The gate flags everything
ambiguous for you to reconcile — it never rubber-stamps — and it never rules on
design intent: whether an excluded symbol is really internal is judged by a fresh
reader against the code, not by the gate.*

## When this fires (vs neat — the key boundary)

- **reorganize-logic** = deliberate, heavyweight, ground-up REBUILD. Old contracts
  are untrusted; **deleting legacy is a feature.** Use when docs have drifted so far
  that syncing is not worth it.
- **neat** = incremental sync at session end; keeps what's right, fixes drift,
  non-destructive. Route there for "tidy up / sync the docs / 同步一下".

If the docs are mostly right → neat. If you'd rather throw them out and
re-derive from code → this skill.

## Orchestration (the gate stays portable)

The gate is deterministic node (runs anywhere, CI included). The judged work —
derivation, synthesis, faithfulness, exclusion verdicts — runs like this:

- **Fan out the derivation.** An Explore subagent maps entry points, then one
  derivation subagent per module in parallel returns its surface + responsibilities.
- **Derivers and readers are non-fork.** Spawn every derivation and fresh-reader
  subagent as a fresh subagent that starts from only the prompt you give it — not a
  fork of your context, which inherits the legacy docs and your draft. If the host
  only offers forking, use a separate `claude -p` session. The reply says how
  isolation was achieved (a self-report, not an enforcement).
- **Raise effort, don't pad.** If a contract reads shallow, raise effort for the
  running model rather than padding the prompt; effort names are not equivalent
  across models.
- **Survive compaction from disk.** After a compaction, re-read the on-disk artifacts
  (`_legacy-context.md`, the contracts written so far, `_exclusion-review.md`) AND
  this skill's Controls — a summary may have evicted a standing constraint.
- **Walk every entry point.** The coverage gate and the readers enumerate the
  surface; they never sample it.

## Protocol

Preflight: confirm REBUILD (not sync), resolve **scope** (whole project | a named
module/dir). Then the 6 steps (detail in `references/protocol.md`):

1. **Compact old contracts** → read-only, gitignored `docs/contracts/_legacy-context.md`
   headed "CONTEXT ONLY — DO NOT COPY".
2. **Re-derive from the code** — read structure + public surface; build a fresh
   model. Code wins every disagreement. No copying from legacy.
3. **Author `docs/contracts/architecture.md`** — Mermaid architecture diagram +
   components/responsibilities/data+control flow/boundaries.
4. **Author `docs/contracts/structure.md`** (Mermaid + module map) and
   **`docs/contracts/interfaces.md`** in the strict gate-parseable format
   (`references/contract-format.md`).
5. **Gate** — `node scripts/verify_contracts.mjs <root> [--scope <dir>]`. FAIL and
   FLAG block: fix every FAIL, reconcile every FLAG (open the cited code, fix the
   contract, re-run). REVIEW lines don't block, but every `STRONG_EXPORT_EXCLUDED`
   item goes through the fresh-reader **exclusion card** before you report. A line
   clearable only by an untrue statement or by editing code/the gate, one surviving
   two fix attempts, or a language with no matcher → **escalate** (protocol step 5).
6. **Emit `docs/contracts/deletion-manifest.md`** — stale legacy to delete/overwrite,
   one reason each. **Never delete anything**; the human approves and applies.

## Verify (eat the dogfood)

Run the gate on the produced `interfaces.md` **before** reporting:

```
node scripts/verify_contracts.mjs <project-root> [--scope <subdir>]
```

A `PASS` with exit 0 is **PASS (structural)**: the gate proves doc-vs-code
*structure* — not prose *faithfulness*, and not whether an excluded symbol is
really internal. Any `FAIL [tag]` / `FLAG [tag]` line means the contract is not yet
tied to the code — fix and re-run. The final word needs the **fresh-reader pass**
and the **exclusion card** verdicts (`references/protocol.md`): non-fork readers
check the diagrams, responsibilities and signatures against the code, and
adjudicate every `STRONG_EXPORT_EXCLUDED` item.

## Controls

- **Code is the only source of truth.** Old contracts inform context, never content.
  No copy-paste from legacy into the new artifacts.
- **Review-gated deletion.** Write the new contracts first; emit the manifest; never
  delete/overwrite legacy without explicit human approval. Nothing is auto-deleted;
  git is the safety net.
- **Strict gate, judged exclusions.** Return contracts only after
  `verify_contracts.mjs` PASSes: FAIL and FLAG block. REVIEW items are adjudicated
  by a non-fork fresh reader with the exclusion card. The gate proves structure,
  not publicness. The reply names the gate command it ran (the shipped skill path).
- **Never edit the checks mid-task.** Never edit, patch, copy-modify, or run a
  modified copy of `scripts/verify_contracts.mjs` or `evals/` during a user task.
  An unrecognized export form or unsupported language goes to the owner as a
  proposal (form, example line, file) — and the run escalates.
- **No untrue contract for a green gate.** Never write a contract statement you
  believe untrue, and never edit product code, to clear a gate line — escalate.
- These controls are a rule layer: no sandbox or hook ships; the host's permission
  mode is the only enforcement, git the recovery net.
- **Scopable.** Whole project by default; `--scope <dir>` for cheap re-runs;
  coverage is scoped accordingly.

## Modules

| File | When to load |
|------|--------------|
| `references/protocol.md` | Read at the start of every rebuild, after preflight: the 6-step runbook, the fresh-reader pass and the exclusion judgment card (paste the card section verbatim into each exclusion reader's prompt). |
| `references/contract-format.md` | Read at step 4 before writing `interfaces.md`, and when the gate prints `FLAG [EXCLUSION_NEEDS_REASON]`: the gate-parseable format, the exclusion reason rule, the Mermaid conventions. |
| `references/gate-design.md` | Read when a FAIL/FLAG/REVIEW tag needs interpreting, or when deciding whether a language/form is supported (escalate): the verdict table with its Plane column and the judgment ledger. |
| `scripts/verify_contracts.mjs` | Executed at step 5 — never read into context, never edited during a task. Pure `validate({contractText, files, scope, exclusions})` + CLI. |
| `evals/run_all.mjs` | Dev-time only, local (gitignored), 37 cases over the real `validate` and the CLI walk; never run or edited during a user task. |
| `assets/golden/` | Copy from when authoring `interfaces.md`; smoke-test the CLI (`pass/`, and `fail/`: orphan + coverage hole). |

## Lifecycle

- **version**: see frontmatter `metadata.version`.
- **Breaking change** = any change to the gate's input format or the `interfaces.md`
  gate-parseable schema (downstream contracts must be re-authored).
- **Rollback** = `git restore docs/contracts/`; the deletion-manifest is never
  auto-applied, so a bad run leaves the legacy intact.
- **Superseded by** neat for the lighter keep-and-sync path.
