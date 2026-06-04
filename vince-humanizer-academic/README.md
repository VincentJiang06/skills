# humanizer-academic

`humanizer-academic` is a bilingual academic rewriting skill for English, Chinese, and mixed-language prose.

It keeps the original English humanizer coverage, adds Chinese-specific AI-writing detection rules, and defaults to an academic register instead of the more casual "add personality" behavior that general humanizers often drift into.

## Version

Current version: `1.3.0`

On each update, keep the version in sync in:

- `humanizer-academic/SKILL.md`
- `humanizer-academic/_meta.json`

## Repository layout

- `humanizer-academic/`: installable skill folder
- `humanizer-academic/references/`: English rules, Chinese rules, and academic-register guidance
- `eval/`: bilingual evaluation set, rubric, scripts, and reports

## Install

Copy the `humanizer-academic/` folder into your Codex skills directory, for example:

```bash
cp -R humanizer-academic "$CODEX_HOME/skills/"
```

## Evaluation set

The repository includes ten AI-generated papers in `eval/AIgenPapers/`.

- 5 model families: GPT, Grok, Kimi, Mimo, Minimax
- 2 languages each: Chinese and English
- 1 shared research topic: `香港的过去五年经济发展和未来五年经济发展`

Use this set to check three things:

1. Does the rewrite reduce obvious AI patterns?
2. Does it preserve meaning and academic seriousness?
3. Does it avoid over-humanizing into casual prose?

## Evaluation workflow

Run the baseline heuristic scan:

```bash
python3 eval/scripts/run_baseline_eval.py
```

Run the structure audit for the skill folder:

```bash
python3 eval/scripts/audit_skill_structure.py
```

Generate rewritten outputs, score them, and compare against baseline in one round:

```bash
python3 eval/scripts/run_eval_round.py --round-id codex-gpt-5.4-v4 --polish-english
```

Current best full-round result:

- `eval/results/codex-gpt-5.4-v4-compare.md`
- Average rewritten density is `0.59` under the current evaluator
- `v4` is the `v2` full round plus the optional `--polish-english` post-pass

If you need to rerun only failed or changed documents, use the lower-level runner:

```bash
python3 eval/scripts/run_codex_rewrites.py \
  --output-dir eval/outputs/codex-gpt-5.4-v4 \
  --ids gpt-en grok-en
```

Current generated reports live in `eval/results/`.
