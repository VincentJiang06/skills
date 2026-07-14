# Paper structures — read the ONE skeleton matching the paper type

Use a skeleton when the requirement does NOT pin its own section list, or to sanity-check a
pinned list. If the requirement pins a section list, THAT overrides these defaults (explicit
user spec wins). The chosen heading set becomes the expected set for `check_sections.py`.

---

## Literature review (by theme)
`Abstract` · `Introduction` · `Methods of review` (scope, databases, inclusion criteria) ·
`Thematic synthesis` (organized by theme, not by paper) · `Gaps / Future directions` ·
`Conclusion` · `References`
- Common in health/social sciences. Synthesize across sources by theme; do not list papers
  one by one.

## IMRaD empirical
`Abstract` · `Introduction` · `Methods` · `Results` · `Discussion` · `Conclusion` ·
`References`
- Standard for empirical natural- and social-science papers. Results report; Discussion
  interprets — keep them separate.

## Argumentative essay
`Introduction` (with thesis) · `Background` · `Argument` (claims + evidence, may be several
sections) · `Counterarguments` · `Conclusion` · `References`
- Common in humanities/policy. A defensible thesis must be stated early and carried
  throughout; address the strongest counterargument.

## Thesis chapter
`Introduction` · `Literature review` · `Methodology` · `Analysis / Findings` · `Discussion` ·
`Conclusion` · `References`
- A single chapter of a longer work; keep scope to the chapter's contribution and reference
  the surrounding chapters rather than re-arguing them.

---

### Discipline notes
- Humanities argumentative essays often omit a separate Methods/Abstract; sciences require
  them. Match the discipline the requirement names.
- For a loose 选题 with no structure given: propose the closest skeleton, STATE it inline
  ("I will argue X via a three-part thematic review — confirm or adjust"), and proceed on
  the stated assumption. Do not silently pick a narrow angle the user did not ask for.
