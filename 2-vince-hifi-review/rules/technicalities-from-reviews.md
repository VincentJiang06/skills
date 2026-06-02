# Technicalities from Reviews (Step 6 — transducer)

FR cannot reliably tell you these. They come from **review consensus only** and
must **never** be tagged `provenance: "measured"`.

## The review-only attributes
声场/soundstage · 结像/imaging · 解析/resolution · 动态/dynamics ·
瞬态/transient · 音色/timbre. (Distortion/CSD data, if present, may *inform*
resolution/timbre but is reported as its own measured claim.)

## Scoring
Rate each on a 5-point scale (well-below / below / average / above / well-above)
**with an N/M agreement count** — e.g. "soundstage: above average (4/5 sources)".
If sources split, report the split as `dissent`; do not collapse it to a mean.

## Style weighting (dynamic, not a bucket)
Weight each source's contribution by what the claim *is* and how the source
actually argues it — judged from the content in front of you, with the registry
`style_profile` as a prior:

- **Measurement-backed claim** (the source shows data) → high trust, regardless of
  who the source is.
- **Pure-impression claim** → subjective; weight by the reviewer's demonstrated
  calibration. If the source leans a known direction (e.g. warm-preference,
  treble-sensitivity, enthusiasm), **bias-correct** that lean.
- **Low-tier / high-promo-risk** → down-weight, but **never discard** — keep it as
  a flagged minority signal.

Do not split sources into fixed 科fi/hufi camps; orientation is re-judged per source
per claim.

## Cross-check
Compare review tonality language against the measured 量感 vector. If a reviewer
says "bright" but the curve shows recessed treble, flag the conflict (rig
difference? unit variation? insertion depth?) rather than averaging.

## Hard rule
A technicality claim's `provenance` is always `consensus`. The traceability gate
(`validate_output.py`) rejects any `soundstage/imaging/resolution/dynamics/
transient/timbre` claim tagged `measured`.
