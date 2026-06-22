# attacker

> Attack a product's ACTUAL observable behavior — OR red-team an idea/argument/plan (debate con-side) — from a fresh, TDD-independent subagent; record only proven, reproducible breakages, within a declared attack scope.

**English** · [简体中文](README.md)

**What it does** — Adversarially attacks a feature's *observable behavior* (not its source) — or red-teams an *idea/argument/design/plan* — then writes the attacks that *succeeded* (proven, reproducible, `observed != expected`) as machine-checkable **attack records** for the next round to fix. The output is a **handoff document set** — it **never edits the target**.

**v0.3.0 — three coherent features:**
- **Attack-scope contract** — declare WHICH domains/layers are attacked. `--scope` → `summary.in_scope` (≥1 RICH free-form descriptors, e.g. "UI rendering errors", "page navigation/logic transitions"); `--out-of-scope` → `summary.out_of_scope`. Every confirmed record tags its `attack_scope` (∈ `in_scope`); an out-of-scope discovery goes in the top-level `out_of_scope[]` (kept, but NOT counted as a finding). So "attack the UI" hits UI rendering + page navigation, NOT backend logic.
- **Product | Idea modes** (`target.type`) — SAME loop / round-verdict / budget / carry-forward; only the oracle + proof shape change:

  | | **product** | **idea** (debate con-side) |
  |---|---|---|
  | Target | a running feature/function/endpoint | an argument/design/plan/thesis (`target.statement`) |
  | Oracles | implicit / differential / metamorphic / control_vs_experiment / specified | counterexample / contradiction / unmet_assumption / scope_violation / infeasibility / missing_case |
  | Proof | repro + minimized_input + replayed_ok; `observed != expected` vs a baseline | `claim` + reasoning chain + minimal scenario + replayed_ok; `observed` (counter) != `expected` (what the claim predicts) |
  | Independence firewall | withhold impl source / TDD suite / author framing; real seam (no mocks) | take the claim + its justification, but derive the critique **independently** (`derived_independently`) + attack the steelmanned claim (`not_strawman`) |
  | `broke` / `clean` / `inconclusive` | proven break / no break in budget (≠ proven correct) / budget hit, nothing found | proven flaw / couldn't break in budget (≠ proven true) / budget hit, nothing found |

- **Rich context intake (encouraged)** — Preflight takes a context bundle (target+type, claim/requirement, constraints, success criteria, what-counts-as-a-break, in/out-of-scope, prior rounds) and **actively asks for more when it's thin: the more precise the context, the sharper and better-scoped the attack — ask rather than guess.** See `references/context-intake.md`. Optional one-line `summary.context_digest` attests what the round was grounded in.

**v0.3.1 — five coherent additions (orthogonal to `target.type`):**
- **Attack MODE `attack_mode`: `debug` | `structural` | `both` (the round's ALTITUDE)** — `debug` = the concrete behavioral bug-hunt (existing flow); `structural` = interrogate the project's **LOGIC/ARCHITECTURE** (design problems, coupling, logic-flow, missing/leaky abstractions, inconsistent patterns), higher altitude; `both` = **STRUCTURAL FIRST, then debug**. Every record carries `attack_kind` (`debug`|`structural`) which must be PERMITTED by `attack_mode` (debug→only debug; structural→only structural; both→either) or it's REJECTED.
- **Independence refined per `attack_kind`** — `debug` records keep the **v0.3.0 product|idea firewall unchanged**; `structural` records are **allowed to see the structure** (drop impl-withholding + real-seam) and instead require **`critique_basis`** (the external design principle / stated goal violated) + `derived_independently:true` + `observed != expected` + a **structural oracle** (idea oracles + `specified`). Guard: a structural record using a product behavioral oracle (e.g. `metamorphic`) is REJECTED; the structural relaxations do NOT leak into debug.
- **Context MANDATORY + self-research (hard gate)** — do NOT attack until scope is clear AND context is sufficient; if not, ASK the user, then **SELF-RESEARCH** the project for scope/surface/structure (the WHAT). `summary.context_sources` (≥1 non-empty strings) records where context came from. Independence split: `debug` may map the surface but still derives EXPECTATIONS from the requirement, not impl internals; `structural` reading the structure is expected.
- **Scope stability / incremental expansion** — `summary.scope_change` (`initial`|`stable`|`expanded`|`narrowed`): each round stays stable OR expands INCREMENTALLY, never a wild jump.
- **Progressive deepening** — `summary.depth` (integer ≥1): round>1 regression-checks prior records by `regression_key` FIRST → uses that to FILL context → then goes DEEPER (`depth` increments), never restarting from scratch.

**Why** — The defect it targets is the **false-positive test suite**: a green TDD suite on top of a broken product. The cause is **correlated error** — a test, a mock, an "expected" fixture, even the author's framing of "what it should do," produced from the *same mental model* as the impl, inherits that model's misread (Knight–Leveson: the specification is the dominant common-mode channel). The only fix is **engineered independence**: the attacker runs from a context that never saw the impl, the tests, or the author's framing. **Independence is the entire value proposition.**

**What's good about it** —
- **Fresh-context independence (auditable)** — each round runs as a fresh subagent given ONLY the requirement + the target's observable behavior; never impl source / TDD suite / author framing. Every record carries an `independence_attestation`; the validator **REJECTS** a confirmed record whose `withheld` omits `implementation_source` or `tdd_suite`.
- **PROVE-OR-FLAG** — a finding is recorded only when reproducible from a minimal case AND `observed != expected` is shown via a *named* oracle; otherwise it goes to an explicit `needs_judgment[]` — never a fabricated default, never a silent drop.
- **Deterministic validator + non-vacuity self-test** — `scripts/validate_attack_records.mjs` enforces structure + reproducibility shape; `evals/run_all.mjs` runs a **planted-bug** fixture (must be caught) and a **clean-control** (must yield zero findings) as the anti-gaming gate.
- **Enumerable attack surface** — `assets/payload-library.json` ships boundary values (AFL interesting values), the Unicode/CJK set, and the business-logic abuse catalog as DATA, so coverage is visible and gaps are visible.

**When to use** — "attack this feature / try to break it", "red-team this product", "red-team this idea/argument/plan (debate con-side)", "find what the tests miss", "$attacker", or as the attack-round node of a loop-constructor loop.

**Do NOT use for (route away)** —
1. Writing/maintaining the project's own unit tests, or "add a failing test first" → **vince-tdd** (attacker *distrusts* that suite and attacks the running product).
2. Fixing the bugs it finds → a separate fix round/skill (attacker only records; it never edits the target).
3. Designing the overall loop → **loop-constructor** (attacker is one node).
4. Debugging a live MP runtime / inspecting pageData with no break-it framing → **mp-cli-sup**.

The sharpest boundary is vs **vince-tdd**: same word (test/break), opposite stance — TDD *grows* the builder's spec suite; attacker *attacks* the running product from a decorrelated context.

**The loop it lives in (attacker is the loop's STOP-CONDITION)** — a loop runs `A→B→C→attack`; each attack round emits a machine-readable `round_verdict` the loop branches on:
```
A→B→C→attack ─┬─ round_verdict:clean        → STOP (converged / done) — clean ≠ proven correct, only "no proven break within budget B"
              ├─ round_verdict:broke        → fix round → re-attack
              └─ round_verdict:inconclusive → loop-owner-decides (budget hit, nothing found — a qualified stop)

round N    attacker  → READ/DESIGN/EXECUTE/PROVE/RECORD → attack-records.jsonl (proven breaks)
round N+1  fixer     → repairs the proven breaks (separate skill/agent)
round N+2  attacker  → regression by regression_key + new surface
```
- **Dual hard budget (never an endless attack)** — `--budget N` (attempts) + `--max-tokens T` (token consumption, **not** wall-clock), stop at whichever hits first; exhaust-budget mode reports **all** proven breaks in one round for a batch fix, not first-break.
- **Carry-forward attack ledger (saves tokens)** — a round>1 **inherits its own prior attack ledger** (surface map + attack tree + attempted-breaks + confirmed/fixed records by `regression_key`) and re-derives only **new** surface, never re-planning from scratch; it records the inherited round as `carried_from_round`. **Never inherited**: impl source / TDD suite / author framing (independence preserved).

**Install** — `cp -R skills/attacker ~/.claude/skills/` (deploys by the SKILL.md `name`). Attack records + the battery ledger live under the **target project's** `.loop/` (project-local).

See [SKILL.md](SKILL.md) for the full runbook.
