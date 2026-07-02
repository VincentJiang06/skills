# Changelog — skill-conductor

## 2.0.0 — 2026-07-02

Pipeline-v2 refactor (design: `.loop/pipeline-v2.design.md`).

- **Gates are shipped scripts now, not prose.** Stage G = guidance's
  `validate_spec.mjs`; Stage E = engineer's `validate_report.mjs` (which
  re-runs the harness itself). The two 2,000-char `node -e` one-liners in
  `pipeline-loop.md` are gone — the conductor runs the same script each stage
  self-gates with, so builder and gatekeeper cannot drift.
- **Prefix-tolerant sibling resolution** documented and exercised
  (`../skill-guidance` or `../*-skill-guidance`; attacker likewise) — fixes
  the repo-vs-installed path duality (`../vince-attacker` was hardcoded).
- **Final acceptance re-audits via guidance's audit disposition**: artifact is
  `post-build-audit.json` (validated with `validate_spec --audit`), so the
  build spec is never clobbered — the copy-aside workaround is deleted.
- **Judge hardening** in adjudication: reason-before-verdict, compare with
  formatting normalized (LLM judges prefer markdown-styled answers 73–97% at
  identical content).
- `round6_pipeline_checks.mjs` v2: tests the shipped gates (selftests + CLI
  trap fixtures + dogfood) instead of regex-extracting commands from
  markdown; fixed the stale `../develop-principle` assertion (KB is embedded
  in skill-guidance since 2026-06-30) and added an anti-rot guard for it;
  budgets re-tuned to the healthy band (all four SKILL.mds ≤1500/1520).
- Loop bounds single-sourced in `pipeline-loop.md`; compaction-survival and
  effort execution notes added to SKILL.md.

## 1.x — pre-2026-07

See git history (built via the pipeline debug loop, 2026-06-23: attacker
gated after re-audit, min-verdict fold, executable-harness E gate).
