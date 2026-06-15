# rules/kb-audit-usage.md — running the kb_audit linter

The deterministic anti-bloat / anti-rot gate. Load this at 第零步 (preflight) and
第四步 (verify). The mechanism is `scripts/kb_audit.mjs`; the re-runnable eval
harness is `evals/run_all.mjs` (imports the mechanism, never re-implements it).

## Run it

```bash
node scripts/kb_audit.mjs <project-dir>          # human JSON, exit!=0 on any HARD violation
node scripts/kb_audit.mjs <project-dir> --json   # same JSON to stdout
```

Importable from JS:

```js
import { auditKb } from "./scripts/kb_audit.mjs";
const { violations, hardFail, skipped, summary } = auditKb(projectDir);
```

## Output shape (the contract)

```jsonc
{
  "violations": [
    { "gate": "memory_index_bytes", "severity": "HARD", "file": "memory/MEMORY.md", "detail": "…" }
  ],
  "hardFail": true,                 // true iff any HARD violation -> blocks "sync complete"
  "skipped":  [ { "gate": "memory_docs_inversion", "reason": "skipped: no docs/" } ],
  "summary":  { "hardFail": false, "hardViolations": 0, "softViolations": 1,
                "leakageCount": 0, "hardGatesEvaluated": 3, "hardGatesPassed": 3,
                "hardGatePassRate": 1 }
}
```

CLI exit code: **0** iff `hardFail === false`, else **1**.

## The gates

| gate | severity | rule (INCLUSIVE ceilings) |
|------|----------|---------------------------|
| `memory_index_bytes` | HARD | `MEMORY.md` ≤ 25000 bytes (25000 PASS, 25001 FAIL — the overflow is silently dropped from context) |
| `memory_index_lines` | HARD | `MEMORY.md` ≤ 200 lines (200 PASS, 201 FAIL) |
| `memory_index_broken_link` | HARD | every `MEMORY.md` index link resolves (anchor-stripped, `./`-normalized, unicode-safe) |
| `single_memory_lines` | SOFT | each single memory `.md` ≤ 100 lines (101+ warns; 100 PASS) |
| `claude_md_size` | SOFT | `CLAUDE.md`/`AGENTS.md` ≤ ~300 lines / ~15000 bytes |
| `claude_md_missing` | SOFT | code-bearing project with no `CLAUDE.md`/`AGENTS.md` → "missing, consider creating" |
| `relative_time_leakage` | SOFT | standalone relative-time token in PROSE (see leakage policy below) |
| `memory_docs_inversion` | SOFT | `sum(memory .md bytes)` **strictly >** `sum(docs .md bytes)` (equal is fine) |

Whichever size ceiling trips first is reported (byte vs line are independent — both
can fire if both exceed). The aggregate `summary.hardGatePassRate` and
`summary.leakageCount` are the metrics the build/release gate tracks.

## Skips (never crash, never a false positive)

- No memory layer (Codex/OpenClaw, no `memory/MEMORY.md` and no root `MEMORY.md`)
  → all memory-side gates `skipped: no memory layer`, exits clean on docs-only gates.
- No `docs/` directory → inversion `skipped: no docs/`.

## Relative-time leakage policy (the exemption rule)

A relative-time reference is flagged **only** when it is (a) in PROSE — matches
inside fenced ```code blocks``` are EXEMPT — and (b) a standalone token:

- **English** uses case-insensitive word boundaries: `\btoday\b`, `\byesterday\b`,
  `\brecently\b`, … so `recently_archived` / `yesterdays/` do NOT match.
- **CJK** uses extension-suffix guards so a longer ideographic word does NOT match:
  `最近` fires in flowing prose (`最近改了接口`) but NOT inside `最近期` (the trailing
  `期` extends it into a different term). Guarded extensions: `期限来况间内外度年代`.

Tokens checked: en = `today yesterday tomorrow recently currently lately nowadays`;
CJK = `今天 昨天 明天 刚刚 刚才 最近 上周 上个月 目前`. Always write absolute dates
(`2026-04-29`) instead.
