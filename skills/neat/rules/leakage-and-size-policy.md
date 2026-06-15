# rules/leakage-and-size-policy.md — boundary judgments

Precise口径 for the edge cases the linter encodes, so a human reviewer and the
machine agree. Load only when a specific boundary is in question.

## Size ceilings are INCLUSIVE

| measure | PASS | FAIL / WARN | severity |
|---------|------|-------------|----------|
| `MEMORY.md` bytes | ≤ 25000 | > 25000 (i.e. 25001+) | HARD |
| `MEMORY.md` lines | ≤ 200 | > 200 (i.e. 201+) | HARD |
| single memory file lines | ≤ 100 | > 100 (i.e. 101+) | SOFT |
| `CLAUDE.md`/`AGENTS.md` | ≤ ~300 lines / ~15000 bytes | over either | SOFT |

Byte and line gates are **independent**: a `MEMORY.md` of 200 lines but 26000 bytes
FAILS on `memory_index_bytes`; 201 lines but 5KB FAILS on `memory_index_lines`.
Report **which** gate tripped. Aim ~150 lines / ~18KB to keep a buffer.

## memory-vs-docs inversion: strictly-greater only

`sum(memory .md bytes)` is compared to `sum(docs .md bytes)`:

- `memory == docs` → **NOT** an inversion (no flag).
- `memory > docs` (strictly) → flag `memory_docs_inversion` (SOFT). Promote stable
  knowledge into `docs/` until docs is the thicker, authoritative layer.
- `docs/` present but empty → docs bytes = 0, so any non-empty memory strictly
  exceeds → inversion flagged (correct).
- No `docs/` at all → skipped (N/A), never a false flag.

## Relative-time leakage: prose-only, standalone-only

EXEMPT (do NOT count):
- Anything inside a fenced ```code block``` (toggled by a line starting with
  ```` ``` ```` or `~~~`).
- A substring inside a longer token: en word-boundary means `recently_archived`,
  `yesterdays/` don't match; CJK suffix-guard means `最近期` doesn't match `最近`.

COUNTS (flag `relative_time_leakage`, SOFT):
- A bare prose `today` / `yesterday` / `recently` (en, word-boundary).
- A bare prose `最近` / `昨天` / … (CJK) not extended by `期限来况间内外度年代`.

The fix is always an absolute date (`2026-04-29`), never a relative reference —
because the next session/agent reads it at an unknown later time.
