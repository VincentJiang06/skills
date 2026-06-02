# Comparison Mode (head-to-head)

Comparison reuses the single-device engines, then adds an alignment + delta layer.

## Align before comparing
- Both devices must be evaluated against the **same target** and ideally the **same
  rig / measurer**. Comparing a 711-IEM curve to a GRAS-headphone curve, or two
  different measurers, is **not comparable** without explicit caveats.
- Run each through `fr_analyze.py` (transducer) or `source_analyze.py` (source)
  with identical `--target` / thresholds.

## Per-band delta (transducer)
Emit a table: for each band, `A.quanta − B.quanta` and the dB deltas. Summarize:
which bands A has more/less than B, and the resulting 风格 contrast (e.g. "A is
warmer, B is more neutral-bright"). Tie technicalities to consensus deltas with N/M.

## Source-gear comparison
Compare measured competence tiers and the **system-matching** outcome for the
*stated load* (a 第二 amp may win on power into 300 Ω yet both be audibly
transparent into an IEM). Don't call two transparent sources "different sounding"
without a measured delta.

## Not-comparable rule
If the devices lack a common measurement basis (different rig/target, one has only
a screenshot, one is measurement-less), **say so** and refuse a false-precision
verdict. Offer the partial comparison that the evidence supports, and list what's
missing as `gaps`.

## Provenance carries through
Every comparative claim keeps its `provenance` + `confidence`, exactly like a
single-device claim. The traceability gate applies to comparison output too.
