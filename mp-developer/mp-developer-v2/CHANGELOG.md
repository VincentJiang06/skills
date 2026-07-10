# Changelog

## 0.2.0 — 2026-07-10 — per-tool guardrails

- **Per-tool guardrail layer for all 41 tools** — `references/tool-guardrails.json`, one entry per tool:
  `side_effect` (read/write/confirm) · `preconditions` · `common_mistakes` · `verify` · `failure`. Grounded
  (5 parallel agents, each in `tools.yaml` + the owning scene doc + live `wechatide -t <id> --help`; spot-checked
  against live help — e.g. correctly caught `miniprogram_upload`'s `--upload-version` flag vs the schema's `version`).
- **Surfaced executably:** `node scripts/lint_request.mjs "<request>" --tool <name>` now prints the tool's guardrail
  alongside the routing/tool-validity/discipline check (`guardrailFor()` + `tool_check.guardrail`).
- **Coverage-gated:** C23 asserts every one of the 41 tools has a complete guardrail; C24 asserts lint_request
  surfaces it; `validate-skill.mjs` re-checks 41/41 coverage. Harness 24→**26**; validate-skill 33→**34**.
- SKILL.md + rules/supplements.md wire "get the guardrail before calling any tool; honor side_effect".

## 0.1.0 — 2026-07-10 (v2, from scratch)

A from-scratch v2: **wechatide-first**, CLI-free, built via the skill pipeline
(guidance → engineer → zipper → attacker).

- **Single backend: `wechatide`** (Door A — DevTools-2.0 embedded MCP). Vendored + optimized the
  official `miniprogram-dev-skill` v0.2.5 (7 scenes + authoritative 41-tool `tools.yaml`).
- **Optimized guidance, not verbatim vendor:** a thin wechatide-first root router with a routing table,
  a mandatory `check_devtools_status` preflight, and always-in-force discipline/renderer/approval pointers.
- **Zero CLI:** the `vince-mp`/`miniprogram-automator` wrapper is gone (Door A covers automation +
  real-device `automation_viewport_action --action remote`); `two-transports.md` collapsed to a
  one-section rationale, no runnable escape-hatch script. **Zero required npm** (scripts = node stdlib).
- **Added supplements (separate modules):** `scripts/lint_request.mjs` (routing/tool-name/discipline
  self-check over the authoritative registry), `scripts/doctor.mjs` (cross-stack build/env preflight,
  6/6 self-test), `references/renderer-awareness.md`, `rules/supplements.md` (camera-less scan + canvas),
  consolidated `references/debug-discipline.md`.
- **Removed** 草料-specific `env`/`logs` (stay in `mp-cli-sup`).
- **Version reconciliation:** `skill.yaml` pinned to 0.2.5, `check_skill_version.mjs` (verified in-sync
  with installed IDE `2.02.2607092`).
- **Verification:** `evals/run_all.mjs` — 21 cases (one per adversarial-checklist edge + idempotency +
  happy-path), TDD red→green (RED 20 FAIL → GREEN 21/21); `validate-skill.mjs`, `doctor --self-test` 6/6.
