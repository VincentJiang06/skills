# skill-tester notes — dogfooding loop-constructor-codex v0.1.0

Fresh executor running the skill's five phases (SELECT → NEGOTIATE → FILL → VERIFY →
PERSIST) on two real briefs. Recording friction honestly — this is the dogfood signal.

## What worked well

- The **D0–D6 procedure** (`references/loop-selection.md`) is genuinely operational: each
  decision has a clear rule and forces a written justification, so the loop shape is a
  reviewable derivation, not a vibe. D4 (medium vs large) and D6 (cadence) in particular
  removed guesswork.
- The **linter** is fast, deterministic, and the FAIL messages are actionable. Both designs
  passed on the first real run (I built to the shape doc). Re-running is byte-stable.
- The **renderer** refusing to emit a runbook for a linter-invalid design is a good
  fail-closed property — a written `.loop/` doc is itself proof the design passed.
- **Codex-runtime mapping** (`references/codex-runtime.md`) is concrete: three roles = three
  `codex exec`; state on disk (AGENTS.md, not CLAUDE.md); parallelism = worktrees + ledger.
  It made the large-case orchestration easy to express correctly.
- The **fresh-reader checklist** (`assets/fresh-reader-checklist.md`) caught things the
  linter structurally can't — it pushed me to state the untracked-test-file residual (NB-2)
  instead of hand-waving the drift gate.

## Findings / friction

### NB-1 (MEDIUM) — FIXED (pre-release) — the skill's banned-token self-check never exercised the large path
The renderer's **large-altitude** orchestration preamble used to emit, verbatim:
`(Codex has no in-process subagents)`.
So a case-insensitive `/subagent/i` grep over any large runbook matched — including the one
I produced for case-02 — and the skill's own eval `C42_no_claude_primitives` only rendered
`golden()` (flat) + `goldenStaged()` (medium), **neither `large`**, so C42 passed 71/71
while never exercising the preamble that carried the banned word; its own regex would have
flagged its own `large` output.

**Fix applied (option 1, still 0.1.0):**
- `render_loop_doc.mjs`'s large-altitude preamble was reworded to carry no banned token:
  "Codex is single-agent, so fan-out is N concurrent OS processes, not in-process spawning."
  Escaping/validation untouched.
- Added a passing large-altitude golden `assets/golden-loop-design-large.json` (derived
  from this session's case-02 design; lints PASS).
- Extended `C41_codex_preamble` and `C42_no_claude_primitives` to also render the large
  golden, so the large path (incl. its Orchestration preamble) is now banned-token-tested.
  Battery is **71/71, exit 0**.
- Case-02 was **re-rendered with the fixed renderer**; a full banned-token grep over the
  re-rendered runbook now returns **0 hits**. `SESSION.json` case-02's expectation is now a
  clean zero-banned-token check (the carve-out is removed). No coverage gap remains.

### NB-2 (LOW) — an easy-to-write-too-weak machine gate (design-side, not a skill bug)
When I wrote case-01's verify gate as `git diff --exit-code <baseline-tag> -- test/`, the
skill's own D2 anti-proxy guidance is exactly what reminded me it's **blind to a new
untracked test file** (git diff only sees tracked changes). I recorded it as a residual and
leaned the adversarial evaluator on it. Not a skill defect — rather, evidence the skill's
guidance works. A future skill improvement could be to ship a copy-paste "no test weakening"
snippet that already includes `git ls-files -o --exclude-standard` so authors don't
re-derive it each time.

### Minor ergonomics
- The renderer writes to `.loop/` **relative to cwd**, so I had to `cd` into each
  `produced/<case>/` dir before rendering to keep the manifest paths self-contained. The
  SKILL.md does call this out ("run it from inside … or move the artifacts"), but a
  `--out` that defaulted to the design file's own directory would remove the footgun.
- No KB-degraded mode hit: the sibling KB at `skills/loop-constructor/loop-principle` is
  present, so grounding resolved cleanly.

## Net
Both designs lint PASS, render clean Codex runbooks, and hold up under the fresh-reader
pass. NB-1 (the medium coverage-gap finding) is now FIXED pre-release — the large render
path is banned-token-tested and case-02 re-renders to zero banned tokens. One low
design-side note (NB-2) remains. `ready_for_external_eval: true`.
