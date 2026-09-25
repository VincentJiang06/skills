# album-review

> One full-dimension long-form Chinese 乐评 from a primary credit + album name — every fact-labelled claim tied to a source, obscure albums degrade honestly, never fabricated.

**English** · [简体中文](README.md)

**What it does** — One 10,000–15,000-字 Chinese 乐评 from a primary credit (artist / composer / conductor / band / performer) + album name, across every musical dimension.

**Why it's good** —
- A deterministic 字-count window + genre-adaptive validator run before anything ships. The section check is a keyword proxy: each keyword group counts if it appears anywhere in the text, so it catches a forgotten dimension but does **not** check that the headers exist; real structure is checked by no script and stays the writer's job. The validator measures **length, not substance**: Latin/punctuation padding is caught, 汉字-level repetition padding is not — that side is carried by the negatives in `rules/judge-must-flag.md` plus a human/judge read.
- **The floor is never met by adding 字**: if two consecutive fix rounds add no real substance and the floor is still unmet, the skill stops and reports that the floor and this album's available material are incompatible — a call only the human can make.
- Every fact-labelled claim must cite an evidence entry that exists; a missing or dangling id FAILs the gate. The script checks that references resolve — **not** whether the source supports the claim, whether the fact/interpretation label is honest, or whether the prose matches the backing; those are a human/judge read (negatives in `rules/judge-must-flag.md`).
- Classical separates the **work** from the **performance** and requires reference-recording comparison.
- Obscure albums degrade honestly (explicit 资料不足), never fabricating tracks / personnel / dates.

**When to use** — "给 <artist/composer/conductor> 的专辑 <name> 写一篇深度乐评" · "全面评测这张专辑" · "comprehensive album review of <album> by <artist>"; or call `/album-review`.
**Not for** — audio-gear evaluation ("这条耳机声音怎么样", "这个 DAC 推得动吗" → hifi-review); buying / price / where-to-stream advice; bare lyric translation with no critical content; non-music subjects.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/album-review ~/.claude/skills/`).

**Version** — 0.3.0 (2026-09-25). Changes and verification record: [CHANGELOG.md](CHANGELOG.md).

**Known limitations (open in 0.3.0; see CHANGELOG "Open findings")** —
- "Classical requires reference-recording comparison" above over-claims: `--class` is the writer's choice and generic words (版本, 曲式) satisfy the keyword groups, so the classical work/performance split is **not** script-enforced.
- The section-keyword check uses mostly generic words (分析, 参考, 背景, 声音, 版本); "catches a forgotten dimension" holds only when no word of that group appears anywhere, and no writer step self-checks that the headers exist.
- `classify_route` is a rough regex proxy that misroutes mixed-intent prompts; the description governs activation.
- Independence is instance-tier only (every role this wave was a fresh Opus 5.5 high context), not cross-vendor.

Full spec: [SKILL.md](SKILL.md)
