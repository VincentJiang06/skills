<!--
  Copy this file to rules/<your-name>.md and fill in the placeholders.
  Strip these HTML comments before committing — they exist to guide the
  author, not the reader.

  Naming convention:
    rules/<kebab-name>.md         — instructional prose, conditionally loaded
    references/<kebab-name>.<ext> — data / lookup tables / bibliographies
    assets/<kebab-name>.<ext>     — copy-paste artifacts (templates, examples)
    scripts/<kebab-name>.<ext>    — executable code
-->

# {filename} — {one-line purpose, ≤ 70 chars}

<!--
  Opening sentence: state when the reader (Claude in a future invocation)
  should read this file. The trigger should be either:
    - "Always — sets the mental model for X"
    - "When applying operation X"
    - "When the user does Y or asks about Z"

  This sentence determines whether this file is Compress (token-neutral
  always-Read) or Encapsulate (gated). Be explicit.
-->

Read this when {specific trigger condition}.

## {Section 1 — usually "Principle" or "The model" or "When this applies"}

<!--
  Lead with the single most important concept. Three sentences or fewer.
  The reader has come here from SKILL.md and needs the anchor first.
-->

{Content.}

## {Section 2 — usually the rules / patterns / table}

<!--
  Patterns, tables, and lists belong here. This is the file's center of
  gravity — most of its tokens live in this section.

  If this section is more than ~150 tokens of prose, consider whether
  it could be a markdown table or a bullet list instead.
-->

| {Column 1} | {Column 2} | {Column 3} |
|------------|------------|------------|
| {row}      | {row}      | {row}      |

## {Section 3 — usually "When NOT to apply" or "Anti-patterns" or "Edge cases"}

<!--
  Every rules file should state its limits. Without this section the
  model will over-apply the file's guidance.
-->

- {Anti-pattern 1 — when this advice is wrong}
- {Anti-pattern 2}

## Verification (optional but recommended)

<!--
  How can a reader check that they applied this file correctly?
  Concrete: a measurement, a re-read, an exit code.
-->

After applying this file:
1. {Observable check 1}
2. {Observable check 2}
