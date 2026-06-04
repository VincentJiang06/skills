# Worked rewrite notes — gpt-en (source: evals/fixtures/GPT Eng.md)

Protocol trace + verification for `gpt-en.rewrite.md`. Scope = Abstract + Intro +
Structural-Change section.

## Preflight
- Language: English. Sections: abstract / introduction / analysis. Genre: academic
  (no whitelist down-weighting). Register: formal, must be preserved.
- Locked constraints (must survive verbatim): every GDP figure (6.4 / 3.5 / 3.2 /
  2.5 / 3.5%), HK$168.9bn services surplus, HK$406.6bn current account, 12.2% of
  GDP, HK$19tn deposits, HK$35.1tn AUM, HK$286bn IPO, arrival series
  91,000→49.9m, 2.8% tourism GDP, 87% occupancy, 7.1% / 3.3% property, HK$17.5bn
  land premium, HK$647.3bn reserves; IMF ~2.5%; HKSAR 2.5–3.5% / ~3%.

## SUBTRACT — lexical (Step 1)
- Cut inflation/uplift: "best understood not as", "powerful rebound",
  "convincing", "signs of a centre regaining traction" trimmed to plain claims.
- Cut analytic padding: "indicating", "suggesting", "The implication is
  straightforward", "In other words", "In effect".
- Cut report-shell vocabulary woven into sentences.

## SUBTRACT — structural (Step 2)
- Removed the heavy First/Second/Third signpost scaffolding in the Introduction
  (kept the three phases as content, not as labelled list items).
- Collapsed "The first major structural change is… The second… The third… The
  fourth…" template into argued paragraphs led by the claim, not the ordinal.
- Reduced balanced negative parallelism ("did not simply return … it began to
  search"; "not X but Y") — kept ONE where the source genuinely argues the
  contrast (old model vs new model), dropped the mechanical ones.

## FLATTEN — statistical (Step 3)
- Broke the uniform ~40-word sentence rhythm: short declaratives now punctuate long
  ones ("It cannot." → folded as "— it cannot —"; "value did not."). Diagnostic:
  `sentence_cv` rises vs source on these sections.
- De-clustered hedging: committed where the data is firm, hedged only the
  forward-looking 2026–2030 claims.

## ADD — human texture (Step 4)
- Stance: committed claims with calibration — "moderate growth is the realistic
  expectation"; "the markers of a financial centre regaining traction, not one in
  decline"; "volume returned, value did not".
- Source-grounded specificity: every specific (HK$168.9bn, HK$286bn, 49.9m, 87%,
  HK$17.5bn) is lifted from the source — none invented.
- Controlled asymmetry: tourism paragraph is shorter and pointed; the finance
  paragraph carries more weight, matching the argument.

## Step 5 — register re-check
Formal throughout; no slang/banter; the one em-dash-style emphasis is academic, not
chatty. Forward claims retain calibrated hedging ("realistic expectation", IMF
attribution). PASS.

## Step 6 — verification
- **No-new-facts:** every number/entity traces to GPT Eng.md. `fact_invention_rate
  = 0`. PASS.
- **Register-collapse:** register ≥ source. PASS.
- **Idempotency:** a second pass finds no denylist hits and no new structural
  scaffolding to remove → near no-op. PASS.

## Blind-judge self-score (per evals/blind-judge-rubric.md, judging prose only)
1. Residual AI-ness: **4** — signposting and template paragraph-shape gone; rhythm
   varied.
2. Register: **5** (source ~4) — restrained, publishable; register did not drop.
3. Semantic fidelity: **5** — all evidence and calibration preserved.
4. Texture added: **4** — committed stance + source-present specifics + varied
   rhythm.
5. Language fit: **5** — native academic English.
No hard-fail. Thresholds met (1≥4, 2≥4 & ≥source, 3≥4, 4≥3, 5≥4). **PASS.**
Marginal lift: source dim-1 ≈ 2 → rewrite 4 (strictly higher); dim-2 not lower.
