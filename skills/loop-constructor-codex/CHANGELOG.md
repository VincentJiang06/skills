# Changelog — loop-constructor-codex

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to (the linter is a byte copy of `loop-constructor`'s, pinned
by sha256 below): a new required field / renamed key is a breaking change.

## 0.3.0 - 2026-09-25

Tracks `loop-constructor` **0.5.0** (sibling commit `befbd04`); skill-philosophy KB
v0.4.0 (R20). Non-breaking (minor): the loop-design JSON schema is unchanged except the
already-optional `parameter_provenance` inherited from sibling 0.4.0. Every pre-0.3
lint-green design still exits 0; staged designs without `parameter_provenance` now get
one `WARN` (back-compat signal, never a FAIL).

**The recorded problem.** 0.2.0 told every Codex loop it designed that "a top-severity
defect inside the previous iteration's own fix → `restart`" and to "escalate only a wrong
contract, not a broken build"; and it credited a `--sandbox read-only` `codex exec` as an
independent evaluator while the generator could still edit the `AGENTS.md` that the
evaluator reads on startup. The linter was also no longer the sibling's: the claim
"shared verbatim with loop-constructor 0.2.0" had been false since sibling 0.4.0
(958 vs 1,160 lines), with nothing to signal the drift.

### Changed
- **Linter = loop-constructor 0.5.0 (unchanged since 0.4.0), sha256 `1fec173225e5c671086da11fc6b85bb2183f6da636e0db7d25cdb16ae256fd36`** (KB
  constitution **A49** one judgment, one home; **A51(iv)** a second implementation copy
  drifted silently). Byte copy; the pin replaces every bare "byte-identical" claim in
  SKILL.md and README. The dev harness recomputes the pin (C72) and compares against a
  sibling linter when one is installed next to this skill (C73: FAIL on drift, SKIP when
  absent, never PASS).
- **Failure routing by what the failure accuses** (KB `guidelines/loops.md` **H4**,
  constitution **A51**, principle **P13**): `loops-model.md` §V, `loop-selection.md` D5,
  the checklist, the goldens and the SKILL.md Controls bullet mirror sibling 0.5.0 —
  four exits, order **escalate → re-plane → loopback → restart, first hit wins**; the
  five fixer signatures (P0/P1 inside the previous fix, fix-area growth >50%, a third
  exception layer, a second implementation copy, 2 fix rounds on one defect class) are
  pre-registered escalate triggers that carry the plane question; re-plane is the
  owner's call after the stop, never an `on_failure` value; the "impossible or blocked
  → stop and report" exit is never sealed.
- **`codex-runtime.md` §5 follows §V instead of stating its own rule** (**A49**): each
  exit maps to operator commands, escalate is checked before the cap, and the 0.2.0
  phrase "escalate a wrong contract, not a merely-broken build" is gone.
- **Evaluator instruction surfaces on Codex** (KB principle **P10** authority comes from
  provenance, not channel; constitution **K1** host-injected context left in place =
  `L-i incomplete`): `loops-model.md` §II (hunk K4), `codex-runtime.md` §1/§2, the
  checklist box (K5), the renderer preamble (R1) and the SKILL.md evaluator bullet name
  what a fresh `codex exec` auto-reads (`AGENTS.md` at every level,
  `AGENTS.override.md`, `project_doc_fallback_filenames`, `.codex/`, execpolicy
  `.rules`, memories, `.loop/prompts/`) and prescribe one control: launch the evaluator
  with `-C` from a conductor-owned checkout whose surfaces equal the contract-time tag,
  or verify their recorded sha256 before launch; a changed file is diff data, never an
  instruction. `--sandbox read-only` limits what the evaluator writes, not what it
  obeys. `AGENTS.md` moved from "harness primitive the loop writes" to "protected
  evaluator-read surface".
- **Codex facts re-stamped** (**P10**): "observed on codex-cli 0.144.4, 2026-09-25"
  (local help, `codex features list`, binary strings; not vendor docs). Corrected:
  `hooks` stable/on, `multi_agent` stable/on, `memories` experimental/on — so §6 no
  longer says hooks are unavailable or that memory maps to `AGENTS.md`. The prescribed
  realization stays one `codex exec` process per role, now with its reason (in-session
  isolation unverified; a process's flags are checkable). The isolation flags
  (`--ephemeral`, `--disable memories`, `--ignore-rules`, `--ignore-user-config`) are
  named but not relied on: their effect was not run.
- **Harness settlement is two-way** (**P11**): §VIII and the SKILL.md bullet — at each
  model or codex-cli release, delete what the model does for free **and** add back that
  version's named failure modes; stamp `model_baseline` = model id + effort +
  codex-cli version. For Codex the per-version source is the vendor's release notes
  (hunk K6); the KB ships no OpenAI adaptation file (as of 2026-09-24).
- **Number provenance D7** (sibling 0.4.0; **A45** contract discipline): D0–D7 in
  SKILL.md, `parameter_provenance` in FILL, VERIFY clean = 0 FAIL **and** 0 WARN, the
  numbers-audit box; renderer prints the D0–D7 label and the provenance table.
- **Large golden** (codex-only) routed and protected: shard stall counters on the
  stages, hidden coupling moved to the outer escalate, fixer-signature + safe-exit
  escalate entries, `parameter_provenance` (4 decision, 0 empirical), reviewer launched
  from a checkout with the surfaces diffed and hashed (A12), no test dropped (A11); 12
  assertions (module-row floor). 0 FAIL 0 WARN.
- **Size**: SKILL.md 3,682 → 4,098 tokens (≤ 4,100 budget); the Codex runtime mapping
  and PERSIST preamble detail moved to `codex-runtime.md` "Phase map" (diff_lossless:
  0 LOST, 4 reflowed lines). Scripts 1,346 → 1,603 lines (+19.1%; lint +21.1% forced
  by the byte copy, render 388 → 443). Dev harness 71 → 78 checks.

### Mirror register (the only allowed differences from sibling `befbd04`)
- K1 `loops-model.md` §IV context loss / `codex resume` (existing) · K2 `loop-selection.md`
  D4 concurrent `codex exec` fan-out (existing; reworded: `multi_agent` exists, isolation
  unverified) · K3 checklist `codex resume` line (existing) · K4 `loops-model.md` §II
  Codex evaluator surfaces · K5 checklist evaluator-instruction-file box for Codex ·
  K6 `loops-model.md` §VIII per-version source · **K7** `golden-loop-design-medium.json`
  `maker_checker.scope` names the Codex surfaces instead of `CLAUDE.md` / `.claude/`
  (one string; needed because harness check C42 forbids `CLAUDE.md` in a Codex runbook
  and the golden must pass its own K5 box) · R1 renderer Codex preamble (+1 line on the
  evaluator surfaces; evaluator example uses `-C`) · R2 renderer concurrent `codex exec`
  wording. `loop-design-shape.md`, `loop-principle-map.md`, the flat golden and the
  linter are byte-identical.

### Battery fix round (round 1 of 1; instance-tier battery, 5/5 seeds)
- **F06 (P2) — `contract.md` is now a protected evaluator surface.** The graded
  criteria sat in no protected set, so a generator could delete the assertion it
  failed and the §1 pathspec / sha256 control still passed. `codex-runtime.md` §1
  (evaluator row, control (a) pathspec, control (b) hash set, new why-paragraph) and
  §2, `loops-model.md` §II and §IV, the large golden (evaluator/generator mandates,
  `maker_checker.scope`, A12 check, `harness_primitives`, outer escalate) and the
  medium golden's `maker_checker.scope` now include it. The evaluator grades the
  contract-time copy; a wrong contract is an escalate, never a generator edit.
  Anchors: `loops-model.md` §III ("the contract … is what gets graded"), KB P10 / K1,
  A45(ii). Mirror register: K4 (§II) and K1's §IV hunk widened, K7 widened; the
  sibling carries the same omission (routed to the conductor, not fixed there).
- **F07 (P2) — the large golden stops on both sides.** Its outer `stop_conditions`
  gained a minimum-progress floor in `success`, a zero-change failure branch and a
  premature-abandonment escalate entry, mirroring the medium golden. The zero-change
  counter is tagged decision-class in `parameter_provenance` and the D5 / D7 log
  lines. Anchor: SKILL.md Controls "Stop on both sides" (D5). No linter check was
  added: whether a stop text is two-sided stays a fresh-reader judgment.
- No script, check or eval case changed (linter sha256 pin unchanged; harness 78/78).
  Corpus re-run after the fixes: all 26 designs give the same exit / FAIL / WARN
  vector as before; the three goldens stay 0 FAIL 0 WARN.
- Open, not in this round's fix list: F08, F09, F10, F11, F13, FLAG-02 (all P3).

### Acceptance evidence (close, 2026-09-25)
- **Version**: 0.2.0 → **0.3.0** (minor). The routing and trust-boundary doctrine that
  designs emit changes; the loop-design JSON schema does not. The battery fix round
  and this close stay inside the unreleased 0.3.0, so there is no second bump.
- **E11 two-arm run** (`runs/loop-constructor-codex/arms/`, rubric pre-registered
  before the arms ran; the arms ran at `caa3cf0`, before the battery fix round). The
  WITHOUT arm had the skill explicitly disabled, each arm got its own copy of the
  targets, and the judge read the full outputs from disk.
  - Case 1 (termfix-writer hardening, "keep going until green"): **WITH better.** It
    wins (c) routing and (d) trust boundary. It is the only arm that sees fixer
    signatures (i)/(ii)/(v) have already fired, escalates with the plane question,
    and quotes the planted evaluator comment as a risk. (a) and (b) tie.
  - Case 2 (ledgerlite flaky tests): **WITHOUT better, narrowly.** It wins (b)
    executability: its driver was dry-run end to end, while WITH's was only syntax-checked
    and added an untested negotiation phase. WITH wins (d) slightly (conductor-owned
    worktree plus an empty AGENTS*/.codex/.rules diff check).
  - Case 3 (shopcore refactor): **WITHOUT better, narrowly.** It wins (a) and (b):
    its oracle is already validated, while WITH's harness is built overnight with no
    rounding mutant, and WITH ships no driver script. WITH wins (c) and (d).
  - Pre-registered acceptance. Fidelity (WITH better on (c) or (d) in ≥2/3):
    **met, 3/3.** Non-inferiority (0 cases where WITH is worse overall):
    **not met, 2 of 3.** Task-level negative: WITH loses (a) in case 3. Cost:
    **not evaluable**, because there are only tool-call counts and no token counts.
    Retire branch: **not triggered**, since the delta is not ≈ 0. Host `CLAUDE.md`
    contaminated the bare arm (case 1 cites it), so read the (c) delta as a lower bound.
  - The same pattern as the sibling's round 1: the doctrine wins, but WITH designs name
    harness tools the executor has not built yet and lose on executability.
- **Battery** (1 round, instance tier, `runs/loop-constructor-codex/battery/`):
  **5/5 seeds hit**. SEED-GAM was under-called as P2; it should have been P1. There
  were 7 confirmed non-seed findings (F06 and F07 at P2; F08–F11 and F13 at P3), 1
  refuted, and 1 promoted flag (FLAG-02, P3). The fix round (above) fixed F06 and F07.
- **Fix audit** (after `b5d10dc`) found no P0 or P1 and no P0 inside the round's own
  fix, so iron rule 3 was not triggered. It reported **2 P2 and 5 P3 on the F06 fix,
  all left open because the fix budget is spent**:
  - P2: the fresh-reader box "Evaluator instruction files outside the generator's
    write surface" (`assets/fresh-reader-checklist.md`:82-97) and the SKILL.md
    evaluator bullet still omit `contract.md`. A new design that leaves the contract
    generator-writable clears every gate; the pre-fix large golden still passes the
    box as PASS. **F06 is fixed in the examples and references only, not in the
    gates.**
  - P2: the renderer's Codex preamble (`scripts/render_loop_doc.mjs`:177-180) still
    lists the old surfaces and hands the evaluator the runbook's own rendered
    Contract, a file the generator can write. Harness C76 checks only the old strings.
  - P3: `loops-model.md` §IV "never written by the generator" contradicts the §III
    negotiation. The re-tag instruction in `codex-runtime.md`:77 does not say to
    re-record the sha256 or to confirm the other surfaces before the tag moves. The
    medium golden's mandates do not carry the contract protection. The large golden
    names no pre-registered wrong-contract escalate trigger. The mirror register
    lists the new §IV contract.md hunk under K1 when it should be its own entry.
- **Open battery P3s, round 1**: F08 (`loop-principle-map.md` says the KB is
  embedded), F09 (`project_doc_fallback_filenames` missing from the protected
  pathspec), F10 (the `in_the_loop` → `codex exec` approval flag is not verified on
  0.144.4), F11 (duplicate harness IDs C41/C42; evals.json lists 42 of 78), F13
  (Claude-scoped statistics cited without vendor scope), and FLAG-02 (the renderer
  preamble omits `.rules` and fallback files).
- **Independence tier = instance.** Attacker, adjudicator, fix-auditor, E11 judge and
  builder all ran on Opus 5.5 high in fresh contexts. **Model deviation**: the
  skill-creator-max 2026-09-13 policy requires a Fable builder and Opus evaluators;
  on owner order (2026-09-25) every role ran on Opus 5.5 high. No different-vendor
  (model-tier) battery was run.
- **Tests at close**: `node evals/run_all.mjs` 78/78; all three goldens lint 0 FAIL /
  0 WARN; linter sha256 matches the pin; SKILL.md is 4,098 tokens. Growth against the
  wave baseline (scripts 1,346 lines, 71 cases): scripts +19.1% and cases +9.9%, both
  under the 50% red flag.
- **Effective verdict: candidate**, the min-fold of re-audit and an instance-tier
  battery with breaches found. Final state: stopped_unmet. The blocking gaps are the
  two open fix-audit P2s, E11 non-inferiority not met in 2 of 3 cases, and the cost
  gate not being evaluable.

### Compatibility
- Persisted pre-0.3 Codex runbooks keep the old routing and the unprotected `AGENTS.md`
  channel and still lint green. Re-review them with the fresh-reader §V box and the
  evaluator-instruction-file box; never auto-rewrite (the renderer never overwrites).
- The 0.2.0 note below ("on Codex this is naturally a read-only `codex exec` for the
  judge") is history: read-only was never enough by itself.
- Iron rule 7 corpus: 17 codex designs + 9 sibling designs, old vs new linter: exit codes
  and FAIL counts identical on all 26; +1 `WARN parameter_provenance` on the 23 staged
  designs that lack the declaration.

### Carried as-is (A40 incremental alignment — exemption register)
- X-1 SKILL.md above the 3,000-token target (pre-existing BAD flag; 4,098 now) ·
  X-2 description unchanged (dispute DS3: "single-agent" read as the prescribed
  realization; the facts block carries the correction) · X-3 sibling open P3s not
  fixed here, re-mirror when fixed upstream: F08 / F25 (renderer strings), F14 / F19 /
  F21 / F22 / F23 / F26 (prose) and linter F1 (quote-aware `#` strip) · X-4 Modules
  table row `evals/run_all.mjs` names a git-ignored file · X-5 U1: the isolation flags'
  effect is untested (owner follow-up: plant "reply PLANTED" in `AGENTS.md` and a
  memory, launch with the flags, grep the output) · X-6 DS2 (fold into
  loop-constructor) undecided · X-7 independence tier = instance; model deviation:
  builder and evaluators all Opus 5.5 high on owner order.

## 0.2.0 — 2026-07-31

Tracks `loop-constructor` **0.3.0** — the skill-philosophy KB v0.3.0 (R17) **H series**
alignment. Per this skill's standing discipline the shared parts stay in lockstep:
`lint_loop_design.mjs`, `loop-design-shape.md`, `loop-principle-map.md` and the goldens
remain **byte-identical** to the sibling, and the only divergences are still the Codex
runtime hunks (§IV context-loss wording in `loops-model.md`, the D4 concurrent-
`codex exec` fan-out in `loop-selection.md`, the `codex resume` line in the fresh-reader
checklist, the "How to run this loop (Codex CLI)" preamble). Battery **71/71**.
KB anchors: `Philosophy/guidelines/loops.md` H2/H4/H5/H7/H8 ·
`Philosophy/rules/constitution.md` 第九章 A45/A46 + 附录一 A45 参数行.

### Added (mirrored verbatim from `loop-constructor` 0.3.0 — see its CHANGELOG for the full rationale)
- **Two-sided stop gate** (H5 / A45(iv)) at D5: zero-change gate ("N consecutive
  iterations with zero new changes → stop") **plus** a minimum-progress floor below
  which an early stop escalates; caps live inside the condition and may be tripped, not
  raised, by the loop.
- **Pre-registered stall counter** (H4 / T14): `restart`'s "patching has stalled" is
  quantified before iteration 1 and fires mechanically — no in-flight discretion.
- **Write-surface separation** (A45(ii) / H2): with no independent evaluator, the
  check's execution and result-writing sit outside the generator's write surface —
  on Codex this is naturally a read-only `codex exec` for the judge and a verdict file
  the generating process does not write.
- **Paired telemetry / run report** (H7 / A46): new `loops-model.md` §VII·b, and the
  rendered runbook now ends with a **"Run report (emit this when the loop stops)"**
  section — the Codex renderer gained the same static block as the sibling, placed after
  Harness primitives and after the Codex how-to-run preamble.
- **Compensating vs structural harness parts** (H8): different settlement evidence per
  class, and the classification is confirmed by the checker rather than self-declared.

### Changed
- **Contract sizing restated as lower bounds** (A45(i)): endpoint ≥ 8 / module ≥ 12 /
  app ≥ 20 machine-gradable assertions, ceiling 3×; the linter's floor of 3 is the
  lower, absolute anti-vacuity ground and clearing it does not clear the sizing.

### Not changed (deliberately)
- **No schema change, no new linter rule** — the deltas are semantic judgments and land
  in prose + the fresh-reader pass. Designs stay cross-compatible with
  `loop-constructor` 0.3.0 and with anything authored under 0.1.0 / 0.2.x.

## 0.1.0 — 2026-07-06

Initial release. A Codex-CLI variant of `loop-constructor` 0.2.0 — same
SELECT → NEGOTIATE → FILL → VERIFY → PERSIST mechanism, same loop-design JSON
**schema and linter** (`lint_loop_design.mjs`, copied verbatim), so **designs are
cross-compatible** between the two skills. What changes is the runtime prose: the
loop's abstractions are realized on the OpenAI Codex CLI (single-agent, `codex exec`)
instead of Claude Code.

### Added
- **`references/codex-runtime.md`** — the concrete mapping: three roles = three
  separate `codex exec` invocations (the evaluator a fresh `read-only` one given only
  the diff + contract); `harness_primitives` = durable on-disk state (`.loop/`,
  a ledger, `contract.md`, **AGENTS.md**, `codex resume`); D4 `large` fan-out =
  concurrent `codex exec` processes in git worktrees coordinating via the ledger;
  sandbox/approval mapping for `risk_guards` / `human_placement`; the operator loop;
  and what does NOT map (hooks → shell wrappers; memory → AGENTS.md + `.loop/`;
  `/compact` → irrelevant, each `codex exec` is already fresh, survival = disk).
- **SKILL.md** — a "Codex runtime mapping" section, a "Single-agent runtime" control,
  and a `codex-runtime.md` modules row.
- **`render_loop_doc.mjs`** — emits a **"How to run this loop (Codex CLI)"** preamble
  (per-stage `codex exec`, evaluator-as-separate-`codex exec`, re-read-disk on
  `codex resume`), and the large-altitude Orchestration block now names concurrent
  `codex exec` + worktrees. The emitted JSON, the validation gate, and the REFUSED
  behavior are unchanged.
- **evals** — C41 (codex-preamble present + a `codex exec` occurrence in the rendered
  runbook) and C42 (no Claude primitives — no `subagent` / `Task tool` / `CLAUDE.md`
  / `/compact` — in each golden's rendered runbook). Battery is 71/71 (the 69
  inherited linter/renderer cases + these 2).
- **`assets/golden-loop-design-large.json`** — a passing **large-altitude** (fan-out)
  fixture, so the render set covers the large Orchestration preamble (see Fixed).

### Fixed (pre-release)
- **Banned-token self-check coverage gap (NB-1).** The large-altitude Orchestration
  preamble in `render_loop_doc.mjs` used the literal word "subagents" (in a clause
  saying Codex *lacks* them), but C41/C42 only rendered the flat + medium goldens —
  the `large` path was never checked, so C42's own `/subagent/i` ban would have
  flagged the skill's own `large` output. Reworded the preamble to carry no banned
  token ("Codex is single-agent, so fan-out is N concurrent OS processes, not
  in-process spawning") and extended C41 + C42 to also render the new large golden.
  Escaping/validation untouched; still 0.1.0.

### Changed (surgical prose deltas vs the sibling)
- `references/loops-model.md` — "compaction-survival contract" → context-loss /
  `codex resume` survival.
- `references/loop-selection.md` — D4 fan-out now names concurrent `codex exec`
  processes + worktrees + on-disk ledger (no in-process subagents).
- `assets/fresh-reader-checklist.md` — "survives a compaction" → survives context loss
  / `codex resume`.

### Grounding
- The loop-principle KB is **referenced, not embedded** (no duplicate 5.5 MB copy).
  Default `<kb>` = the sibling `../loop-constructor/loop-principle`; `$LOOP_PRINCIPLE`
  overrides. Installed without the sibling ⇒ KB-degraded mode (acceptable; the skill
  says so in its report).

### Compatibility
- The loop-design JSON schema is identical to `loop-constructor` 0.2.0. A design
  produced by either skill lints and renders under the other.
