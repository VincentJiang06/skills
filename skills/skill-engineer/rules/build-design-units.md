# Building the 8 design units

Implement `recommended_design` from the spec into real files. Build **minimally
to pass the red cases** (Step 3) — don't gold-plate. Mirror the conventions in
sibling skills (`skill-zipper`, `skill-guidance`): a thin SKILL.md
orchestrator with detail pushed into `rules/`.

| Unit (spec field) | Where it lands | Build notes |
|---|---|---|
| `trigger` | SKILL.md frontmatter `description` | Encode positive + negative + **adjacent** cases; add a "Do NOT use for…" pointing to sibling skills. This is the #1 driver of whether the skill fires — make it specific and slightly pushy against under-triggering. |
| `protocol` | SKILL.md body `## Steps` | A runbook: preflight → steps → verify → report. Each step says which module to load. |
| `resources` | `references/` (full) | On-demand context (domain docs, examples). Reference clearly from SKILL.md with "load when…". |
| `evidence_base` | `references/` + citations | For fact-dependent skills only; otherwise the spec says `N/A` — skip it. |
| `controls` | scripts / schema / allowed-tools / hooks | **Externalize** — a script/validator/schema, not a prose "please be careful". skill-principle `anti_pattern.prompted_architecture` is the failure to avoid. |
| `tests` | `evals/` | The cases from Step 3 live here; they ARE the build's acceptance. |
| `metrics` | a short note in SKILL.md or `rules/` | How success/activation/cost is measured. Don't over-instrument a lite skill. |
| `lifecycle` | a `version` + `CHANGELOG` | `N/A` / minimal at lite. |

**Resources / references content:** author *real, minimal* content for any
resource the protocol actually depends on — don't ship an empty stub — but don't
gold-plate past what the eval cases exercise. `scaffold_skill.mjs` creates
`references/` automatically when the spec has `resources`; you just populate it.

**Controls — lite exception:** purely *behavioral* controls (e.g. "never run
git", "output text only") may stay as inline prose in SKILL.md.
`anti_pattern.prompted_architecture` targets the structural gating of *dangerous
capabilities* (tool/permission/network/file access) — externalize those into a
script, schema, or allowed-tools list. It does not demand you script away every
behavioral guideline on a low-stakes skill.

**CLI entry-point guard (script skills):** the naive
`import.meta.url === \`file://${process.argv[1]}\`` run-as-main check **breaks on
macOS** (`/tmp` → `/private/tmp` symlink) and ships a skill that silently exits 0
with no output. Always normalize both sides:
```js
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
const isMain = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
```
And add one eval case that invokes the skill via its **documented CLI** with an
absolute `/tmp/...` path, so a broken entry point fails the harness (the internal
function import alone won't catch it).

**Value-pinned assertions:** an assertion must check the **documented value /
semantics**, not just shape. Ban `typeof x === 'object'` / bare
`e instanceof Error` as the *only* predicate — error cases assert the error
**type or a message substring**; fuzzy-oracle cases (collision, idempotency)
**pin the exact documented output**. A case a wrong answer can pass tests nothing.

## Progressive disclosure

Keep SKILL.md a thin orchestrator (aim <500 lines; well under for small skills).
When a step needs more than a few lines of guidance, move it to `rules/<name>.md`
and load on demand. Put the Modules / Scripts / Assets tables at the end so the
agent knows what exists and when to load it.

## Order

Build in backlog order (P0 first). For each unit, write only enough to flip its
red case(s) to green, then move on. Resist designing units the spec marked
`N/A`/minimal — the altitude call already decided that, and extra ceremony is a
cost the zipper will just have to strip later.
