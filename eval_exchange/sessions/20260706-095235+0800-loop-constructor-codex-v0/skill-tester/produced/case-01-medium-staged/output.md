# case-01-medium-staged — loop-constructor-codex run

Runtime: OpenAI Codex CLI. Altitude: **medium** (sequential gated stages, single agent).

## SELECT — decision log (D0–D6)

- **D0 — loop.** Runnable checks answer "done?" without a human: `npm test api:contract`
  (regression), `npm test api:ratelimit` (429/200/Retry-After/per-client/config), plus a
  test-drift diff. Done is machine-decidable ⇒ it is a loop.
- **D1 — staged (2 seams).** Seam A: characterize hands a *green captured contract suite*
  to implement. Seam B: implement hands a *working config-driven 429 middleware* to verify.
  Both handoffs are stable checkable artifacts (upstream check runs without downstream;
  consumed unchanged; non-conflicting surfaces) ⇒ 3 stages.
- **D2 — patterns.** characterize=`explore_narrow` (pin the unknown-extent existing
  contract); implement=`plan_execute_verify` (risky request-path change, mid-flight
  correction); verify=`retry` (mechanical re-assertion). Cheapest discriminating check per
  stage; `falsifiable_when`/`passing_but_wrong` filled per stage.
- **D3 — on_the_loop.** Dev-only, reversible, checks discriminate (200-below AND
  429-above, config-driven) ⇒ human reviews at gates, not each iteration.
- **D4 — medium.** Strict dependency chain characterize→implement→verify; no independent
  pair to fan out.
- **D5 — caps + loopback + escalate.** characterize cap 3 → escalate (red baseline is env,
  not our change); implement cap 8 → loopback characterize; verify cap 5 → loopback
  implement; outer escalate on any public-API/schema change.
- **D6 — iteration_first.** Gate checks are fast/cheap (npm test in seconds) ⇒ frequent
  small passes. Tuned: implement cap raised to 8, verify=`retry`, one ratelimit behavior
  per pass. (characterize stays low-cap because it is a one-shot pinning, not iterative —
  recorded as a per-stage exception.)

## NEGOTIATE — roles + contract

**Roles** (three separate `codex exec` contexts):
- **planner** — goal → staged spec + contract + config schema; never writes code.
- **generator** — writes middleware + config loader + tests; may NOT weaken a test, grade
  itself, or hardcode the threshold.
- **evaluator** — `separate_context:true`, `adversarial:true`; fresh `codex exec` given
  only diff + `contract.md`, told the limiter is broken; sends threshold+1, mutates the
  config, races two clients, diffs test/ vs the baseline tag.

**Contract** — 9 assertions (A1 regression; A2 threshold boundary; A3 Retry-After; A4
per-client isolation; A5 config-driven / no-hardcode; A6 malformed-config fail-fast; A7
window reset; A8 both suites green; A9 no weakened test vs baseline tag). Each is
machine-gradable and stage-traced. **The contract, not the brief, is graded.**

## VERIFY — linter + fresh-reader

**Linter:** `node skills/loop-constructor-codex/scripts/lint_loop_design.mjs
eval_exchange/sessions/20260706-095235+0800-loop-constructor-codex-v0/skill-tester/produced/case-01-medium-staged/design.json`
→ **all PASS, exit 0** (16 PASS lines, `0 fail(s)`).

**Fresh-reader verdict:** PASS with one honest residual.
- Every stage `check` is runnable and fails on its named break; `falsifiable_when` are real
  breaks, not goal restatements; `passing_but_wrong` are concrete false-passes that the
  strengthened check rules out (vacuous suite / always-429 / hardcoded-limit / loosened
  assertion).
- verify pins its reference (`git diff --exit-code ratelimit-baseline -- test/`), matching
  the "pin the baseline tag, don't use bare git diff" guidance.
- Cadence honest: iteration_first knobs (implement cap 8, verify=retry, one-slice scope)
  match the label. characterize's low cap is justified (one-shot pinning).
- Roles genuinely separate; evaluator never saw the impl.
- **RESIDUAL (recorded, not hidden):** the test-drift gate `git diff --exit-code
  ratelimit-baseline -- test/` catches *tracked* test weakening but a **new untracked**
  test file is invisible to `git diff`. The evaluator mandate covers this by diffing
  against the tag adversarially, but the machine gate alone is incomplete — a stronger gate
  would add `git ls-files -o --exclude-standard -- test/` to fail on new untracked test
  files. This is a design-quality nit, not a lint failure; flagged for the eval_tester.

## PERSIST — rendered runbook

`node render_loop_doc.mjs design.json` (run from this dir) →
`.loop/add-token-bucket-rate-limiting-middleware-to-an-express-json.loop.{md,json}`.
The runbook carries the **"How to run this loop (Codex CLI)"** preamble, per-stage
`codex exec` drive lines, evaluator-as-fresh-read-only-`codex exec`, and re-read-disk on
resume. Grep confirms **zero** banned Claude-primitive tokens.

## Bottleneck (LOOPS.md §IX)
Current weakest link = **verification**: the machine test-drift gate is tag-pinned but
untracked-blind (the residual above); the adversarial evaluator carries that load. Harden
next by adding the untracked-file scan to A9's check.
