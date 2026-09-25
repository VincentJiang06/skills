# Gate design — what `verify_contracts.mjs` proves, and what it can't

The gate is **pure grep/heuristic and language-agnostic** by design (lightest,
broadest). That choice has a sharp consequence: it **cannot** prove the prose is
faithful, so it never pretends to. It does only what a deterministic check does
reliably, and **flags everything ambiguous for the agent** instead of guessing.

**The gate is the portable half.** `verify_contracts.mjs` is language-agnostic node
with no model dependency: the deterministic tie-to-code must run anywhere, be
re-runnable in CI, and never depend on a model's judgment. The agent and its fresh
readers do the judgment (derive, synthesize, reconcile, read for faithfulness,
adjudicate exclusions); the gate does the proof. Keep that split — don't push
judgment into the gate or proof into the agent. "Is this symbol a public interface?"
is a judgment: a public `def` and a package-internal helper look identical to the
extractor, so the gate only surfaces strong exclusions as REVIEW evidence.

Grounding: `principle.executable_acceptance` (the contract is only trusted once a
runnable check ties it to the code), `principle.claim_evidence_traceability` (every
documented symbol must trace to a real `file:line`), `anti_pattern.reward_hacking`
(a gate that rubber-stamps near-name matches or silently drops exports is hacking
its own check — so it refuses to; gaming by *exclusion* is judged by the exclusion
card, not here). KB: P13 / S14 / A49 / A50 (judgment planes, D-plane admission).

## The pure contract

```
validate({ contractText, files, scope, exclusions }) -> { ok, fails[], flags[], reviews[], coverage }
```

Pure, deterministic, idempotent (sorted outputs; no clock/random/state). Never
throws — malformed input returns `ok:false` with a named fail. `evals/run_all.mjs`
imports THIS function (not a copy), so the tests exercise the shipped logic.

`ok === (fails.length === 0 && flags.length === 0)`. **Flags block.** An
unreconciled flag is not a pass. `reviews[]` never affect `ok`, the exit code, or
coverage. A caller's `exclusions` override takes `{name, reason}` entries (a bare
string = no reason) and runs through the same reason grammar.

## The two surfaces it compares

- **Documented** — the `interfaces.md` table rows (`name`, `file:line`) + the
  intentionally-internal exclusions.
- **Extracted public surface** — names matched by export heuristics across common
  languages. Recognized JS/TS forms: `export [declare] function/const(multi-declarator + simple
  destructuring)/let/var/class/type/interface/enum/const enum`, `export default function`,
  `export default [abstract] class`,
  multi-line `export { a, b as c }` (+ `from` re-exports), `export * as ns from`,
  resolved `export * from './local'` (followed across files), `module.exports.x` /
  `exports.x` / computed `exports['x']`, `module.exports = <ident>` (strong export of that
  binding), `module.exports = { … }` and
  `Object.assign(module.exports, { … })` object literals (brace-balanced, multi-line,
  with getter/setter/async/generator members), and `Object.defineProperty(exports,
  'x', …)`. Plus Python top-level `def`/`class`, Go exported `func` and (in `.go` files) exported
  `type`, Java/C# `public` members, and weak top-level `function`. Not on the surface but
  accepted for a documented row: a column-0 assignment/declaration of the name exactly at
  the cited line (Python `app = FastAPI()`, Go `var X = …`) — existence, not publicness. `_`-prefixed names are private. Confidence
  is `strong` (explicit export) or `weak`.

## Verdicts

| Tag | Class | Plane | Means | Fix |
|---|---|---|---|---|
| `ORPHAN` | FAIL | D (skeleton) | documented symbol not defined anywhere in scope (not on the extracted surface, and its cited line does not assign/declare it at column 0), no near-name | open the cited line: a row you invented or misnamed → remove/rename it; a true definition in a form the extractor misses → keep the row and escalate with the form (protocol step 5), never delete a true row for a green gate |
| `BAD_SOURCE_REF` | FAIL | D (skeleton) | symbol exists but not at the cited `file:line` (or cited file absent) | fix the ref |
| `COVERAGE_HOLE` | FAIL | D (skeleton) | code exports a symbol that is neither documented nor excluded (or a same-named symbol in another file that no row cites) | document it (or exclude with a reason) |
| `EMPTY_CONTRACT` / `MALFORMED` | FAIL | D (skeleton) | no parseable rows/exclusions, or non-string input | author a real contract |
| `EXCLUSION_NEEDS_REASON` | FLAG | D (skeleton) | a *strongly-exported* symbol is listed intentionally-internal with no same-line reason | add the reason, or document it |
| `NEEDS_RECONCILE` | FLAG | D flag, resolved by L (carried) | documented name has no exact match but a near-name exists (likely typo/wrong symbol) | open the code, pick the right symbol, fix, re-run |
| `STAR_REEXPORT` | FLAG | D flag, resolved by L (carried) | `export * from '<external/missing>'` — re-exports an unenumerable surface (fail-closed, never a silent pass) | document the re-exported names explicitly; escalate if nothing clears it |
| `UNPARSED_EXPORT` | FLAG | D flag, resolved by L (carried) | an object-literal export member is unenumerable/unparseable — a spread `...x`, a computed `[k]` key, or anything not resolvable to a static name (fail-closed) | document the real re-exported name(s) explicitly |
| `STRONG_EXPORT_EXCLUDED` | REVIEW | D->L (evidence) | a strongly-exported symbol is listed internal with a reason; detail = its `file:line`(s) + the reason verbatim | fresh-reader exclusion card decides |
| `HIGH_EXCLUSION_RATIO` | REVIEW | D->L (evidence) | more than half of the extracted surface is listed internal (one line per run) | information for the reader and the user |

**Judgment ledger** (every judgment in a rebuild has exactly one final residence):

| # | Judgment | Plane | Executor | Backstop |
|---|---|---|---|---|
| J1–J4 | ORPHAN / BAD_SOURCE_REF / COVERAGE_HOLE / EMPTY·MALFORMED | D skeleton (existence, exact line, set difference) | `validate()` | `assets/golden/fail` + eval cases |
| J5 | a strong exclusion carries a same-line reason | D skeleton (presence only, says nothing about truth) | the one reason-grammar function | eval negatives + real-corpus grammar probe read by a non-author |
| J6 | NEEDS_RECONCILE near-name | D flag → L (agent fixes the name) | `validate()` + agent | clears only with an exact existing name |
| J7 | STAR_REEXPORT / UNPARSED_EXPORT | D fail-closed flag → L | `validate()` + agent | H via escalate when nothing clears it |
| J8–J9 | STRONG_EXPORT_EXCLUDED / HIGH_EXCLUSION_RATIO | D→L evidence, non-blocking | `reviews[]` | adjudicated by J10 / read by the user |
| J10 | is this excluded strong symbol a public interface | L | exclusion card, non-fork fresh reader (`protocol.md`) | H: unsure and overturn disputes go to the user |
| J11 | prose faithfulness of the three artifacts | L | fresh-reader pass | H: the user reads the contracts |
| J12 | nothing copied from legacy | L | author discipline + fresh reader | no similarity check (a semantic judgment) |
| J13 | rebuild vs sync; scope | L | agent | H: ask the user |
| J14 | deletion approval | H | the user applies the manifest | git |
| J15 | escalate conditions | L → H | agent (keeps the two-attempt count) | the user decides |
| J16 | derivation/reader isolation achieved | L self-report in the reply | agent | dev-time battery check |
| J17 | export-form recognition, strong/weak confidence | D feature extraction, not a verdict | extractor | consumed only by J3/J5/J8 |

## Which files the CLI reads

The CLI walks the project root (or the `--scope` dir) for code files. It skips, at
any depth, dirs that are never source: `node_modules`, `.git`, `__pycache__`,
`.venv*`, `venv`, `.uv-cache`, `site-packages`, tool caches, `.loop`, `.skill-*`.
Output-named dirs (`dist`, `build`, `coverage`, `vendor`, `target`, `out`) are
skipped only directly under the project root, so `src/build/` is read. Ignore files
are honored **through git only**: the walk skips exactly what
`git ls-files --others --ignored --exclude-standard` reports, i.e. untracked paths that
any ignore source matches (nested `.gitignore` files included). A tracked file is
always read, even when a pattern matches it (`git add -f`). When git gives no answer
(no repo, no git binary, or the root sits inside an ignored dir), no ignore file is
honored and the walk reads everything outside the dirs named above. When the root is
a subdirectory of a larger repo, that repo's ignore rules apply, so pass the real
project root. Nothing is skipped silently: the CLI prints a `not read:` line with the
skipped dir names and the git-ignored paths (first five). An extra file can only add
a visible `COVERAGE_HOLE`, never hide one. A file set the walk cannot express
(several roots, custom skips) is escalate (d) in `protocol.md`.

## Coverage threshold (not mere presence)

`coverage.ratio = (surface symbols that are documented OR excluded) / (surface
symbols)`. The gate passes only at **ratio 1.0** with zero flags. Matching is
**exact name** (Set membership), never substring — so `id` cannot "cover"
`uuid`/`idx`/`valid`. This is what stops a near-name false-positive from inflating
coverage. A name *strongly defined* (not an `export { … }` list alias, not a weak
function) in two or more files is two symbols: a row covers the file it cites plus
the files reached from it through `export { name } from` re-exports, and each
defining file no row reaches is its own `COVERAGE_HOLE` (detail names the file).
A name with one defining file (the usual barrel case) is covered by any row of that
name. Exclusions stay name-keyed: one exclusion covers every file's definition, and
its REVIEW line lists them all.

## What the gate canNOT do (the agent must)

- It cannot tell whether a signature or a described behavior is *true* — only that
  the symbol exists at the cited line. → the **fresh-reader pass** (in
  `references/protocol.md`) re-reads each artifact cold.
- It cannot tell whether an excluded strong symbol is really internal — the exclusion
  card does (J10).
- It cannot resolve a `NEEDS_RECONCILE` flag — by design. A near-name might be a
  typo or a genuinely different symbol; the gate refuses to guess and blocks until
  the agent (or a human) decides. This is the "flag candidates, the agent reconciles"
  contract, not a limitation to route around.
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
  When you meet an unrecognized export form or an unsupported language (e.g. Rust,
  Kotlin, Swift), do not trust the green and never edit the extractor during a user
  task: report the form to the owner as a proposal (form, example line, file) and
  escalate (`protocol.md` step 5). Supported today: the JS/TS forms above, Python
  top-level `def`/`class`, Go exported `func`/`type`, Java/C# `public` members, weak
  top-level `function`.

## Tracked metrics (asserted by the local `evals/run_all.mjs`)

- **gate-pass** — exits 0 only with 0 fails AND 0 flags.
- **coverage-ratio == 1.0** to pass.
- **near-name false-positive == 0** — every substring collision becomes a FLAG,
  never an auto-pass (case C3/C9).
- **idempotency == 100%** — repeated runs byte-identical, reviews included (case C6).
- **no coverage leak** — reviews never count as coverage (case C29).
