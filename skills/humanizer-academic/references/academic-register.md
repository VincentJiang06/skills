# Academic Register

> Authored heuristics. This is the **register-preservation guard** — the floor
> the rewrite must not drop below. It is consulted at preflight (to lock register)
> and again at the final re-check. The headline failure mode this guards is
> **register collapse**: making academic prose casual/chatty in the name of
> "humanizing".
>
> **Mode:** this is the floor for `academic` mode (serious scholarly papers).
> Serious popular-science writing has its own, looser floor in **popsci-register.md**
> — do not apply this file to popsci, and do not apply that file to academic prose.

This skill is intentionally stricter than a general "humanizer." The goal is publishable or reviewable academic prose, not lively internet prose.

## Default stance

- formal but not inflated
- clear but not chatty
- precise but not overloaded
- readable but not casual

## Preserve

- citations, quotations, table and figure references
- dates, numbers, units, and named entities
- technical terminology
- justified hedging
- section logic and argument order

## These are NOT AI tells in academic writing — do not strip

The detector and the general anti-AI denylist over-flag a set of features that are
**load-bearing in real scholarship**. Working academics use these constantly;
removing them damages the prose and often the meaning. Preserve them in `academic`
mode unless they are genuinely empty padding.

- **"significant" / "significantly"**, especially **"statistically significant"** —
  a precise technical term reporting a test result, not hype. "The effect was
  statistically significant (p < .01)" must stay. Only cut *non-technical* filler
  uses ("a significant amount of attention").
- **"robust" / "comprehensive" / "powerful"** in technical use — "robust standard
  errors", "a robust estimator", "a comprehensive survey of the corpus", "a
  powerful test / a more powerful design". These are field terms; keep them. Cut
  only the vague brochure use ("a robust and comprehensive solution").
- **Three-item DATA enumerations** — listing three variables, three conditions,
  three datasets, or three measured quantities is reporting, not a "forced triad".
  Preserve. (Down-weight the controlled-asymmetry rule for *data* lists; it targets
  rhetorical triads, not enumerated facts.)
- **Numbered sections / subsections** (2.1, 3.4, §4.2) — standard scholarly
  navigation, not an AI template. Keep the numbering.
- **A single "This paper presents / examines / argues…" in an abstract** — a normal
  abstract convention. One such sentence is fine; only flag the *repeated*,
  every-paragraph "This section will discuss…" scaffolding.
- **"These results suggest" / "These findings indicate"** — calibrated inference
  language that links evidence to claim. This is exactly the hedging the protocol
  elsewhere tells you to preserve. Keep it.
- **Chinese genuine logical connectives** — 对……进行……分析 / 研究表明 / 这说明 /
  结果显示 / 由此可见, when they carry real logical work (introducing a method,
  reporting a finding, drawing an inference). These are standard 学术汉语. Strip only
  the *empty, repeated* frame use (e.g. every paragraph opening with 研究表明 to say
  nothing new).

> The point: real human academics write this way. A rewrite that scrubs "statistically
> significant", renumbers away "3.4", or deletes every "研究表明" has lowered the
> register and may have broken the claim — that is a regression, not a humanization.

## Prefer these transformations

- evaluation -> evidence
- uplift -> consequence
- noun-heavy clause -> concrete verb
- sloganized contrast -> direct claim
- mechanical paragraph frame -> tighter logic
- stacked hedging -> calibrated hedging
- bold lead-in list or report shell -> plain prose unless the list carries real analytical work

## Section-specific guidance

### Abstract

- Cut rhetorical warm-up.
- Lead with question, method, finding, or claim.
- Keep the compression high.

### Introduction

- State the problem directly.
- Remove generic "with the continuous development of..." openings.
- Keep only the background needed for the argument.

### Literature review

- Summarize positions, gaps, and disagreements concretely.
- Avoid generic consensus language unless the literature actually supports it.

### Analysis or discussion

- Make causal logic explicit.
- Prefer one precise inference over multiple padded paraphrases.
- Do not announce the analysis before doing it.

### Conclusion

- End with implication, limitation, next step, or forecast that is actually grounded.
- Avoid empty uplift.

### Reports and policy papers

- Keep section structure if it helps navigation, but avoid turning each subsection into a template heading plus bullet list.
- Prefer plain paragraph openings over management-report labels.

## What not to add

- slang
- banter
- ironic asides
- jokes
- forced first-person reflection
- rhetorical questions used only for flavor
- deliberate grammatical imperfections

## Mixed-language handling

- Keep established English technical terms when they are standard in the field.
- Do not over-translate institutional names or domain terms if the source uses the English form.
- Follow Chinese punctuation norms in Chinese sentences and English punctuation norms in fully English sentences.

## Stance and hedging are not opposites

Adding authorial stance (human-texture.md §1) does **not** mean removing hedging.
A committed academic claim is still *calibrated*: "the evidence indicates X" commits
to X while marking how strongly. Preserve hedges that carry epistemic meaning
(may / appears / likely / 可能 / 或许 / 倾向于); only collapse *stacked, empty*
hedging ("could potentially possibly" → "may"). Never convert a meaningful hedge
into false certainty to sound more "confident".

## When in doubt

Choose the clearer and more restrained phrasing, not the livelier one.
