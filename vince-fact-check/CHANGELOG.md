# Changelog

All notable changes to **vince-fact-check** are documented here. SemVer.

## [0.1.0] — 2026-06-04

Initial build (via the vince-skill pipeline).

### Added
- Speed-first fact-check protocol: preflight → triage (simple/complex) →
  **parallel** search fan-out → snippet-first → early-exit on saturation →
  citation-backed BLUF answer, within per-tier budgets (simple ≤2 min / 1 round /
  ≤1 fetch / ≥1 source; complex ≤5 min / ≤2 rounds / ≤3 fetch / ≥2 independent).
- `scripts/check_answer.mjs` — deterministic answer-contract validator (BLUF,
  tier, confidence, citation resolution, per-tier source bar, volatile→dated,
  honest-uncertain). Re-runnable harness `evals/run_all.mjs` (15 cases).
- Rules: `triage.md`, `search-protocol.md`, `output-contract.md`. References:
  `source-reliability.md` (Admiralty-lite + freshness), `metrics.md`. Asset:
  `answer-template.md`.
- Behavioral eval cases `evals/evals.json` (triage, conflict, deep-research
  routing, multi-part, opinion, parallelism, uncertain).

### Hardening (adversarial, during build)
- The answer-contract validator's **traceability** check was hardened across four
  independent adversarial batteries: a citation now counts only as a **visible `[n]`
  in the Answer / Key-evidence region**, with HTML comments, markdown reference-link
  definitions, HTML tags, code spans/blocks, and URLs stripped first, and
  Caveats/Sources excluded by region. CRLF/lone-CR/BOM are normalized; the per-tier
  source bar counts **distinct URLs**. Each fix is locked by a regression case
  (D16–D26) and mutation-guarded.
- **Known scope:** the validator enforces *structural* traceability; whether a citation
  *semantically* supports the load-bearing claim is the protocol's job
  (`rules/search-protocol.md` §6). Deliberately hiding a `[n]` in a non-rendering
  construct is an asymptote for a regex linter — realistic, good-faith answers validate
  correctly.

### Release gate
- `node evals/run_all.mjs` exits 0 (all deterministic cases pass) **and** the
  behavioral eval set passes.

### Rollback
- Revert to the previous tagged version; the skill is self-contained (no external
  state), so rollback is a file revert.
