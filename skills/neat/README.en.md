# neat

> End-of-session / milestone knowledge-base cleanup with OCD-level rigor — so nothing rots.

**English** · [简体中文](README.md)

**What it does** — End-of-session / milestone knowledge-base cleanup with OCD-level rigor: reconciles project docs (CLAUDE.md/AGENTS.md, README, docs/) and cross-session agent memory against the code so nothing rots. Cross-platform (Claude Code / Codex / OpenCode / OpenClaw).

**Why it's good** —
- A deterministic anti-bloat / anti-rot linter (`kb_audit.mjs`) gates "sync complete" on machine-checkable **hard evidence** — MEMORY.md byte/line ceilings, relative-time leakage, memory-vs-docs size inversion, broken index links.
- A memory→docs "graduation" valve pumps stable knowledge up into the docs, guarding against index bloat.
- A thin-orchestrator SKILL.md: low always-loaded cost, the rest on-demand.

**When to use** — "sync up" · "tidy up docs / update memory / 收尾 / 这个阶段做完了" · "so a newcomer can pick it up"; or call `/sync`, `/neat`.
**Not for** — bare "整理 / tidy" with no dev or session context (tidy a desk, archive photos); "clean up this code / function" (→ code tooling); isolated memory curation with no docs/code reconcile (→ memory-management / consolidate-memory).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/neat ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)

**Credit** — Adapted from [@KKKKhazix](https://github.com/KKKKhazix)'s [neat-freak（洁癖）](https://github.com/KKKKhazix/khazix-skills#-neat-freak%E6%B4%81%E7%99%96) (MIT).
