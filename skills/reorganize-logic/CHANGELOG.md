# Changelog — reorganize-logic

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
