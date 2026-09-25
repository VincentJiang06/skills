# Output contract: bottom-line-up-front, every claim cited

The answer must be **fast to read** and **self-consistent**. The deterministic
validator `scripts/check_answer.mjs` checks the structure of this contract. Its
**skeleton** codes (tier, confidence, answer, citation resolution, source bar,
sourced claim, uncertain → Low) mean the answer is malformed: fix it before emitting.
Its two **lexical hint** codes (`E_VOLATILE_NO_DATE`, `E_UNCERTAIN_NO_DISCLAIMER`)
guess meaning from words; fix the answer, or emit it with a stated reason (see below).

## Format (fill `assets/answer-template.md`)

```
**Tier:** simple | complex | uncertain
**Confidence:** High | Medium | Low

**Answer:** <the bottom line, one or two sentences, up front> [n]

**Key evidence:**
- <claim with its citation> [n]
- <claim with its citation> [m]

**Sources:**
1. <title / publisher> — <url>
2. <title / publisher> — <url>

**Caveats:** <only if needed — conflict, staleness, what could not be confirmed>
```

## Rules the validator checks

- **Tier** declared and one of `simple | complex | uncertain`.
- **Confidence** declared and one of `High | Medium | Low`.
- **Answer** present with **real content** — a bare citation marker like `[1]` is not
  a bottom line. The template places the Answer first.
- **Citations resolve** — every inline `[n]` in the body matches a numbered source; no
  dangling markers.
- **Per-tier source bar** — simple ≥ 1, complex ≥ 2 **distinct URL-bearing** sources
  (two entries that share a URL count once — same origin, not independent).
- **Sourced claim (structural)** — for simple/complex, the **Answer + Key-evidence**
  region carries ≥ 1 citation that resolves to a listed source. Markers that don't
  annotate visible prose do **not** count: a `[n]` only inside the Sources list, Caveats,
  a code span/block, a URL, or an HTML comment is ignored.

> **Scope — structural vs semantic traceability.** The validator enforces the
> *structural* contract above: a resolving, visible citation exists in the
> Answer/evidence. It cannot judge whether that citation actually *supports* the
> load-bearing claim (a deterministic checker can't tell a load-bearing cite from a
> trivial one). That *semantic* traceability — cite the claim that matters, separate
> observation from inference, never cite filler to launder an uncited bottom line — is
> the protocol's job (`rules/search-protocol.md` §6). Both layers are required; the
> script is the structural backstop, not the whole guarantee.
- **Uncertain → Low** — `Tier: uncertain` requires `Confidence: Low` (skeleton).
- **Volatile → dated** (`E_VOLATILE_NO_DATE`, lexical hint) — a time-sensitive fact
  (a version, price, office-holder, "current / latest" value) carries its as-of date.
- **Uncertain → honest** (`E_UNCERTAIN_NO_DISCLAIMER`, lexical hint) — an
  `uncertain` answer says plainly that it could not confirm the claim.

### Lexical hints: fix or state a reason

The two hint codes match words, not meaning, so they misfire both ways: "the
*current* through a resistor is V/R" fires `E_VOLATILE_NO_DATE` though nothing is
time-sensitive, while "Microsoft's CEO is Satya Nadella" is volatile and does not
fire; "I was not able to verify this" is an honest disclaimer that
`E_UNCERTAIN_NO_DISCLAIMER` misses. The rule is the meaning, not the regex: on a hint
code either fix the answer, or keep it and add one line under **Caveats** naming the
code and why it does not apply (e.g. "`E_VOLATILE_NO_DATE` does not apply: 'current'
is electrical current"). Date a volatile fact even when no code fires. Skeleton codes
are never overridden this way.

## Confidence calibration

- **High** — corroborated by the tier's bar from reliable, current sources, no
  unresolved conflict.
- **Medium** — corroborated but with a caveat: a single source on a volatile fact,
  a minor conflict, or slightly dated evidence.
- **Low** — thin or conflicting evidence; pair with a caveat. Required for
  `uncertain`.

## Self-check (Step 6)

Before emitting, re-read the answer against the rules above, or run
`node scripts/check_answer.mjs <answer.md>` on a saved copy. It is fast and catches
a missing citation, an absent confidence label, or a too-thin source list — the
cheap mistakes that undermine a fast answer's trustworthiness. `VALID` is structure
only: still read each `[n]` against the page it names and drop or replace any cite
that does not support its sentence.
