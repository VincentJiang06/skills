# humanizer-academic

> Rewrite academic prose to strip AI-writing signals — while keeping the scholarly register and never inventing facts.

**English** · [简体中文](README.md)

**What it does** — Rewrites academic / scholarly / professional prose (English, Chinese, or mixed EN-in-ZH) to remove AI-writing signals while preserving scholarly register and never inventing facts.

**Why it's good** —
- Removes signal on three layers — **lexical + structural + statistical burstiness** — not a word denylist.
- More than subtraction: it adds defined **human texture** (authorial stance, source-grounded specificity, syntactic/paragraph variance) — never casual, never invented.
- The bundled script only **DETECTS** — it never humanizes and is never the "humanizer" itself.
- Success is scored by an **independent blind judge**, not "count the patterns I deleted."

**Architecture (v4.0.0, mode-split structural rebuild)** — the references are re-carved along the exclusivity axis: mode-primary — `references/academic-pack.md` / `references/popsci-pack.md` (each self-contained); language-secondary — `references/lexical-en.md` / `references/lexical-zh.md`; shared non-exclusive — `references/structural-signals.md`; the blind-judge rubric stays standalone. Content was **losslessly absorbed** (32/32 coverage check; the detector script and rubric are byte-identical). Measured wins: always-loaded SKILL.md 2,868→2,432 tok (−15%); the abstain path (the most common invocation) ~−35%; the academic-EN rewrite path ~−39% (an academic job no longer loads popsci content or the Chinese lexicon). The fact-fidelity guard is also hardened: two worked NEGATIVES (a behavioral-inference case + a named-entity-parallel case) + a sharpened Step-5 no-new-facts scan — the rebuild found a fact-invention that shipped v3.2.0 itself had missed (the hemoglobin case); v4.0.0 catches it. Honest note: the v4.0.0 win is **structural** — quality held rather than jumped (blind-judge A/B, 12 files: false-positive 0, fact-invention 0, ai_ness lift ≥ baseline; academic completeness genuinely improved, +0.25 mean with one longform 4→5; popsci equal).

**When to use** — a thesis chapter / abstract / literature review / research or policy report reads templated or AI-generated and you want it human but still academic; or call `/humanizer-academic`.
**Not for** — discriminate three adjacent false-triggers: (1) a CASUAL general humanizer — this one **preserves register** and won't make prose chatty; (2) poetry / speech / fiction dialogue — they legitimately use parallelism and repetition, so **don't flatten them**; (3) detect vs rewrite — the script only emits a signal map, so a "just score this, don't rewrite" request returns the detector map and performs no rewrite. Also not for inventing evidence / citations / numbers, or non-academic casual text.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/humanizer-academic ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
