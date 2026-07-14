# Subjective rubric — run by an INDEPENDENT verifier, never the author

The deterministic scripts check FORM (length, section presence, citation shape). They cannot
tell whether a well-formed reference points at a real source that actually supports its
claim, nor whether the argument coheres, nor whether the register is genuinely academic.
Those three are judged here, **by an independent verifier — a different source from the model
that wrote the paper, with source-lookup capability — not by the author.** The author
grading its own citations is the exact failure this design rejects (a model that invented a
reference has the same incentive when "double-checking" it).

## Judging protocol (applies to all three dimensions)
- **Independence:** the judge must not share source with the builder or the graded output.
  Vendor-tier independence (a different-vendor judge) is the specified production
  configuration; a stronger same-family judge is NOT a substitute.
- **Unknown exit (mandatory):** the judge MAY return `Unknown` when it genuinely cannot
  verify (e.g. a source it cannot look up). A judge forced to score everything is suspect.
  But dumping hard cases into Unknown is gaming — the Unknown rate is capped and audited.
- **Style/verbosity bias audit:** the judge must NOT reward a paper for being longer,
  more fluent, or more confident. Score substance; a verbose fluent paper and a terse
  precise one get equal treatment. (Style/verbosity is the 2026 #1 judge bias.)
- **Negatives required:** calibrate against the golden negatives in `evals/golden/` before
  trusting any score — an all-positive calibration self-certifies anything.
- Prefer pass/fail and equivalence classes over absolute 1–5 scores where possible; for
  noisy judgments take the median of multiple samples.

## source_fidelity  (the load-bearing dimension — any failure = hard fail)
For each cited source, the independent verifier looks it up and assigns:
- **SUPPORTED** — the source exists AND genuinely supports the claim attached to it.
- **MISATTRIBUTED** — the source exists but does NOT support (or contradicts / overstates)
  the claim.
- **FABRICATED** — the source does not exist (a well-formed but invented DOI/URL/ISBN).
- **Unknown** — cannot verify existence/support with available lookup.
Stop condition: **any FABRICATED or MISATTRIBUTED instance = FAIL, regardless of every
objective green.** One fake source in a beautiful paper is a fail; a flat paper with all
real, correctly-attributed sources passes pending polish. Golden anchors: 3 SUPPORTED,
1 FABRICATED, 1 MISATTRIBUTED (real source, wrong claim), 1 overstated (real source,
overstated claim) — see `evals/golden/source_fidelity.json`.

## argument_quality_and_coherence  (1–5, pass ≥ 3)
- **5** — clear defensible thesis carried throughout, evidence marshaled, no non-sequiturs.
- **3** — thesis present but under-supported or drifting.
- **1** — a list of facts with no argument, or a conclusion that contradicts the body.
Golden anchors: 2 positive (coherent graduate lit-review sections), 2 negative (a fact-dump
with no thesis; a paper whose conclusion contradicts its body) — see
`evals/golden/argument_quality.json`.

## academic_register  (1–5, pass ≥ 3)
- **5** — indistinguishable from a competent human academic in that discipline (hedged,
  precise) in the requested EN/ZH.
- **3** — serviceable but generic.
- **1** — informal / chatty / AI-slop tells ("Let's dive into this fascinating topic!").
Does NOT invoke the humanizer skill — it only SCORES register. Golden anchors: 2 positive
(real published abstracts in the discipline), 2 negative (chatty prose; template AI-slop) —
see `evals/golden/academic_register.json`.
