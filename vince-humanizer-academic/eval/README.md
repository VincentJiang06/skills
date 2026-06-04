# Evaluation Dataset

This evaluation set contains ten AI-generated papers on one shared topic:

`香港的过去五年经济发展和未来五年经济发展`

## Coverage

- 5 model families: GPT, Grok, Kimi, Mimo, Minimax
- 2 languages per model: Chinese and English
- Format: Markdown

## Tooling

- `rubric.md`: before/after evaluation rubric for rewritten outputs
- `scripts/run_baseline_eval.py`: heuristic baseline scan over the source documents
- `scripts/audit_skill_structure.py`: no-dependency audit of the skill folder structure
- `scripts/run_codex_rewrites.py`: batch rewrite runner using `codex exec`
- `scripts/run_eval_round.py`: one-command rewrite + score + compare runner
- `scripts/compare_eval_results.py`: before/after comparison over heuristic evaluation outputs
- `../humanizer-academic/scripts/polish_english.py`: narrow English cleanup pass for residual report-shell phrasing
- `outputs/`: generated rewritten papers and manifests
- `results/`: generated baseline and audit reports

## Files

- `AIgenPapers/GPT Chi.md`
- `AIgenPapers/GPT Eng.md`
- `AIgenPapers/Grok Chi.md`
- `AIgenPapers/Grok Eng.md`
- `AIgenPapers/Kimi Chi.md`
- `AIgenPapers/Kimi Eng.md`
- `AIgenPapers/Mimo Chi.md`
- `AIgenPapers/Mimo Eng.md`
- `AIgenPapers/Minimax Chi.md`
- `AIgenPapers/Minimax Eng.md`

## Suggested evaluation criteria

Score each rewrite on a 1-5 scale:

1. `Semantic fidelity`: did the rewrite preserve the source meaning?
2. `Academic register`: does it still read like serious academic prose?
3. `AI-pattern reduction`: were obvious template signals removed?
4. `Structural repair`: were paragraph scaffolds, empty uplift, and vague attributions improved?
5. `Language fit`: for Chinese and English separately, does the rewritten text match native academic style expectations?

## Failure modes to watch

- The rewrite becomes too casual, personal, or conversational.
- The rewrite removes necessary hedging or technical precision.
- The rewrite introduces unsupported factual detail.
- The rewrite keeps most of the original AI scaffolding and only swaps synonyms.

## Current best round

- Best current full-round output: `results/codex-gpt-5.4-v4-compare.md`
- Average rewritten density: `0.59`
- `v4` is derived from the `v2` output set plus `polish_english.py`
