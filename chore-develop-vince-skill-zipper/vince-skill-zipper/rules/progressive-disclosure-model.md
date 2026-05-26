# progressive-disclosure-model — what's in context when

Read this before reasoning about token cost. The 5 operations only make
sense once you know exactly which files enter Claude's context window and
when.

## The two layers

A skill has two distinct loading layers. Treat them as separate budgets.

### Layer 1 — Always-loaded

These tokens enter the context window the moment the skill is invoked, on
every single invocation, whether or not the model ends up using them.

| What | When it loads | Where it lives |
|------|---------------|----------------|
| Skill metadata (`name`, `description`) | At session start, listed among available skills | SKILL.md frontmatter |
| SKILL.md body | When the skill is invoked via Skill tool | SKILL.md after frontmatter |

That's it. The body of SKILL.md is the entire always-loaded layer. Every
line in SKILL.md is a tax paid on every invocation.

### Layer 2 — On-demand

These tokens enter context only if Claude (or a script) explicitly Reads
them during the invocation.

| What | When it loads |
|------|---------------|
| `rules/*.md` | When SKILL.md links to it or Claude judges it relevant and Reads it |
| `references/*` | Same — Read-on-demand |
| `assets/*` | Same — Read-on-demand (or copy-pasted into a generated file) |
| `scripts/*` | Same — Read-on-demand, OR executed by Bash (in which case only stdout enters context, not the source code) |

Files in `evals/`, `test/`, or any hidden directory are infrastructure for
the skill author. Claude never loads them during normal invocation.

## Token cost model

For one invocation of a skill:

```
total_tokens_cost = (size of SKILL.md)
                  + sum(size of each on-demand file that Claude actually Read this run)
```

The always-loaded layer is paid every time. The on-demand layer is paid
proportionally to what gets used.

This is the single most important fact for skill restructuring. Internalize
it before proceeding.

## Implications for the 5 operations

| Operation | What it does | Token effect per invocation |
|-----------|--------------|-----------------------------|
| **Compress** | Move always-loaded content into an on-demand file *that is always Read* | Roughly **zero** — same total, just routed through Read instead of direct |
| **Compress (lazy)** | Move always-loaded content into an on-demand file *that is only sometimes Read* | **Negative** — saves tokens on invocations that don't trigger the Read |
| **Encapsulate** | Move content gated by a clear condition into a separate on-demand file | **Strongly negative** — saves the entire chunk on invocations outside the condition |
| **Enrich** | Add a new template/script/asset for steps the model currently reinvents | **Slightly positive** (extra Read) but **strongly positive on quality and speed** — model stops hallucinating the format each time |
| **Harden** | Rewrite vague instructions to be precise | **Roughly zero** on tokens, **strongly positive on reliability** |
| **Retrigger** | Rewrite frontmatter description for better trigger accuracy | **Zero** on per-invocation cost, but determines whether the skill loads at all |

So the priority order, by token leverage:

1. **Encapsulate** > **Compress (lazy)** — these directly cut the always-loaded budget
2. **Retrigger** — without correct triggering, the skill loads either too often (wasting context) or not at all (zero value)
3. **Harden** + **Enrich** — quality improvements; don't move the token needle much but change the output

Pure **Compress** (move content that will always be Read anyway) is mostly
cosmetic — worth doing for SKILL.md readability, but don't expect token
wins. Mark these explicitly so the user knows the trade-off.

## Common misconceptions to avoid

- "Files in the skill directory are auto-loaded." — **False.** Only SKILL.md is auto-loaded on invocation.
- "Splitting into rules files reduces tokens." — **Only if** the split content isn't always Read back in. Otherwise it's a wash.
- "Bigger SKILL.md = more capable skill." — **False.** Bigger SKILL.md = larger always-paid tax. Capability lives in on-demand files that are Read when needed.
- "Description doesn't matter much, the body does the work." — **False.** Description is the entire signal Claude uses to decide whether to load the skill. A bad description = skill never runs.

## When in doubt, measure

Run `scripts/measure_tokens.py <skill_dir>` to see the actual split between
always-loaded and on-demand. If always-loaded > 30% of total tokens, the
skill is probably under-encapsulated.
