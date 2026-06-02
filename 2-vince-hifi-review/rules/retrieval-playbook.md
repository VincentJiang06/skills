# Retrieval Playbook (Step 3)

Autonomous live retrieval. Goal: enough evidence to anchor an objective verdict —
not every source. Record each source's `id`, tier, style-lean, freshness, language.

## Per-class source order

**Transducer (IEM/headphone/TWS)** — get the curve first:
1. **FR data** — squig.link databases / Crinacle (IEM 711, HP GRAS), oratory1990
   (GRAS, raw + EQ), RTINGS. Prefer **raw data** over a screenshot.
2. **Other measurements** — THD, impedance, sensitivity (ASR, manufacturer).
3. **Reviews** (bilingual) — for technicalities the curve can't show.
4. **Specs / family / lineage** — driver type, prior models, brand house sound.

**Source gear (DAC/amp/DAP)** — measurements dominate:
1. **ASR-class bench data** — SINAD, THD+N, dynamic range, output impedance,
   power vs load, noise floor; else manufacturer/reputable AP measurements.
2. **Reviews** — features, UX, system pairing notes.
3. **Chip / topology / PSU** — DAC chip family, amp class, power supply (priors).

## Finding a given person's content

Read `references/source-registry.json`; for a chosen source, substitute the model
into its `search_hints` (replace `<model>`). Example: `site:squig.link "<model>"`.
Use a source's `style_profile` as a prior for how to weight it — but re-judge from
the actual content you load (does *this* page show measurements or just impressions?).

## Reading squig.link / graph tools

The squig viewers expose the underlying per-measurement `.txt` (two columns:
freq, dB). Grab that raw file and feed it to `fr_analyze.py`. The `?share=` URL
encodes which curves are shown. Note the measurer + rig (711 vs GRAS) for the guardrails.

## Screenshot-only path

If only a graph image is available: read the curve **shape** qualitatively
(where it rises/falls vs the target), estimate per-band direction, set
`precision: "qualitative"`, and **never invent precise dB numbers**. Prefer to
keep searching for raw data first.

## Stop rule

Stop gathering when you have **≥1 Tier-1 measurement** (transducer: FR; source:
SINAD + impedance/power) **and ≥2 independent reviews** — or you have exhausted
plausible sources. Log what is still missing as a `gap`; do not pad with low-value
sources just to hit a count.
