# Gate design — what `verify_contracts.mjs` proves, and what it can't

The gate is **pure grep/heuristic and language-agnostic** by design (lightest,
broadest). That choice has a sharp consequence: it **cannot** prove the prose is
faithful, so it never pretends to. It does only what a deterministic check does
reliably, and **flags everything ambiguous for the agent** instead of guessing.

Grounding: `principle.executable_acceptance` (the contract is only trusted once a
runnable check ties it to the code), `principle.claim_evidence_traceability` (every
documented symbol must trace to a real `file:line`), `anti_pattern.reward_hacking`
(a gate that rubber-stamps near-name matches is hacking its own check — so we
refuse to).

## The pure contract

```
validate({ contractText, files, scope, exclusions }) -> { ok, fails[], flags[], coverage }
```

Pure, deterministic, idempotent (sorted outputs; no clock/random/state). Never
throws — malformed input returns `ok:false` with a named fail. `evals/run_all.mjs`
imports THIS function (not a copy), so the tests exercise the shipped logic.

`ok === (fails.length === 0 && flags.length === 0)`. **Flags block.** An
unreconciled flag is not a pass.

## The two surfaces it compares

- **Documented** — the `interfaces.md` table rows (`name`, `file:line`) + the
  intentionally-internal exclusions.
- **Extracted public surface** — names matched by export heuristics across common
  languages. Recognized JS/TS forms: `export function/const(multi-declarator + simple
  destructuring)/let/var/class/type/interface/enum`, `export default function`,
  multi-line `export { a, b as c }` (+ `from` re-exports), `export * as ns from`,
  resolved `export * from './local'` (followed across files), `module.exports.x` /
  `exports.x` / computed `exports['x']`, `module.exports = { … }` and
  `Object.assign(module.exports, { … })` object literals (brace-balanced, multi-line,
  with getter/setter/async/generator members), and `Object.defineProperty(exports,
  'x', …)`. Plus Python top-level `def`/`class`, Go exported `func`, Java/C# `public`
  members, and weak top-level `function`. `_`-prefixed names are private. Confidence
  is `strong` (explicit export) or `weak`.

## Verdicts

| Tag | Class | Means | Fix |
|---|---|---|---|
| `ORPHAN` | FAIL | documented symbol not defined anywhere in scope, no near-name | remove/rename the row |
| `BAD_SOURCE_REF` | FAIL | symbol exists but not at the cited `file:line` (or cited file absent) | fix the ref |
| `COVERAGE_HOLE` | FAIL | code exports a symbol that is neither documented nor excluded | document it (or exclude with reason) |
| `CONTRADICTION` | FAIL | a *strongly-exported* symbol is listed intentionally-internal | document it instead |
| `EXCESSIVE_EXCLUSIONS` | FAIL | >50% of the surface is excluded — gaming coverage | document the interfaces |
| `EMPTY_CONTRACT` / `MALFORMED` | FAIL | no parseable rows/exclusions, or non-string input | author a real contract |
| `NEEDS_RECONCILE` | FLAG | documented name has no exact match but a near-name exists (likely typo/wrong symbol) | open the code, pick the right symbol, fix, re-run |
| `STAR_REEXPORT` | FLAG | `export * from '<external/missing>'` — re-exports an unenumerable surface (fail-closed, never a silent pass) | document the re-exported names explicitly |
| `UNPARSED_EXPORT` | FLAG | an object-literal export member is unenumerable/unparseable — a spread `...x`, a computed `[k]` key, or anything not resolvable to a static name (fail-closed) | document the real re-exported name(s) explicitly |

## Coverage threshold (not mere presence)

`coverage.ratio = (surface symbols that are documented OR excluded) / (surface
symbols)`. The gate passes only at **ratio 1.0** with zero flags. Matching is
**exact name** (Set membership), never substring — so `id` cannot "cover"
`uuid`/`idx`/`valid`. This is what stops a near-name false-positive from inflating
coverage.

## What the gate canNOT do (the agent must)

- It cannot tell whether a signature or a described behavior is *true* — only that
  the symbol exists at the cited line. → the **fresh-reader pass** (in
  `references/protocol.md`) re-reads each artifact cold.
- It cannot resolve a `NEEDS_RECONCILE` flag — by design. A near-name might be a
  typo or a genuinely different symbol; the gate refuses to guess and blocks until
  a human/agent decides. This is the "flag candidates, agent reconciles" contract,
  not a limitation to route around.
- Its export heuristics cover a wide set of forms (listed under *Extracted public
  surface* above) but are **not exhaustive** — that is inherent to a pure-grep,
  language-agnostic extractor. Two safety properties bound the risk:
  - **Fail-closed where detectable.** The two constructs whose surface is genuinely
    unenumerable by grep — `export * from '<external>'` and an unparseable object
    member — raise a blocking **FLAG** (`STAR_REEXPORT` / `UNPARSED_EXPORT`), never a
    silent pass. An unrecognized form there *blocks*, it doesn't leak.
  - **Scoped guarantee + mandatory backstop.** The "no exported symbol silently
    dropped" guarantee holds **for the recognized forms**. For anything beyond them,
    the **fresh-reader pass** (re-reading the code's entry points against the
    contract — mandatory, see `references/protocol.md`) is the completeness backstop.
  When the agent meets an unrecognized export form, add it to the extractor (with a
  regression case) rather than trusting a green. This is the documented limit of a
  pure-grep gate — not a defect to route around.

## Tracked metrics (asserted by `evals/run_all.mjs`)

- **gate-pass** — exits 0 only with 0 fails AND 0 flags.
- **coverage-ratio == 1.0** to pass.
- **near-name false-positive == 0** — every substring collision becomes a FLAG,
  never an auto-pass (case C3/C9).
- **idempotency == 100%** — repeated runs byte-identical (case C6).
