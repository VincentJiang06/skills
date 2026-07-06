# The rebuild protocol

The 6-step runbook for rebuilding a project's design-contract layer from the code.
SKILL.md summarizes this; the detail lives here.

## Preflight

- Confirm it is a **REBUILD**, not a sync. If the docs are mostly right and just
  drifted a little → use a lighter incremental sync workflow. This skill is for
  *推倒重建*: the old contracts are untrusted and legacy will be deleted.
- **Resolve scope.** Whole project (default) or a named module/subsystem/dir. The
  scope bounds every later step — extraction, coverage, and the deletion manifest.

## 1 — Scan + compact the old contracts (context only)

Find the existing design-contract docs in scope: architecture/structure docs,
interface/API specs, schema docs, design notes that describe module boundaries.
Condense them into a single **read-only** `docs/contracts/_legacy-context.md`,
headed verbatim:

```
> CONTEXT ONLY — DO NOT COPY. Re-derive every contract from the CODE.
> This file is a compacted memory of the OLD contracts, kept only so the
> rebuild does not lose intent. It is gitignored and thrown away after.
```

Add `docs/contracts/_legacy-context.md` to `.gitignore`. Read it once for intent;
never copy a sentence of it into the new artifacts.

## 2 — Re-derive the system from the code

The code is the single source of truth. Read the structure and the public surface
(entry points, exported functions/classes, endpoints, schemas, module boundaries).
Build a fresh mental model of what the system *actually* does now. If the code and
the legacy contract disagree, the code wins — silently; do not annotate the new
contract with "the old doc said X".

**Delegate this to Claude subagents (the Claude-native step).** For anything past a
single small module, don't derive serially in the main thread:

1. Spawn an **Explore** subagent (read-only) to map the entry points and module
   boundaries in scope — it returns *where* the public surface lives, not a review.
2. Then spawn **one derivation subagent per module, in parallel** (a single message
   with multiple Task calls). Each gets ONLY its module's code — **never the legacy
   docs** — and returns that module's public surface
   (`Symbol | Signature | Source(file:line)`) + one-line responsibilities.
   Withholding the legacy docs keeps the **derivation layer** independent: a
   subagent that never read them cannot copy them. Scope this claim honestly —
   it protects the extracted surface (which the gate re-verifies against code
   anyway), NOT the final prose: the composing main thread HAS read
   `_legacy-context.md`, so legacy phrasing can still echo in the architecture
   narrative; the guards there are authoring from the code and the delegated
   fresh-reader pass below. And unlike the attacker sibling — whose independence
   is validator-ENFORCED per record — this withholding is a prompt convention:
   nothing verifies it, so actually follow it.
3. The main thread **composes** the returned surfaces into the three artifacts and
   resolves cross-module boundaries. Run the compose + architecture synthesis at
   **xhigh** — it is the deep-judgment step; raise effort rather than padding prompts.

If a context compaction hits the **main thread** mid-rebuild, it re-reads the on-disk
artifacts (the `_legacy-context.md` and whatever contracts are already written) to
rebuild its own state — never trust the summary. (Main-thread recovery only; the
derivation subagents are short-lived and stay legacy-blind regardless.) And Claude 4.8
is literal: it will not infer an interface you didn't extract, so walk **every** entry
point the Explore pass found — exhaustively, not a sample.

## 3 — Author `architecture.md`

Write `docs/contracts/architecture.md` from scratch:
- a **Mermaid** architecture diagram (components and how they talk),
- components + responsibilities, data flow and control flow, and the boundaries
  (what is in vs out of each component, trust/ownership lines).
See `references/contract-format.md` for the Mermaid conventions.

## 4 — Author `structure.md` + `interfaces.md`

- `docs/contracts/structure.md` — a **Mermaid** structure diagram + a module/file
  map (each module: path, responsibility, what it depends on).
- `docs/contracts/interfaces.md` — the explicit interface definitions in the
  **strict, gate-parseable format** (`references/contract-format.md`): one table
  row per public interface (`Symbol | Signature | Source(file:line)`), plus an
  `## Intentionally internal` section for surface symbols deliberately excluded
  from the contract. Every `Source` must point at the real definition line.

## 5 — Run the gate, reconcile, fix

```
node scripts/verify_contracts.mjs <project-root> [--scope <subdir>]
```

It must print `PASS` and exit 0. Otherwise:
- **FAIL [ORPHAN]** — you documented a symbol that isn't in the code. Remove it or
  fix the name.
- **FAIL [COVERAGE_HOLE]** — the code exports a symbol you didn't document. Add it,
  or list it under `## Intentionally internal` with a reason.
- **FAIL [BAD_SOURCE_REF]** — the `file:line` is wrong. Fix it to the real line.
- **FAIL [CONTRADICTION] / [EXCESSIVE_EXCLUSIONS]** — you tried to exclude an
  exported symbol, or excluded too much. Document it instead; don't game coverage.
- **FLAG [NEEDS_RECONCILE]** — a near-name match the gate won't guess for you. Open
  the cited code, decide the right symbol, fix the contract, re-run. A flag blocks
  the gate exactly so Claude (or a human) looks — never override it.

See `references/gate-design.md` for what each tag proves and what it can't.

## 6 — Emit the deletion manifest (review-gated)

Write `docs/contracts/deletion-manifest.md` listing every stale legacy contract
file to delete or overwrite, with a one-line reason each. **Do not delete
anything.** The human reviews the manifest and the new contracts, then applies the
deletions themselves (git is the safety net). Nothing is auto-deleted.

## Report

Hand back: the written paths, the gate result (PASS + coverage ratio), any flags
you reconciled and how, and the pending deletion-manifest awaiting approval.

## Fresh-reader pass (do this — the gate can't)

The gate checks doc-vs-code **structure**, not whether the prose is *faithful*. Re-
read each artifact cold and confirm: the architecture diagram matches how the code
is actually wired; the structure map's responsibilities are true; each interface's
signature and described behavior match the implementation. A green gate on a
prose-wrong contract is exactly the trap this pass exists to catch.

**Delegate the faithfulness pass too (maker ≠ checker).** Spawn a **fresh** subagent
per artifact (or per module for `interfaces.md`) that never saw the derivation — give
it the written contract plus the cited code and ask it to find one place the prose
diverges from the implementation. A fresh context is a genuinely independent checker;
the deriving thread re-reading its own output is not.
