# Audit Mode

Load this file when the user asks to audit, review, or check an existing
mobile UI against field worker standards.

## Workflow

1. **Run the evaluator**: `python scripts/eval_runner.py --input <file.html>`
2. Read `rules/eval-interpretation.md` for how to interpret the output
3. If passing all mandatory checks, optionally run against anti-pattern test
   cases in `test/hard/` to verify the evaluator's detection accuracy
