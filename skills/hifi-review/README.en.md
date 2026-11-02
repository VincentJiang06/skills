# hifi-review

> Objective, source-traceable HiFi gear evaluation — every claim traced to evidence, review consensus never dressed up as measurement.

**English** · [简体中文](README.md)

**What it does** — Gear evaluation in two tracks. **Transducers** (IEM / headphone / TWS): 量感 (per-band quantity) + 风格 (signature), derived from frequency-response-vs-target. **Source gear** (DAC / amp / DAP): measured competence (SINAD / THD / output-Z / power) + system matching.

**Why it's good** —
- Rig-aware FR analysis (711 ≠ 5128) with a peak/dip pass — 量感 and 风格 both land in dB from the curve.
- A "consensus ≠ measurement" no-inflation gate: a claim tagged with a technicality `attribute` (soundstage, soundstage_high, …) can only be `consensus`, never sold as a measurement endorsement.
- A media roster judged **dynamically** by orientation, not bucketed — measurement-backed sources trusted, impression-led ones bias-corrected.
- Every claim traced to evidence and tagged `measured | consensus | prior` with a confidence level.

**When to use** — "客观评价这条耳机" · "对比 A 和 B 的声音" · "这个 DAC 素质如何 / 推得动吗"; or call `/hifi-review`.
**Not for** — buying / 价格 recommendations; EQ tuning; speakers; non-audio.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/hifi-review ~/.claude/skills/`).

**Known limitations** — `validate_output.py` checks structure only (schema, every claim traced to a listed source, claims with a technicality `attribute` tagged consensus — it reads the tag, not the sentence, so an untagged technicality claim slips past it); it does not judge whether a claim is justified (e.g. an audible-difference claim — that is the Step 8 self-read against the judgment card). The L1 goldens are regression baselines frozen by the engines on synthetic curves: they prove determinism and no regression, not accuracy. Known gaps still open in 1.2.0: a coloration / sibilance id such as `coloration_high` tagged measured still passes; `compare.py` still returns `comparable: true` when a rig is missing or misspelled and records the skipped guard only in `warnings` — read the warnings, not the flag, before calling two curves comparable. Two-arm check (3 cases, vs bare Opus 5.5): the skill was better in 2 (the edge is rig / target matching), tied in 1, worse in 0.

Current version 1.2.0 — see [CHANGELOG.md](CHANGELOG.md). Full spec: [SKILL.md](SKILL.md)


## Sound dashboard (1.2.0)

Transducer reviews with sufficient evidence can include a JPEG summary of five tonal bands and five sound characteristics, plus a share URL. Missing evidence must not be replaced with neutral ratings; descriptive positions are not quality scores.

This is **optional**: the Python wrapper requires the external `sound-dashboard` CLI, Node.js 22+, and Chromium for JPEG rendering. The CLI is not bundled and this release provides no public installation source. Without it, complete the text review and state that no dashboard was generated. Users who already have the project source can follow [rules/sound-dashboard.md](rules/sound-dashboard.md). Rendering is local and does not upload review data.
