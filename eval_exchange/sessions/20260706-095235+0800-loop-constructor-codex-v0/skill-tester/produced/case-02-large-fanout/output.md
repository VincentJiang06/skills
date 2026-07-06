# case-02-large-fanout — loop-constructor-codex run

Runtime: OpenAI Codex CLI. Altitude: **large** (parallel fan-out).

## SELECT — decision log (D0–D6)

- **D0 — loop.** Per-module done is machine-decidable: that module's tests pass under ESM
  AND an AST residual scan finds zero CJS constructs; cutover done = whole suite + build +
  repo-wide scan exit 0.
- **D1 — staged (2 seam types).** characterize → (green `cjs-baseline` tag + module
  manifest) → conversion shards → (converted+green module sets) → cutover. Shards edit
  disjoint files; each shard's check runs without cutover; cutover consumes converted
  modules unchanged ⇒ seam test holds.
- **D2 — patterns.** characterize=`explore_narrow` (enumerate graph + pin baseline);
  convert_shard_*=`retry` (mechanical per-module transform, test+scan gated);
  cutover=`plan_execute_verify` (risky whole-repo flip).
- **D3 — on_the_loop.** Reversible per worktree; each shard's check discriminates ⇒ human
  reviews at merge/cutover gates. Cutover (the one high-blast step) is reviewed before it
  lands.
- **D4 — large.** The ~40 modules are largely independent ⇒ many stage-pairs (the shards)
  with no dependency path between them benefit from concurrent agents with no shared-write
  conflict. Realized as concurrent `codex exec` processes, each in its own git worktree,
  coordinating only through a shared on-disk ledger; a final gate stage merges + runs the
  whole-suite check.
- **D5 — caps + restart + escalate.** Each shard cap 8, `on_failure: restart` (discard the
  worktree, re-derive from the manifest — a half-converted module is archaeology);
  cutover cap 3 → loopback characterize; outer escalate on an unresolvable import cycle.
- **D6 — iteration_first** (per shard: many short passes, fast test+scan). cutover is a
  completeness-first exception (cap 3, thorough whole-suite+build) — recorded per-stage.

## NEGOTIATE — roles + contract

**Roles** — planner (shards the graph + writes manifest/contract, never converts);
generator (converts one shard's modules in its worktree, may not touch another shard or
grade itself); **evaluator** `separate_context:true`/`adversarial:true` — fresh read-only
`codex exec` given only the merged diff + `contract.md`, hunts cross-shard breakage,
extensionless imports, a shared helper converted two ways, manifest omissions.

**Contract** — 10 assertions: A1 baseline green+pinned; A2 manifest covers every CJS
module; A3–A5 per-shard ESM+green+zero-residual; A6 disjoint worktree surfaces
(cross-cutting); A7 build under type:module; A8 whole suite green; A9 repo-wide zero
residual; A10 explicit import extensions. Stage-traced, machine-gradable.

## VERIFY — linter + fresh-reader

**Linter:** `node skills/loop-constructor-codex/scripts/lint_loop_design.mjs
eval_exchange/.../case-02-large-fanout/design.json` → **all PASS, exit 0** (18 PASS lines,
`0 fail(s)`). Five stages, acyclic: three shards depend only on characterize and fan out;
cutover depends on all three.

**Fresh-reader verdict:** PASS.
- Fan-out is genuine: shards A/B/C have no dependency path between them, disjoint surfaces
  (A6), coordinate only via the ledger — matches D4=large honestly.
- residual scans are AST-based over the whole CJS class (require / module.exports /
  __dirname / createRequire), not a single token — the `passing_but_wrong` traps
  (token-only grep, test-not-run-under-ESM, extensionless import) are ruled out by the
  strengthened checks.
- cutover runs the WHOLE suite (not per-shard), so a cross-shard merge breakage surfaces
  before it lands — the merge-conflict `passing_but_wrong` is closed.
- restart routing is correct (a stuck shard discards its worktree, no human interrupt).
- Cadence honest: iteration_first shards (cap 8, retry) + a completeness-first cutover
  exception (cap 3, thorough) — the mixed profile is recorded per-stage.

## PERSIST — rendered runbook

`.loop/migrate-40-independent-node-modules-from-commonjs-to-esm-in.loop.{md,json}`. The
runbook carries the **"How to run this loop (Codex CLI)"** preamble AND (because
altitude=large) an orchestration block describing **concurrent `codex exec` processes in
git worktrees coordinating through the on-disk ledger**, evaluator as a fresh read-only
`codex exec`. grep confirms: `codex exec`, `worktree`, `ledger/run-state`, `concurrent` all
present.

## DOGFOOD FINDING — NB-1 (FIXED)

Original finding: the `large` orchestration preamble the **renderer itself** emitted
contained the phrase "(Codex has no in-process subagents)", so a case-insensitive
`/subagent/i` grep over any large-altitude runbook matched — and the skill's own eval
`C42_no_claude_primitives` only rendered the flat + medium goldens, never the large path,
so its own regex would have flagged its own large output.

Fixed pre-release (still 0.1.0): the preamble was reworded to carry no banned token
("Codex is single-agent, so fan-out is N concurrent OS processes, not in-process
spawning"), a passing large-altitude golden was added, and C41/C42 now render it too.
This runbook was re-rendered with the fixed renderer — a `/subagent/i` (and full
banned-token) grep over it now returns **0 hits**. See `skill-tester/notes.md` (NB-1
marked FIXED). The SESSION.json case-02 expectation is now a clean zero-banned-token
check.

## Bottleneck (LOOPS.md §IX)
Weakest link = **verification at the merge**: cross-shard semantic conflicts (a shared
helper converted two ways) are caught only by the whole-suite run at cutover, late.
Harden next by adding a pre-merge shared-symbol diff across worktrees (strengthen A6).
