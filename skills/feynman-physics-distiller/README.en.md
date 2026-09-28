# feynman-physics-distiller

A one-on-one physics tutoring skill that answers in Chinese. It builds explanations from concrete problems, drawing on the Feynman Lectures and Feynman's talks. Any claim that "Feynman said / did" something must resolve to a verified source ID in the local source map.

Current version: 3.1.0 (see [CHANGELOG.md](CHANGELOG.md), in Chinese)

## When to use

- Teach a physics topic from zero ("explain an RC low-pass filter from scratch")
- Follow up on a step of the previous answer
- Give only the result
- Read the Lectures together ("walk me through I–4 §4–1")
- Check an attribution ("did Feynman ever say ...", "who gave lecture I–6?")
- Trigger: `$feynman-physics-distiller`

Not for: condensing a whole course into notes (use `$vince-course-study`), non-physics questions, or Feynman biography anecdotes.

## Layout

- `SKILL.md`: five entry contracts, a six-item self-review list, the attribution red line, and the on-demand reading table.
- `rules/`: the source map `sources.md` (19 IDs; summaries only, no verbatim lecture text), `attribution.md` (ID index and citation rules), and the method, companion-reading, conflict, lineage and boundary books.
- `docs/`: requirements and audit files (locked).

## What changed in 3.1.0

- **Quote discipline**: quotation marks are only for original text actually read in the current turn, with its location given. Content that rests only on a source ID is paraphrased with its volume and chapter, without quotation marks. An ID proves where an idea comes from, not its wording.
- **Two tiers of shape checks**: count and structure checks remain final machine verdicts. The seven word-list proxies now only raise a FLAG, which the blind judge rules on against the contract sentence and can overrule.
- **With/without experiments**: regression arm prompts now forbid calling the Skill tool, so an installed older version cannot load itself into an arm.
- **Acceptance**: in an Opus 5.5 with/without experiment the WITH arm won 3 of 3 cases. It won on attribution discipline, and on the from-zero case also on stating physical conditions fully. One battery round at instance tier hit 4 of 5 seeds; 7 confirmed P3 findings are left open (see CHANGELOG). Maturity is capped at candidate because the different-vendor final review has not been run.

## Installation and public package

```bash
npx skills add VincentJiang06/skills --skill feynman-physics-distiller
```

Alternatively, copy this directory into your agent's skills directory. The host needs file-reading tools and, to check original web sources, its own browsing tools. No dedicated API key or script dependency is required. `$vince-course-study` is the author's local alias for the public `course-study` skill.

This is the first GitHub distribution of 3.1.0; runtime files are unchanged from the local version. `docs/` retains design records and the audit referenced by the source map. Development evaluations, original baselines and answer transcripts remain local and are not shipped. Historical results in CHANGELOG were not rerun for this publication; development paths are historical references only.

The MIT license covers this skill's original material. Linked Feynman lectures and other primary sources retain their respective copyright and usage terms. The source map contains summaries and links, not the full lecture texts.
