# portability-checklist — the maximally-compatible skill profile

Read this when the user wants the skill to run beyond Claude Code (Codex,
Gemini CLI, opencode, goose, cursor, amp, …), when auditing a skill for
publication, or when a restructure touches frontmatter. Agent Skills has been
an open standard since 2025-12; roughly 30 runtimes read SKILL.md — but they
read only the **portable core**, so anything outside it must be deliberate.

## The portable core (the spec's six fields)

| Field | Rule |
|---|---|
| `name` | Display label. The **directory name is the command name** — keep them equal. ≤64 chars, lowercase letters/digits/hyphens, no leading/trailing/consecutive hyphens, must NOT contain "anthropic"/"claude" or XML tags. |
| `description` | Required. ≤1,024 chars portable hard limit (Claude Code's listing truncates `description`+`when_to_use` at 1,536). Keep our ≤320 target — safe under both, and the whole skill listing shares ~1% of the context window, so bloat gets *siblings* silently shortened or dropped. |
| `license` | SPDX string (e.g. `MIT`). |
| `compatibility` | ≤500 chars. Declare runtime prerequisites here ("Requires node >= 18 and python3") instead of assuming they exist. |
| `metadata` | Arbitrary string map — versions, marketplace fields. |
| `allowed-tools` | Experimental, space-separated — and **Claude Code CLI only** (the Agent SDK ignores it): never the sole enforcement of a safety boundary. |

## Claude-Code-only fields (progressive enhancement, never load-bearing)

`when_to_use`, `context: fork`, `agent`, `model`, `effort`, `hooks`, `paths`,
`arguments`, `argument-hint`, `disable-model-invocation`, `user-invocable`,
`disallowed-tools`, `shell`. Other runtimes silently ignore these. Two rules:

1. **Don't reject them** when auditing someone else's skill — they are valid
   Claude Code extensions, not errors.
2. **Flag them** in a portability pass: if the skill's correctness depends on
   one (e.g. a hook doing the real gating), the skill is not portable — move
   the load-bearing behavior into the body/scripts, keep the field as an
   optimization.

## Body & structure

- SKILL.md body <500 lines / <5k tokens, progressive disclosure into
  `references/`-style on-demand files that are **one level deep** from
  SKILL.md (a reference that points at another reference won't get read).
- Files >100 lines get a table of contents.
- Forward-slash paths only, **relative to the skill root** — no absolute
  paths, no `~`.

## Scripts

- **Non-interactive**: no TTY prompts (they hang headless runtimes) — accept
  flags/env/stdin.
- Self-declared deps: stdlib-only, or PEP 723 inline metadata / `npx pkg@ver`.
- Structured stdout, diagnostics to stderr, exit codes as the contract.
- Bounded output: harnesses truncate tool output around 10–30k chars —
  paginate or summarize past that.

## Verify

`skills-ref validate <dir>` (the reference validator) checks spec conformance
mechanically. Install to the neutral `~/.agents/skills/` for the widest
cross-runtime pickup; Claude Code, Codex, Gemini CLI and opencode all scan it.
