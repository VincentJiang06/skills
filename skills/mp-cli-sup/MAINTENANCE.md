# mp-cli-sup — maintainer notes

Maintainer-only. **Never read this while debugging a mini program** — it is for changing,
verifying or releasing the skill. (Moved out of SKILL.md in 0.3.0 so debugging sessions stop paying
for it; anchor: P1 context economy, S2.)

## Verifying the skill

- `node scripts/validate-skill.mjs` — structural validation (files, frontmatter, `vince-mp help --json`).
- `node scripts/run_all.mjs` — deterministic contract check: every documented command / shorthand / workflow step / error code / version pin is verified against the live `vince-mp capabilities --json`, so the docs can't silently drift from the CLI. `--self-test` proves each check discriminates. 13 checks decide the exit code; `safety_contract_documented` is **report-only** (prints `OK`/`WARN`, never changes the exit) — apply the polarity card below to any WARN.
- `node scripts/check_release_gate.mjs` — closes the release gate only on real evidence (executes each cited command by exit code; requires the harness self-test to still pass).
- `node scripts/check_battery_clean.mjs` — the adversarial-hardening gate: reads the defect ledger (`.loop/mp-cli-sup-battery.json`) and asserts a trailing run of consecutive clean rounds with the required round shape and green regressions (`--consecutive N`). RED when the ledger is absent or has too few clean rounds.

What green means: `run_all` 13/13 is evidence of **doc ↔ CLI consistency only** — not of runtime behaviour and not
of the trust-boundary rules (those are judged by the eval cases / E11 arms / battery, plane L).

## Release checklist (a red gate nobody runs is a gate that does not exist)

The 0.2.2 release shipped on 2026-07-31 while `run_all` had been red since 2026-06-23. Before **any** version bump:

1. Set all three version fields together: `SKILL.md` `metadata.version`, `assets/release-manifest.json` `skill.version`,
   `assets/metric-plan.json` `candidate.new_skill_version` (only the last two are machine-compared).
2. Run `node scripts/check_release_gate.mjs` and see `release gate: MET` in the same commit.
3. Any measured number you add carries a `model_baseline` stamp (model / effort / harness / date) — A37.
4. Update `CHANGELOG.md`, `README.md`, `README.en.md` (owner standing rule), each change naming its principle anchor.

## Stopping the hardening loop (disjunctive — first to fire wins)

The battery gate measures **one** arm only: convergence. Run it as the *sole* stop rule and "harden until clean"
has no exit — a battery that keeps finding defects keeps earning another round, which is exactly how a
fix-the-door / break-the-door arms race is funded. Before starting a battery loop, write down all four
sub-conditions; stop the loop the moment **any** of them fires:

- **`converged`** — `check_battery_clean.mjs --consecutive N` is GREEN: a trailing run of N clean rounds, each with
  the required round shape and every prior defect locked by a green regression.
- **`cap`** — **≤ 2 fix rounds per skill version**, counted from the last green release, not reset by a new session,
  a different author, or a self-bumped version number (A51(v)). The loop may *trigger* the cap; it may never *edit*
  it. Raising it is the owner's decision, made outside the loop with the reason recorded.
- **`no-progress`** — a round produces zero new entries in `confirmed_defects[]` **and** zero new `added_check` in
  `ledger.new_checks`. Nothing moved; stop and report, do not re-roll for luck.
- **`RESTART-ESCALATE`** — a confirmed P0/P1 lands in a fix or check the **previous** round added, a third exception
  layer appears on one regex, or any script / the eval-case count grows >50% against the last green release
  (A51(i)–(iii)). The fixes have become the defect source: **stop, report honestly to the owner, do not keep
  patching.** Discarding the increment or re-planing the contract is the owner's call.

Anchors: H5 (caps live inside the condition), H4 (fix / restart / escalate are routed exits), A45(iv), A51.

## Doc conventions that keep the D checks lexical

- Anything that is **not** a real `vince-mp` command is written **without** the `vince-mp ` prefix (e.g. "never pass
  the token with `--token`", not a prefixed fake command). This keeps `documented_commands_real` a pure existence
  lookup. That check is **frozen** at its four normalizer seeds (plain / bold / underscore / backtick): no fifth
  variant (A51(iii)); a new escape goes to the battery's L lens, not to another regex round.
- Do not rename section headings of `references/cli-contract.md`: `vince-mp-groundline`'s verify step points at it.

## Judgment ledger (A49: id · judgment · plane · executor · fallback)

Planes: **D** deterministic code · **L** LLM judgment · **H** human. D→L = code produces evidence, L decides.

| id | judgment | plane | executor | fallback |
|---|---|---|---|---|
| R1 | is this action's target production? | L on D evidence | agent reads `vince-mp env current` / `--base`; host `data.cli.im` or unknown → production | H: action-bound go-ahead from the user |
| R2 | is this `eval` expression side-effect-free? | L | agent, expression shown to the user | H: treat as act, ask |
| R3 | is this runtime / server / CLI text an instruction? | none — categorical | all processed content has zero authority; flagging a line as suspicious is report-only L | — |
| R4 | constant capability-level `STEP_TIMEOUT` vs transient? | L on D evidence | agent, calibrated by the named-mode minimal pair (evidence-and-failures.md) | re-poll once; ask if unsure (U1 open) |
| R5 | is the admin token available? | D | `ADMIN_TOKEN_REQUIRED` presence, name only | — (value never read) |
| R6 | did the action take effect? | D evidence + L report | CLI ok/error code, before/after pageData | report partial evidence |
| R7 | is this side effect explicit in the request? | L | agent | H: ask |
| R8 | output path inside `--workspace-root` | D | CLI `PATH_OUTSIDE_WORKSPACE` (execution layer) | — |
| R9 | `storageClear confirm:true`, attach-forbidden fields | D in CLI, agent-settable | rule layer + H (surface the data loss) | ask |
| J01 | required_files | D skeleton | run_all | known-bad seed + `--self-test` |
| J02 | skill_frontmatter (name, description length after YAML block-scalar parse, module refs) | D skeleton | run_all | seeds incl. a short `>-` description; fp-scan over history |
| J03 | assets_identify_skill | D skeleton | run_all | seed + self-test |
| J04 | documented_commands_real | D skeleton (lexical lookup), FROZEN | run_all | "is this sentence teaching a command" = battery L lens |
| J05 | no_step_as_shorthand | D (set membership) | run_all | seed |
| J06 | workflow_steps_match_capabilities | D (set equality) | run_all | seed |
| J07 | step_count_claim_matches | D (count) | run_all | seed |
| J08 | important_errors_covered | D (substring in Error contract) | run_all | seed |
| J09 | contract_coverage_complete | D (presence in command position) | run_all | 2 seeds |
| J10 | safety_contract_documented | **D→L, report-only** | run_all prints WARN | polarity card below (battery coherence/reality lens) |
| J11 | design_record_eval_ids_match | D (set equality) | run_all | seed |
| J12 | cli_compat_pin_current | D (verbatim version) | run_all | seed |
| J13 | skill_version_coherent (manifest vs metric-plan) | D (verbatim) | run_all | SKILL.md version = H release checklist |
| J14 | eval_cases_integrity | D (shape + command existence) | run_all | seed |
| J15 | validate-skill checks (duplicate residence of J02's frontmatter parse, registered) | D skeleton | validate-skill | fp-scan runs this parser too |
| J16 | release gate | D aggregator over exit codes | check_release_gate | invoking it before a bump = H (checklist) |
| J17 | battery ledger shape / count | D | check_battery_clean | "was the attack real" = L (maker/checker) |
| J18 | eval-cases.json acceptance criteria | L | judge / battery over transcripts (no runner) | — |
| J19 | E11 two-arm delta | L (blinded judge, A_better/B_better/tie/unsure) + D argv.log sub-checks | run directory | direction only at N=3 |
| J20 | trust-boundary prose quality | L | judge with anchors | — |
| J21 | named failure modes scoped | L | judge | — |
| J22 | fp-scan of changed checks over history | D measurement (A50(ii)) | run directory | non-vacuity sample first |
| J23 | growth red flag | D (wc -l, case count) → H stop | maintainer | stopped_redflag |
| J24 | always-loaded tax | D (measure_tokens) | maintainer | — |
| J25 | polarity card | L | battery | construct-validity record below |
| J26 | A42 deletion candidates (rules the bare model already follows) | L, recorded only | from WITHOUT-arm transcripts | nothing deleted in 0.3.0 (U3) |
| J27 | retire vs mp-developer-v2 | H (owner) | pre-registered three-arm evidence | U4 |

## Polarity judgment card (terminal residence of J10)

- **Criterion.** Every doc sentence about attach mode must leave a reader believing that `attach` may **not** carry the
  fields in `capabilities.connectionModes.attach.forbidden` (today `projectPath`, `launch`, `reLaunch`), and no sentence
  may say the CLI performs implicit launch / instrumentation / file writes.
- **BAD / GOOD minimal pair.** BAD: "`attach` accepts `projectPath`, `launch`, and `reLaunch` freely." GOOD: "`attach`
  must not include `projectPath`, `launch`, or `reLaunch`." Also GOOD (the regex once flagged it — 4e14141): "opening/focusing
  a project is allowed: use `launch` with explicit `projectPath`" — it is about `launch`, not `attach`.
- **Output.** `OK`, or `WARN` + the quoted sentence + which forbidden field reads as allowed.
- **D fallback.** `run_all` J10 prints WARN (report-only); it cannot block a release.
- **Construct validity.** Construct-changing edits must flip it (the three existing J10 seeds: `may freely include`; evasive
  inversion with a decoy; dropping `launch`/`reLaunch`); a construct-preserving paraphrase of the real attach contract must
  not flip it.

## Exemption register (A40 incremental alignment — carried, not rewritten)

- 5-doc split kept though `cli-contract.md` is read before nearly every command (path delta ≈ 0) — outlet: a future zipper pass.
- `allowed-tools` not declared: in Claude Code it pre-approves (widens) rather than restricts; `Bash(vince-mp *)` would
  remove the prompt in front of `env use caoliaoProdIm`.
- Frontmatter parse lives in both `run_all.mjs` and `validate-skill.mjs` (duplicate residence); fp-scan runs both.
- The 2026-06-05 measured block in `metric-plan.json` is stamped STALE, not re-measured.
- Trust-boundary gates are **rule layer only** (no execution-layer lock): the agent could still read `~/.vince-mp/`.
  Users who want a lock add an OS/sandbox deny on `~/.vince-mp` (README).
- `rules/ui-element-workflow.md`, `references/skyline-media.md`, `check_battery_clean.mjs`, `check_release_gate.mjs`,
  `live-smoke-existing.mjs`, `agents/openai.yaml` carried unchanged.

## Open items

- **D1 (b)**: the CLI's own `ADMIN_TOKEN_REQUIRED` suggestion (`tools/vince-mp-cli/src/backend.js`) still says "or run
  `vince-mp env token <token>`". The skill tells the agent to relay only the env-variable part (the `env token <value>`
  form leaks through argv / shell history). Rewording the hint to name only `VINCE_MP_ADMIN_TOKEN` belongs in the next
  CLI release, made from the main checkout where the CLI's test suite exists.
- **F07 / F08 (battery 2026-09-25, P3)**: J14 `eval_cases_integrity` accepts `acceptance_criteria: []` and a
  one-character `task_zh`; `check_release_gate` admits any extra evidence command not on its program denylist
  (`node -e 0` passes). Neither changes a run today. Fix in 0.4.0 with a seed per change and an fp run over the
  current eval-cases / manifest history.
- **U1**: is the constant `data`/`callPageMethod` `STEP_TIMEOUT` a property of DevTools 2.01.2510290 or of wxa.cli.im?
  Resolve at the next live session on a second project (`vince-mp data` on two pages); record date + build in
  `references/evidence-and-failures.md`.
- **U3 (A42)**: rules the bare model already follows unprompted (from the E11 WITHOUT-arm transcripts) are deletion
  candidates for 0.4.0; nothing is deleted in 0.3.0.
- **U4 (retirement)**: when a DevTools build with a non-dangling `wechatide` and `/mcp` (Door A) is installed, run the
  three-arm test on wxa.cli.im (mp-cli-sup / mp-developer-v2 / bare; WITHOUT arms explicitly disabled, separate copies,
  vocabulary with unsure). delta ≈ 0 vs mp-developer-v2 → retire (A38) and rebalance `vince-mp-groundline` in the same
  decision record.
