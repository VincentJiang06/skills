# album-review

> One full-dimension long-form Chinese 乐评 from a primary credit + album name — every fact traced to a source, obscure albums degrade honestly, never fabricated.

**English** · [简体中文](README.md)

**What it does** — One 10,000–15,000-字 Chinese 乐评 from a primary credit (artist / composer / conductor / band / performer) + album name, across every musical dimension.

**Why it's good** —
- A deterministic 字-count window + genre-adaptive validator gate length and section coverage before anything ships.
- Every fact is traced to a source; a missing source FAILs the gate — no confident-but-unsupported claims.
- Classical separates the **work** from the **performance** and requires reference-recording comparison.
- Obscure albums degrade honestly (explicit 资料不足), never fabricating tracks / personnel / dates.

**When to use** — "给 <artist/composer/conductor> 的专辑 <name> 写一篇深度乐评" · "全面评测这张专辑" · "comprehensive album review of <album> by <artist>"; or call `/album-review`.
**Not for** — audio-gear evaluation ("这条耳机声音怎么样", "这个 DAC 推得动吗" → hifi-review); buying / price / where-to-stream advice; bare lyric translation with no critical content; non-music subjects.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/album-review ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
