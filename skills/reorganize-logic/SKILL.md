---
name: reorganize-logic
version: 0.1.0
description: >-
  Rebuild a project's DESIGN-CONTRACT layer when docs have rotted past sync:
  re-derive architecture + structure + interface contracts from code, gate-verified.
  Use-when: "rebuild the contracts from scratch", "从代码重新推导契约",
  "$reorganize-logic". Do-NOT use for doc sync / cleanup (this REBUILDS and deletes
  legacy) → neat.
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
ambiguous for you to reconcile — it never rubber-stamps.*

## When this fires (vs neat — the key boundary)

- **reorganize-logic** = deliberate, heavyweight, ground-up REBUILD. Old contracts
  are untrusted; **deleting legacy is a feature.** Use when docs have drifted so far
  that syncing is not worth it.
- **neat** = incremental sync at session end; keeps what's right, fixes drift,
  non-destructive. Route there for "tidy up / sync the docs / 同步一下".

If the docs are mostly right → neat. If you'd rather throw them out and
re-derive from code → this skill.

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
5. **Gate** — `node scripts/verify_contracts.mjs <root> [--scope <dir>]` must PASS.
   Fix every FAIL; reconcile every FLAG (open the cited code, fix the contract,
   re-run). A flag blocks the gate on purpose.
6. **Emit `docs/contracts/deletion-manifest.md`** — stale legacy to delete/overwrite,
   one reason each. **Never delete anything**; the human approves and applies.

## Verify (eat the dogfood)

Run the gate on the produced `interfaces.md` **before** reporting:

```
node scripts/verify_contracts.mjs <project-root> [--scope <subdir>]
```

It must print `PASS` and exit 0. Any `FAIL [tag]` / `FLAG [tag]` line means the
contract is not yet tied to the code — fix and re-run. Then do the **fresh-reader
pass** (`references/protocol.md`): the gate checks doc-vs-code *structure*, not
prose *faithfulness* — re-read each artifact cold and confirm the diagrams,
responsibilities, and signatures are actually true of the code.

## Controls

- **Code is the only source of truth.** Old contracts inform context, never content.
  No copy-paste from legacy into the new artifacts.
- **Review-gated deletion.** Write the new contracts first; emit the manifest; never
  delete/overwrite legacy without explicit human approval. Nothing is auto-deleted;
  git is the safety net.
- **Strict, self-verifying gate.** Return contracts only after
  `verify_contracts.mjs` PASSes; it FLAGS ambiguous matches and BLOCKS until you
  reconcile them (no green-but-wrong).
- **Scopable.** Whole project by default; `--scope <dir>` for cheap re-runs;
  coverage is scoped accordingly.

## Modules

| File | When to load |
|------|--------------|
| `references/protocol.md` | The 6-step rebuild runbook (scope → compact → re-derive → author 3 artifacts → gate → deletion-manifest) + the fresh-reader pass. |
| `references/contract-format.md` | The strict gate-parseable `interfaces.md` format, the intentionally-internal exclusions rules, and the `architecture.md`/`structure.md` Mermaid conventions. |
| `references/gate-design.md` | What `verify_contracts.mjs` proves (the FAIL/FLAG tag table), the coverage threshold, the anti-gaming rules, the KB grounding, and what the gate can't do (so the agent does it). |
| `scripts/verify_contracts.mjs` | The deterministic gate: pure `validate({contractText, files, scope, exclusions})` + CLI. Never throws; exact-name matching; flags block. |
| `evals/run_all.mjs` | Re-runnable adversarial battery (11 cases) over the gate; imports the real `validate`. `node evals/run_all.mjs`. |
| `assets/golden/` | A passing fixture (`pass/`) and a failing one (`fail/`: orphan + coverage hole) to copy from and to smoke-test the CLI. |

## Lifecycle

- **version** in frontmatter (`0.1.0`).
- **Breaking change** = any change to the gate's input format or the `interfaces.md`
  gate-parseable schema (downstream contracts must be re-authored).
- **Rollback** = `git restore docs/contracts/`; the deletion-manifest is never
  auto-applied, so a bad run leaves the legacy intact.
- **Superseded by** neat for the lighter keep-and-sync path.
