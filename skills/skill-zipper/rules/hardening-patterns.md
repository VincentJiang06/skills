# hardening-patterns — library of vague → precise rewrites

Read this when applying the Harden operation. The diagnosis rubric finds
candidates; this file gives you the rewrite shape for each common
pattern. The goal is precision, not verbosity — the precise rewrite is
often the same length as the vague original.

## Hardening principle

> An instruction is hard enough when a model with no prior context would
> arrive at the same behavior the author intended.

If two competent models could read the instruction and act differently,
it needs hardening.

---

## H1. Vague action verbs

**Vague form**:
> "Handle errors appropriately."
> "Process the data as needed."
> "Deal with edge cases."

**Why it fails**: the model has no anchor for what "appropriate" means
in this specific skill's context. The default behavior the model picks
will be plausible but unlikely to match what you wanted.

**Precise rewrite**: name the failure mode + the recovery action.

> "If parsing fails, return the error to the user with the exact line
> number and skip the affected row. Do not retry."

> "When a row contains a non-numeric value in a numeric column, log it
> to stderr, mark the row as INVALID in the output, and continue. Do
> not abort."

**Pattern**: `<condition trigger>, <observable action 1>, <observable action 2>, <stop rule>`

---

## H2. Fuzzy conditions

**Vague form**:
> "If relevant, include the changelog."
> "When applicable, run the linter."
> "If needed, ask for clarification."

**Why it fails**: the gating condition is opaque. The model has to
infer when "relevant" applies, and will be inconsistent across runs.

**Precise rewrite**: replace the modal with a concrete predicate.

> "If the user mentions a release or version number, include the
> changelog in the output."

> "Run the linter when the diff touches more than 5 files OR more than
> 200 lines."

> "Ask for clarification only when the user request omits both the
> target file and the target function. Do not ask if either is given."

**Pattern**: replace each fuzzy modal ("if relevant", "as appropriate")
with `if <observable predicate>`.

---

## H3. Missing else branch

**Vague form**:
> "If the user provides a date, use it as the start of the range."
> (and then... no instruction for the case where no date is provided)

**Why it fails**: the model is left to invent the else case. Different
invocations will invent differently.

**Precise rewrite**: every `if` gets an explicit `else`, even if the
else is "do nothing."

> "If the user provides a date, use it as the start of the range.
> Otherwise, use 7 days before today."

> "If the file already exists, fail with an error. Otherwise, create it
> with the default permissions (0644)."

**Pattern**: every binary decision states both branches. For multi-way
decisions, the catch-all branch is named explicitly ("Otherwise..." or
"In all other cases...").

---

## H4. Unitless thresholds

**Vague form**:
> "If the input is too long, truncate it."
> "Ensure the output isn't too verbose."
> "Use a small font."

**Why it fails**: "too long" / "too verbose" / "small" are not values.
The model invents thresholds, and they shift between invocations.

**Precise rewrite**: add a number and a unit. State the boundary
semantics (≥ or >).

> "If the input is longer than 4,000 tokens, truncate to 4,000 tokens
> at the nearest paragraph boundary."

> "Limit output to 500 words or fewer."

> "Use a 12pt font for body text, 18pt for headings."

**Pattern**: `<numeric value> <unit> <boundary semantics (≥ / > / ≤ / <)>`

---

## H5. Undefined failure consequence

**Vague form**:
> "Verify the data passes validation."
> "Check that all dependencies are installed."
> "Confirm the user is authenticated."

**Why it fails**: a verb like "verify / check / confirm" implies a guard
rail, but doesn't say what happens when the guard fails. The model may
proceed regardless, or it may panic.

**Precise rewrite**: pair every check with its failure action.

> "Verify the data passes JSON schema validation. If it fails, stop the
> workflow and report the first 3 schema errors."

> "Check that pytest and tiktoken are installed. If either is missing,
> exit with an error message that says exactly which package and the
> install command."

**Pattern**: `<check>. If <fail>, <named action>. Otherwise, <continue>.`

---

## H6. Implicit quality contract

**Vague form**:
> "Make the report easy to read."
> "Generate a high-quality summary."
> "Ensure the code is well-tested."

**Why it fails**: "easy to read" / "high-quality" / "well-tested" are
subjective. The model picks its own bar.

**Precise rewrite**: replace the quality adjective with measurable
properties, OR point to an artifact (template, example, schema) that
embodies them.

> "Format the report as bullet points, max 5 bullets, each ≤ 1 sentence."

> "Generate a summary of ≤ 100 words that names every actor and the
> single most important action they took."

> "Ensure the code has at least one pytest function per public function,
> and that running `pytest` exits 0."

**Pattern**: bullet list of measurable properties, OR reference to a
template file in `assets/`.

---

## H7. Free-form "best judgment"

**Vague form**:
> "Use your best judgment on whether to escalate."
> "Decide which option is best."

**Why it fails**: relying on the model's judgment is sometimes the
*correct* design — but only when the latitude is intentional. Often it's
just a hole in the spec.

**Precise rewrite, version A** — replace with a rubric:

> "Escalate if any of: (a) the user mentions a deadline, (b) the change
> touches authentication code, (c) the diff is larger than 200 lines.
> Otherwise, proceed without escalation."

**Precise rewrite, version B** — keep latitude but mark it explicit:

> "*This is intentionally a judgment call.* Use your best judgment on
> which option to recommend; the user has given you latitude here. State
> your reasoning briefly so the user can override if they disagree."

**Pattern**: either replace judgment with rubric, OR explicitly mark
the latitude as intentional. Never leave it ambiguous.

---

## H8. Implicit ordering

**Vague form**:
> "Read the inputs, validate them, and write the result."
> (no statement of what happens if validation fails between read and write)

**Why it fails**: the sequence implies dependency, but the failure modes
aren't covered. The model may write a partial result before validation
finishes.

**Precise rewrite**: state the ordering AND the rollback semantics.

> "1. Read the inputs.
>  2. Validate every input against the schema. If any input fails,
>     stop here — do NOT write any output.
>  3. Once all inputs pass, write the result atomically."

**Pattern**: numbered steps + explicit transition conditions between
steps.

---

## H9. Pronoun without antecedent

**Vague form**:
> "Replace it with the new value."
> "Process them one at a time."

**Why it fails**: "it" / "them" depend on context the model may have
lost or never had.

**Precise rewrite**: name the noun explicitly.

> "Replace the matched line with the new value from the user."
> "Process each row of the input CSV one at a time."

**Pattern**: every pronoun in a procedural instruction is replaced by
its referent. This is verbose but unambiguous.

---

## H10. Underspecified output format

**Vague form**:
> "Output the result."
> "Report findings."

**Why it fails**: format is undefined — Markdown? JSON? Prose?

**Precise rewrite**: name the format and its skeleton, or point to a
template.

> "Output the result as a single JSON object with keys `status`
> (`ok` | `error`), `count` (integer), and `details` (array of strings)."

> "Report findings as Markdown using the template in
> `assets/report-template.md`."

**Pattern**: `Output as <format> with <structure>` OR `Output using
<template path>`.

---

## When NOT to harden

Don't over-harden. Vagueness is sometimes the right design choice:

- **Pure creative latitude**: "Write the announcement in a voice that
  fits the brand" — if you have a brand guide, link to it; otherwise
  intentional latitude is fine, just mark it as such.
- **Stylistic preferences**: "Prefer concise prose" is a soft signal,
  not a guard rail.
- **Where the user is expected to read and adjust**: a draft step where
  the user will edit doesn't need the same precision as a final-output
  step.

Hardening makes a skill more reliable, but it also makes it more rigid.
For each rewrite, ask: would a smart human reader rather have the vague
version with latitude, or the precise version with constraints? Both
answers are sometimes correct.

## Verification

After hardening, re-read each rewritten instruction as if you were a
fresh model. The test: can you imagine two competent models acting
differently after reading it? If yes, harden further. If no, ship.
