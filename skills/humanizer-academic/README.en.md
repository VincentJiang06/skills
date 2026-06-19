# humanizer-academic

> Rewrite academic prose to strip AI-writing signals — while keeping the scholarly register and never inventing facts.

**English** · [简体中文](README.md)

**What it does** — Rewrites academic / scholarly / professional prose (English, Chinese, or mixed EN-in-ZH) to remove AI-writing signals while preserving scholarly register and never inventing facts.

**Why it's good** —
- Removes signal on three layers — **lexical + structural + statistical burstiness** — not a word denylist.
- More than subtraction: it adds defined **human texture** (authorial stance, source-grounded specificity, syntactic/paragraph variance) — never casual, never invented.
- The bundled script only **DETECTS** — it never humanizes and is never the "humanizer" itself.
- Success is scored by an **independent blind judge**, not "count the patterns I deleted."

**When to use** — a thesis chapter / abstract / literature review / research or policy report reads templated or AI-generated and you want it human but still academic; or call `/humanizer-academic`.
**Not for** — discriminate three adjacent false-triggers: (1) a CASUAL general humanizer — this one **preserves register** and won't make prose chatty; (2) poetry / speech / fiction dialogue — they legitimately use parallelism and repetition, so **don't flatten them**; (3) detect vs rewrite — the script only emits a signal map, so a "just score this, don't rewrite" request returns the detector map and performs no rewrite. Also not for inventing evidence / citations / numbers, or non-academic casual text.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/humanizer-academic ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
