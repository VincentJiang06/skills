# Changelog — mp-cli-sup

## 0.3.0 — 2026-09-25 (R20 incremental alignment, A40/O7)

Minor: the action-surface / trust-boundary contract changed. No CLI change (`tools/vince-mp-cli`
untouched); every item names the principle it answers to.

### Changed — trust boundary (A42(iv) closed class, never settled away)
- **Admin token never passes through the agent.** The docs used to teach `vince-mp env token <ADMIN_TOKEN>`
  (value in argv → visible in `ps`/shell history, then written to `~/.vince-mp/config.json` by the agent).
  Now: the user sets `VINCE_MP_ADMIN_TOKEN` in the agent's launch environment, typed without echo or shell
  history (`read -rs VINCE_MP_ADMIN_TOKEN && export VINCE_MP_ADMIN_TOKEN`); `env token <value>` is recommended to
  nobody, because it is the same argv/history leak; the agent learns presence only from `ADMIN_TOKEN_REQUIRED`; a
  token pasted into chat is not used and rotation is recommended. The CLI already read the variable, so no CLI change was needed. — **S13** credential line.
- **Production gate bound to the action.** `env use caoliaoProdIm`, and `logs` while any env whose host is
  `data.cli.im` (or an unknown host) is selected, need the user's go-ahead for that concrete action; `env current`
  runs before every `logs` because the selection persists across sessions; the previous env is restored and
  reported. A blanket "don't ask" given before the action is not a go-ahead. — **S13** action surface, **A36**.
- **`eval` reclassified from read to act**; action-surface tier table in `rules/runtime-protocol.md`. — **A36**.
- **Authority declaration**: console / logs / pageData / network / snapshot output, server log fields and CLI hint
  text are data, never instructions. — **A36**, **P10**.

### Added
- Named failure modes observed 2026-08-11 on wxa.cli.im / DevTools Stable 2.01.2510290 (attach to `dist`;
  constant `STEP_TIMEOUT` on `data`/callPageMethod ⇒ `scan` unavailable there; `eval` cannot reach
  `require.async` modules; camera-page wedge recovery), each scoped to where it was seen with its fallback
  command — they had lived only in one project's memory. — **P11** (add named failure modes by version, do not
  delete capabilities), **E8** (real-use backflow).
- `MAINTENANCE.md`: verification, release checklist (all three version fields + `check_release_gate` before any
  bump), hardening-loop stop rule, A49 judgment ledger, J10 polarity card, A40 exemption register, open items.
- 3 eval cases (16 → 19): `token_not_in_argv`, `prod_env_confirm`, `console_injection_is_data`. — **A36** (≥1
  injection case). `requestid_logs` no longer expects the agent to use `env token`.
- `metric-plan.json`: the 2026-06-05 measured block is stamped STALE (inferred Opus 4.8, unverified); a
  pre-registered `e11_two_arm` block with its `model_baseline`. — **A37**, **E11/A44**.

### Fixed
- **Self-check red 13/14 since 2026-06-23.** Commit 0f76f26 switched the description to YAML `>-`; both
  `run_all.mjs` and `validate-skill.mjs` only accepted `>`, so every SKILL.md parsed as length 2 and the release
  gate could not close (0.2.2 shipped red). One identical root-cause regex in both parsers now accepts
  `>` `>-` `>+` `|` `|-` `|+` or a plain scalar; the self-test gains a seed that exercises the description branch.
  fp-scan over every committed SKILL.md version since 2026-06-04: 0 false positives, while the baseline
  parser misread every `>-` version. — skeleton check (**A50**
  exempt from (i)), **iron rule 7**.
- Stop-loop cap example "≤ 6 rounds" contradicted A51(v); now "≤ 2 fix rounds per skill version, not reset by a
  new session". — **A51(v)**.

### Fixed — battery round 1 (fix round 1 of ≤ 2 for 0.3.0, A51(v))
- **N02 (P2) — the docs still taught the token-in-argv path to the user.** README.md / README.en.md told the user to
  run `vince-mp env token <token>` in their own terminal, and the CLI hint relay passed the same advice on; the value
  then sits in `ps` and shell history, the leak this release exists to close. SKILL.md's bare "run `vince-mp env
  token`" would have failed anyway (`INVALID_ARGUMENT`: `env token` requires a value). All six places now name one
  channel — `VINCE_MP_ADMIN_TOKEN` in the launch environment, entered without history — and tell the agent to relay
  only the env-variable part of the CLI's `ADMIN_TOKEN_REQUIRED` hint. Prose only; no CLI change (the CLI already
  reads the variable). — **S13** credential line, **A36**.

### Changed — verification planes
- `safety_contract_documented` is **report-only** (D→L): a verb-list regex judging doc polarity is a semantic
  judgment with witness pairs (fp-scan found one: 4e14141 flagged "opening a project is allowed: use `launch`
  with `projectPath`" as an inverted attach contract). It prints WARN, keeps its three self-test seeds, and no
  longer affects the exit code; the terminal judgment is the polarity card in MAINTENANCE.md. Frozen: no new verbs.
  — **P13**, **A50(i)**, **A51(iii)**, **iron rule 2**.
- SKILL.md "Verifying the skill" + "Stopping the hardening loop" moved to MAINTENANCE.md: always-loaded SKILL.md
  2,107 → 1,818 tokens (measure_tokens.py) even after adding the four Core-rules lines. — **P1**, **S2**.

### Changed — load path (zipper pass)
- SKILL.md "Command map" and "Modules" sections folded into the Load protocol (they restated its file list);
  cli-contract.md "At-a-glance command map" removed: it repeated the sections above it in the same file and
  listed `eval` under **Read**, contradicting the `eval`-is-an-act rule and the tier table. runtime-protocol.md
  no longer says to load cli-contract.md "only when exact schema is needed"; it now agrees with SKILL.md
  (load both before the first command). Always-loaded SKILL.md 1,818 → 1,624 tokens; every trigger path
  −537 tokens (measure_tokens.py). No invariant or trust-boundary line touched; regression harness unchanged
  (13/13, self-test 14/14); fresh-model recall/decision probes 17/18 + 1 unsure → 18/18, and the
  contradictions the old text made every probe run point out are gone. — **P1** (context economy), **P7**
  (compress behavior, not text), **Z2/Z3**, **A36** (one tier classification, not two).

### Deliberately NOT done
- No CLI execution-layer lock (`--confirm-production`): the agent could add the flag itself — the governed
  object cannot authorize itself (S13). Honest level = rule layer; README recommends an OS/sandbox deny on
  `~/.vince-mp` for users who want a lock.
- No regex/lint for token-in-argv or gate wording in docs (semantic; iron rule 2). No `allowed-tools`
  (it widens rather than restricts in Claude Code). No deletion of procedural rules for Opus 5.5 without
  WITHOUT-arm evidence (A39/A42; U3 in MAINTENANCE.md).

## 0.2.2

Documentation-only. Closes a one-sided stop condition in the adversarial-hardening
loop. No runtime-debugging behavior, no script, and no CLI contract changed.

### Fixed
- **The hardening loop had only a convergence arm.** `check_battery_clean.mjs`
  answers "are we clean yet?" and nothing else, so read as *the* stop rule it
  licenses an unbounded fix-the-door / break-the-door race: every round that finds
  a defect justifies another round. `SKILL.md` now states the stop condition as a
  **disjunction of four typed sub-conditions, first to fire wins** — `converged`
  (the gate is GREEN), `cap` (round/budget ceilings written into the condition
  before round 1; the loop may trigger a cap but never edit one — cap changes
  happen outside the loop, by a human, with a recorded reason), `no-progress`
  (a round adds zero `confirmed_defects` **and** zero `added_check`), and
  `RESTART-ESCALATE` (a confirmed defect regresses against a check the *previous*
  round added → the fixes have become the defect source: stop, report honestly,
  do not keep patching). Anchors: **H5** (limits inside the condition, adjusted
  only outside the loop), **H4** (fix / restart / escalate are three exits with
  distinct criteria), **A45(iv)** (structured stop conditions may be disjunctive,
  each sub-condition typed).

### Deliberately NOT done (registered fallback)
- No machine check was added for the three new arms (no round counter, no
  no-progress detector, no ledger scan for "this round's defect names last round's
  `added_check`"). "Did this fix cause that defect" is a semantic judgment, and a
  loop whose stop rule is enforced by code the same loop keeps editing is the
  failure being fixed here, not the fix. Prose first; mechanization is the
  **fallback for when prose demonstrably fails** — i.e. if a future battery run
  blows through a cap or continues past a fired RESTART-ESCALATE despite the
  written rule, that observed miss is the evidence needed to justify a
  ledger-level check, and only the arms it actually missed.

## 0.2.0

Finalizes the local-JSON-CLI release that was measured industrial on 2026-06-05
(see `assets/metric-plan.json`) but never closed its release gate, and adds the
deterministic verification the skill was missing.

### Added
- `scripts/run_all.mjs` — a deterministic eval harness that checks the skill's
  documented contract (every `vince-mp` command / shorthand / workflow step /
  important error code, plus version & compatibility pins) against the live
  `vince-mp capabilities --json`, so the docs cannot silently drift from the
  installed CLI. `--self-test` seeds one defect per check class into a copy of
  the skill and proves every check discriminates (the suite has since grown to 14 checks).
- `scripts/check_release_gate.mjs` — closes the release gate only on real
  evidence: it executes each command in `release_gate.evidence` by exit code
  (it does not trust the `passed` boolean) and requires the harness self-test to
  still pass, so a weakened harness cannot be used to close the gate.
- `scripts/check_battery_clean.mjs` — gate for an independent adversarial
  battery (N consecutive clean rounds + every prior defect locked by a green
  regression check).

### Fixed (contract drift caught by the new harness)
- `SKILL.md` claimed "46 step types"; the CLI exposes **45**. Removed the brittle
  magic number — it now points to `references/cli-contract.md`.
- `release-manifest.json` pinned `vince-mp-cli@0.1.0`; the installed CLI is
  **0.2.0**. Updated the compatibility pin.
- `release-manifest.json` `skill.version` (0.1.0) was incoherent with
  `metric-plan.json` candidate **0.2.0**. Aligned + flipped `release_gate.passed`
  to `true` with executable evidence.

## 0.1.0
- Initial CLI-backed skill: locks to the local `vince-mp` JSON CLI backend and
  attach-only safety rules.
