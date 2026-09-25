# Changelog — reorganize-logic

## 0.3.3 — 2026-09-25 — fix round 3 (owner-authorized): the fix-audit P1, 3 P2, 6 of 8 P3

Patch. The `interfaces.md` schema and the gate input format are unchanged. The
owner ruled on 2026-09-25 that the open defects be finished ("这七个你都继续去做把他们做完"),
which authorizes this third fix round under root CLAUDE.md iron rule 3. Each fix is
a skeleton (D-plane) change: file listing, existence, set difference. None judges
publicness. *KB A50: skeleton checks are exempt from (i); (ii) FP measured below.*

### Fixed — the gate (`scripts/verify_contracts.mjs`)
- **P1, the file walk honors ignore rules through git only.** 0.3.1 parsed the root
  `.gitignore` by hand and skipped every match, so a tracked file the pattern
  matched (`git add -f`) was never read and the gate printed PASS over an
  undocumented export. The walk now skips exactly what
  `git ls-files --others --ignored --exclude-standard` reports: untracked paths
  that any ignore source matches, nested `.gitignore` files included. A tracked
  file is always read. With no git answer (no repo, no git, root inside an ignored
  dir) no ignore file is honored, so the walk reads. The hand-written parser is
  removed. Every skip is printed on a `not read:` line (dir names, then the first
  five git-ignored paths). This also closes the P3s "nested `.gitignore` not read"
  and "venv/cache dirs skipped without a report".
  *Principle: README "fail-closed: unknown → block, never silent-skip"; gate-design
  "no exported symbol silently dropped".*
- **P2, CommonJS barrels.** CommonJS assignment forms (`exports.x =`,
  `module.exports.x =`, `module.exports = x`, `module.exports = { x }`,
  `exports['x'] =`, `Object.defineProperty(exports, 'x')`) bind a name and may
  re-export an import. Like an `export { }` list member, they no longer split a
  name into per-file symbols, so a CommonJS barrel needs no duplicate row. They
  stay on the surface (strong, coverable, reviewable). A CommonJS name is
  name-keyed, as in 0.2.1. *Principle: gate-design
  principle.claim_evidence_traceability (a re-export traces to the definition it
  re-exports).*
- **P2, anonymous default class.** `export default class extends X` (also
  `implements`) no longer yields a symbol named `extends`. An anonymous class has
  no name and is not extracted, as in 0.2.1. *Principle: SKILL.md "No untrue
  contract for a green gate" (no bogus row forced).*
- **P2, docs vs code.** `export declare function` and `export [declare] namespace`
  are extracted. gate-design already listed the declare form. *Principle:
  gate-design anti_pattern.reward_hacking (never silently drop a listed form).*
- **P3.** A `.d.ts` declaring a twin source file is not a second defining file. A
  TS NodeNext specifier `./x.js` resolves to `x.ts` / `x.tsx`.
  `module.exports = null|undefined|true|false|this` names nothing. A documented
  row whose cited line sits inside a Python triple-quoted string (a docstring
  example) is no longer accepted by the cited-line check. That check uses a small
  lexical scan; an earlier cut used a triple-quote parity count and misjudged real
  code, so it was replaced before commit.

### Changed — prose
- gate-design.md: "Which files the CLI reads" rewritten for the git-decided walk;
  coverage identity names CommonJS bindings and `.d.ts` twins; recognized-forms
  list updated.
- contract-format.md: CommonJS barrels and `.d.ts` twins need no second row.
- protocol.md: the compaction re-read list now includes `_exclusion-review.md`,
  matching SKILL.md (battery F19). *Principle: SKILL.md "Survive compaction from disk".*

### Evidence (run dir `battery/fix3/`, record `battery/FIXES-R3.md`)
- Red first: C34–C37 fail on 465e47d (`red-log-final.txt`); evals 37/37 now. Carried
  assertions are untouched. C31's fixture gained `git init`, because `.gitignore`
  is now honored through git.
- Mutation: 15 single-point mutants of the new code, all killed (`mutation-log.txt`).
  The docstring scan agrees with Python's `tokenize` on all 15,700 column-0
  assignment lines in 2,877 real `.py` files under ~/playground and ~/experiment:
  305 are inside strings, and there are 0 disagreements.
- Real corpus (8 corpora + academic wrapper): 7 corpora and the wrapper have
  byte-identical output apart from the new `not read:` line. manualwork/archive/v1
  has 387 → 359 holes. The 28 dropped holes are from `scratch_manuals/`, which the
  enclosing repo's `archive/v1/*` rule ignores and git does not track, and the
  skip is reported. No corpus has a tracked code file skipped that 0.2.1 read.
- Audit P1 repro (`p1-repro.txt`): 0.3.2 PASS exit 0; 0.2.1 and 0.3.3 FAIL
  `COVERAGE_HOLE publicHelper` exit 1.

### Still open
- Fix-audit P3: grouped Go `type ( … )` blocks are not parsed (0.2.1 read no Go
  `type` at all); the printed `extracted`/`ratio` count names, not (name, file)
  symbols (cosmetic).
- Battery P3 carried from 0.3.0 and present in 0.2.1: F03, F09, F10, F11, F13, F14,
  F15, F16, F17, F18, FLAG6.
- E11 stays inconclusive (bare model more complete in all 3 cases); independence
  is instance tier only.

## 0.3.2 — 2026-09-25 — release record: E11, battery, fix audit, open defects (docs only)

Patch, documentation only. `scripts/verify_contracts.mjs` and the local evals are
byte-identical to 0.3.1 (86cb8c8). This entry records the evidence for the R20
upgrade (0.3.0 + 0.3.1) and the defects still open. Both READMEs gain a
"Known limitations" section. **The fix audit found a P1 inside the 0.3.1 fix.
Iron rule 3 fired, so no further fix was made. The owner decides the next step.**
*Principle: KB O5 (the written verdict never exceeds the battery); root CLAUDE.md
iron rule 3 (stop and report when a P0/P1 is found in this round's own fix);
P11 (settle both ways: the claims 0.3.1 made that the audit disproved are
withdrawn below).*

### Open defects in 0.3.1 (fix audit, not fixed)
- **P1, F02 walk.** The walk skips every file the project-root `.gitignore`
  matches, including files git still tracks (added with `git add -f`, or committed
  before the pattern). Their exports are never read, so no `COVERAGE_HOLE` is
  raised and the gate prints PASS. Repro: `.gitignore` = `src/*.js`, tracked
  `src/shim.js` exporting `publicHelper`, contract documents only `api`. 0.3.1:
  PASS, exit 0. 0.3.0: FAIL `COVERAGE_HOLE publicHelper`. This withdraws the 0.3.1
  claim "When unsure, the walk reads" for `.gitignore`-matched files.
- **P2, F01 × CommonJS barrels.** The alias closure only follows ESM
  `export { x } from`. A CommonJS re-export (`exports.foo = require('./lib/foo')`,
  `module.exports = { Foo }`) counts as a second defining file, so one symbol
  raises a false `COVERAGE_HOLE`, and the only green path is a duplicate row. This
  withdraws the 0.3.1 claim that the remaining new holes are distinct same-named
  exports: this false-positive class was not measured.
- **P2, F04 anonymous default class.** `export default class extends Controller`
  (every Stimulus controller) yields a strong export named `extends`; same for
  `implements`.
- **P2, docs vs code.** gate-design.md lists `export [declare] function`, but the
  function matchers have no `declare` form. `export declare function foo()` and
  `export declare namespace NS` are dropped silently, and because the docs list
  the form, the escalate path for unrecognized forms does not fire.
- **P3 (8):** a column-0 `name =` inside a docstring or comment satisfies the
  cited-line check; `.js` specifiers in TS NodeNext barrels do not resolve to
  `.ts`, so a false hole appears; a hand-written `.d.ts` beside `.js` needs two
  rows; nested `.gitignore` files are not read, so `packages/*/dist` is walked and
  becomes a second defining file; `module.exports = null/undefined/true` yields a
  literal-named export; `venv`/`.next`/`.cache` dirs are skipped at any depth with
  no report of what was skipped; grouped Go `type ( … )` blocks are dropped; the
  printed `extracted`/`ratio` still count names, not (name, file) symbols.
- **Battery P3 carried from 0.3.0 (13):** F03 (zero surface = PASS), F09
  (boundary depends on `--scope`), F10 (pytest `test_*` treated as surface), F11
  (no CLI-path eval before C31; C22 map differs from the scoped CLI), F13 (star
  chain depth cut-off fails open; 0.5 ceiling uncalibrated), F14 (STAR/UNPARSED
  cannot be cleared by documenting), F15 (scope-relative Source paths documented
  but rejected), F16 (stale or documented∩excluded exclusions pass silently), F17
  (exports inside comments are extracted), F18 (copy-pasted eval edge labels), F19
  (protocol.md compaction re-read list omits `_exclusion-review.md`), FLAG6 (the
  Python `class` matcher fires on JS files).

### E11 two-arm result (run on 0.3.0, low tier, 3 cases)
Both arms: `claude -p`, Opus 5.5 high, Skill tool disallowed. WITH = told to read
the worktree copy of the skill. Independent fixture copies, prepared before
launch. The judge was a fresh session reading full files. Labels were unblinded
after judging.

| Case | Fixture | Verdict | Why |
|---|---|---|---|
| 1 | CityRankIndex (Python, 114 strong) | WITH better, narrow | WITH: 122/122 def rows at exact lines, no error found, legacy untouched behind a deletion manifest, found 2 real defects (`score_median` undefined at `city_score_gptr.py:477`; monitor ref bug at `city_monitor.py:215`). WITHOUT: far more complete (217 callables, constants, env vars) but documents the broken `--rescore` as working, and rewrote README plus 3 legacy docs in place unasked. |
| 2 | deep-scan Fastify API (JS, 354 strong) | WITHOUT better | Both faithful. WITHOUT: deeper, correct architecture, ~900 generated symbols, security findings (`/auth/login` has no auth hook; two error codes share 100409). WITH: accurate but thinner (52 endpoints, 335 gate-checked rows). |
| 3 | Paper Graph `src/paperproof` (Python, 378 strong) | WITHOUT better, moderate | Neither arm had an error. WITHOUT: deeper architecture and a full API reference with a `--check` drift mode. WITH: 278 public rows plus 118 internals, each with a reason; stronger public/internal adjudication. |

Pre-registered verdict: 1 win, 2 losses, so **inconclusive** (not uplift, and not
delta≈0, so no retire recommendation). WITH had no fidelity error in any case and
never edited legacy docs. WITHOUT had one error in case 1, rewrote README plus 3
legacy docs unasked in case 1, and edited 2 AGENTS.md rows in case 2. Bare Opus
5.5 high was more complete in all three cases. Cost, in tool calls: WITH ~65 plus
4 reader sessions against ~47 (case 1), ~65 against ~56 (case 2), ~72 against ~44
(case 3). Deviations: tokens and wall clock were not captured (COST.txt empty), and
the scripted m1/m2 metrics were replaced by the judge's line-accuracy check.

### Battery (round 1 on 0.3.0, instance tier)
Seeds 5/5 hit, one per lens. Confirmed: 4 P2 (F01, F02, F04, F05; fixed in 0.3.1)
and 13 P3 (open, listed above). 1 refuted. No P0/P1 in 0.3.0. The fix audit of
0.3.1 found the 1 P1, 3 P2 and 8 P3 listed above.

### Independence and model deviation
Every role, including the attacker, the adjudicator, the E11 judge and the fix
auditor, was Opus 5.5 high in a fresh context. This is **instance tier**, not
model tier. It deviates from the skill-creator-max model policy of 2026-09-13
(builder Fable, evaluators Opus), by the owner's order of 2026-09-25.

### Verdict
Effective verdict **draft**: an open P1 contradicts the gate's anchor claim that no
recognized export is silently dropped. Owner options are in the R20 decision
record (for example, revert only the root-`.gitignore` skip from 29e0e08 and keep
the rest of 0.3.1).

## 0.3.1 — 2026-09-25 — battery fix round: four extractor/coverage holes (P2)

Patch: the gate now meets guarantees it already claimed ("no recognized export
silently dropped", "every row ties to ITS file:line"). The `interfaces.md` schema
and the gate input format are unchanged. **Stricter:** a contract that passed 0.3.0
can now FAIL where it hid a real gap (real case: a miscited `apply` row and an
undocumented same-named `sha256` in academic-research-plugin). All four are
skeleton (D-plane) checks: existence, set difference, file listing. None judges
publicness. *KB A50: skeleton checks are exempt from (i); (ii) FP measured below.*

### Fixed — the gate (`scripts/verify_contracts.mjs`)
- **F01 coverage keyed by (name, defining file).** A name *strongly* defined in two
  or more files is that many symbols. A row covers the file it cites, plus files
  reached from it through `export { name } from` re-exports. Every defining file
  that no row reaches gets its own `COVERAGE_HOLE`, and the detail names the file.
  A name with one defining file (barrels), weak same-named helpers and plain
  `export { x }` lists keep name-level coverage. Exclusions stay name-keyed.
  *Principle: gate-design.md principle.claim_evidence_traceability.*
- **F02 file walk.** Output-named dirs (`dist`, `build`, `coverage`, `vendor`,
  `target`, `out`) are skipped only under the project root. Before, any depth
  matched, so `src/build/index.js` went unread and the run printed PASS. The walk
  now also skips `.venv*`, `venv`, `.uv-cache`, `site-packages` and tool caches at
  any depth, plus whatever the project-root `.gitignore` ignores (git semantics for
  that one file). When unsure, the walk reads.
  *Principle: README "fail-closed: unknown → block, never silent-skip".*
- **F04 missed definitions.** New forms recognized: `export default [abstract]
  class`, `export declare …`, `export [declare] const enum X` (no bogus `enum`
  symbol), and Go exported `type` (`.go` files only). A documented row whose cited
  line assigns or declares the name at column 0 (Python `app = FastAPI()`, Go
  `var X = …`) now counts as tied to real code: existence at the exact line, not
  added to the surface. *Principle: SKILL.md "No untrue contract for a green gate".*
- **F05 `module.exports = <ident>`** is now a strong export of that binding. Before,
  a reasonless exclusion of a module's sole API raised no flag and no review.
  *Principle: gate-design.md anti_pattern.reward_hacking.*

### Changed — prose
- ORPHAN fix (gate-design table, protocol step 5): remove or rename a row you
  invented or misnamed. Keep a true row whose form the gate misses and escalate.
  Never delete a true row to get a green gate. *Principle: SKILL.md Controls
  (unrecognized form → owner proposal + escalate).*
- contract-format.md: same name in two files = two rows. gate-design.md: new
  "Which files the CLI reads" section, the coverage identity rule, and the
  recognized-forms list.

### Evidence (run dir `battery/fix/`)
- Red first: C30–C33 failed on 3b6d5fd (`red-log.txt`). They pass now; evals 33/33.
  Every carried assertion is untouched.
- Mutation: 13 single-point mutants of the new code. Each one turns a case red.
- Real corpus (8 corpora + academic wrapper + dnsprobe), every changed line
  classified in FIXES.md.
  - F04: +28 TP (`export default class` services).
  - F01: first cut had 2 FP classes (weak helper, plain export-list re-export),
    fixed before commit. The remaining new holes are distinct same-named exports.
  - F02: manualwork 92,857 → 491 extracted, academic whole-tree 3,993 → 56 holes,
    dnsprobe 4,012 → 203.
  - F05: form absent from the corpus. The 482 hits across ~/playground and
    ~/experiment are all real whole-module exports.
- Growth vs the 0.2.1 baseline (A51(ii)): gate 566 → 678 (+20%), evals 438 → 609
  (+39%), cases 26 → 33 (+27%).
- Not fixed this round: battery P3 set (F03, F09–F11, F13–F19, FLAG6), recorded in
  `battery/ADJUDICATION.md`.

## 0.3.0 — 2026-09-25 — judgment off the gate, model-neutral orchestration

Minor: the `interfaces.md` table schema and the gate input format are unchanged, and
every contract that passed 0.2.1 still passes. `validate()` gains an additive
`reviews[]` output; two tags are retired.

### Changed — the gate (`scripts/verify_contracts.mjs`)
- **CONTRADICTION retired.** It turned a semantic question ("is this symbol a public
  interface?") into a terminal FAIL. Witness pair: `pkg/api.py def fetch` (public)
  and `pkg/util.py def load_config` (package helper) look identical to the extractor,
  so the only ways to pass were an untrue contract or editing code — and field runs
  did both (manualwork documented every helper as public; three projects copy-edited
  the gate). Now a strong-export exclusion needs a **same-line reason** (presence
  only → `FLAG [EXCLUSION_NEEDS_REASON]` when missing) and becomes a non-blocking
  `REVIEW [STRONG_EXPORT_EXCLUDED]` for the fresh-reader exclusion card.
  *Principle: KB P13 / S14 / A50(i) (a check with a witness pair may only produce
  evidence, not a verdict); skill-own gate-design.md "don't push judgment into the
  gate", SKILL.md "code is the only source of truth".*
- **EXCESSIVE_EXCLUSIONS retired.** A 0.5 threshold on design intent (1 API + 2
  helpers ⇒ FAIL). Now one non-blocking `REVIEW [HIGH_EXCLUSION_RATIO]`, same
  numerator/denominator. *Principle: P13 / A50(i); D→L evidence.*
- One reason grammar serves both the parsed contract and the caller `exclusions`
  override (`{name, reason}`; bare string = no reason). *Principle: A51(iv) (no second
  implementation of the same rule).*
- CLI prints `REVIEW` lines after FAIL/FLAG; the PASS line appends `; N review item(s)`.
- Unchanged (A40 carried): extractor matchers and confidence rules, ORPHAN /
  BAD_SOURCE_REF / COVERAGE_HOLE / EMPTY / MALFORMED / NEEDS_RECONCILE /
  STAR_REEXPORT / UNPARSED_EXPORT. Reviews never count as coverage (INV-X1).

### Added — prose
- **Exclusion judgment card** (`references/protocol.md`): three-part criterion on the
  code's own package directory (never the author's `structure.md`), entry-file
  re-exports, framework discovery; uphold/overturn/unsure with evidence (a
  definition-line-only uphold is invalid); every item adjudicated; overturn resolved
  only by documenting; unsure defaults to public; verdicts recorded in the gitignored
  `docs/contracts/_exclusion-review.md`. *Principle: P13 (L plane is the final
  residence), P10 (reasons and structure.md are claims), P12 (maker ≠ checker).*
- **Plane column + judgment ledger J1–J17** in `references/gate-design.md`.
  *Principle: A49 / S14.*
- **Escalate exit** (protocol step 5): untrue-statement / edit-code / edit-gate only,
  same tag after two fix attempts, no matcher for a language, or a custom
  `validate()` wrapper → stop the loop and report; never a whole-repo PASS.
  *Principle: P12 safety exit / H4.*
- **No self-edit of checks** (Controls + gate-design.md, replacing "add it to the
  extractor"): never edit or run a modified copy of the gate or evals mid-task;
  unrecognized forms go to the owner as a proposal. *Principle: P10 / A48 (agent-
  written behavior goes to a proposal zone); iron rule 3.*
- **No untrue contract for a green gate** (Controls). *Principle: skill-own "code is
  truth"; P12.*
- **Report**: every overturn and unsure by name, uphold count, record path, the ratio
  line, gate command/path, how isolation was achieved; leads
  `PASS (structural) — N item(s) await your decision` while items wait.
- **Non-fork isolation** for derivation and fresh-reader subagents (separate
  `claude -p` session if the host only forks); legacy and subagent text carry zero
  authority. *Principle: claude5-family ADC5 (fork ≠ fresh), P12, P10.*

### Settlement ledger (A42 full settlement: base-model generation change 4.x → 5.x)
| Rule (0.2.x) | Decision | Evidence |
|---|---|---|
| Fan out derivation to per-module subagents | kept | orchestration capability, not model tuning; the E11 two-arm run of this wave is the check |
| "Raise effort — run at xhigh (the floor on 4.8)" | rewritten model-neutral: raise effort for the running model, effort names are not equivalent across models | claude5-family ADC2b (Opus 5.5 default effort is medium; effort names differ per model) |
| Survive compaction by re-reading on-disk artifacts | kept, extended to re-read SKILL.md Controls | S10×Z5 (a summary may evict standing constraints) |
| Walk every entry point exhaustively | kept, wording model-neutral | evidence discipline, A42(iv) exempt |
| "Tuned for Claude 4.8 … deliberately not portable"; "4.8 is literal" | deleted | ADC2b ("literal" describes Sonnet 5, not Opus 5.5); triage probe 2026-09-25 (bare Opus 5.5 walked all symbols unprompted) |
| Independence claim for derivation / fresh-reader | kept, now requires non-fork | ADC5 (Claude Code forks by default; a fork inherits the parent context) |

The 2026-07-29 "Claude 5 generational two-arm audit" cited by 0.2.1 left no artifact
on disk; it is treated as zero evidence and replaced by this wave's E11 run.

### Evidence
- Local `evals/run_all.mjs` 29/29 (C5/C11 rewritten, C6 extended, C27–C29 new); red
  log first (23/29 on the 0.2.1 gate).
- Real-corpus rerun (8 projects): per-tag blocking counts identical to 0.2.1; zero
  REVIEW lines; the academic-research-plugin wrapper still PASS. Reason-grammar probe
  over 387 real exclusion lines (32 unique): all reason-present, judged 32/32 correct
  by a non-author reader.

## 0.2.1 — 2026-07-29 — process evidence goes in the reply

- `references/protocol.md` Report: the gate result, reconciled flags and the pending
  manifest are handed back **in the reply, never inside the written artifacts** — a
  field contract had ended with a `## Gate` section and contradicted itself about
  `__init__` (commit 7395daf). Recorded retroactively in 0.3.0.

## 0.2.0 — 2026-07-02 — Claude-native orchestration

Specialized the skill for **Claude 4.8 in Claude Code**. The deterministic gate
(`verify_contracts.mjs`) is unchanged and stays portable, language-agnostic node —
that split is now explicit. Everything Claude *judges* leans on Claude-only strengths:

### Added
- **Subagent fan-out for derivation** (`references/protocol.md` step 2): an Explore
  subagent maps entry points, then one derivation subagent per module runs in
  parallel — each seeing only its module's code, never the legacy docs. This keeps
  the *derivation layer* legacy-blind (a subagent that never read the legacy can't
  copy it — scope honestly bounded, see the battery note below) and scales the
  expensive step.
- **Delegated fresh-reader pass**: a fresh subagent per artifact/module checks prose
  faithfulness against the cited code (maker ≠ checker — the deriving thread grading
  its own output is not independent).
- **Effort-as-lever, compaction-survival, 4.8 literalism** notes: run derive +
  architecture synthesis at xhigh; re-read on-disk artifacts after a compaction; walk
  every entry point exhaustively (4.8 won't infer an unlisted interface).
- A "Built for Claude" section in SKILL.md making the portable-gate / Claude-judgment
  split explicit.

### Changed
- Vendor-neutral "the agent" → "Claude" in `gate-design.md` / `protocol.md`; the gate
  is documented as the portable half, the orchestration as the Claude-native half.

### Unchanged
- `verify_contracts.mjs` and its 26-case adversarial battery (still green); the
  contract format, coverage gate, fail-closed flags, and review-gated deletion.

### Validated + hardened by an independent opus-4.8 xhigh battery (same day)
Fresh audit + adversarial + behavioral agents (executor=judge=opus-4.8 xhigh):
**behavioral** — a fresh actor planned the 6-module rebuild 6/6 on the judge rubric
(Explore → parallel per-module derivation with legacy withheld, xhigh compose,
disk-based compaction recovery, delegated fresh-reader); **audit** — no P0/P1, the
"26 cases" claim re-verified by an actual run; **adversarial** — built a real
star-reexport fixture and ran the gate: the whole-tree read provably backstops the
per-module split (forgotten re-export → `COVERAGE_HOLE`; barrel-site attribution →
`BAD_SOURCE_REF`). Two P2s found and fixed same-day:
- **"Engineered independence" was overclaimed**: the withholding protects the
  *derivation layer* (which the gate re-verifies against code anyway), not the final
  prose — the composing main thread HAS read `_legacy-context.md`. protocol.md +
  SKILL.md now scope the claim honestly (prose guard = authoring-from-code + the
  delegated fresh-reader; the withholding is a prompt convention, unlike the attacker
  sibling's validator-enforced independence).
- **Compaction recovery didn't name its actor** one paragraph below the subagent
  legacy-ban: now explicitly a main-thread-only action (derivation subagents are
  short-lived and stay legacy-blind regardless).
Deterministic gate battery re-run after fixes: 26/26.
