# Changelog — reorganize-logic

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
