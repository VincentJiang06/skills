# attacker

> Attacks a product's *actual observable behavior* in a fresh, TDD-decoupled subagent — or red-teams an idea/argument/plan (debate con-side) — within a declared scope, recording only proven, reproducible breakages.

**English** · [简体中文](README.md)

**What it does** — Mounts an adversarial attack on a feature/product's *observable behavior* (not its source), or on an *idea/argument/plan*, and writes each successful attack (proven, reproducible, `observed != expected`) as a machine-checkable "attack record" for the next round to fix. The output is a **handoff doc set**; it **never edits the target**. Pairs with [loop-constructor](../loop-constructor/) as attack→fix→re-attack.

**Why it's good** —
- **Auditable fresh-context independence** — each round runs as a new subagent given only "the requirement + the target's observable behavior," never the implementation source / TDD suite / author framing; every record carries an `independence_attestation`, and the validator **rejects** a confirmed record missing its withheld-context proof. The defect it hunts is the **false-positive test suite** — green TDD sitting on a broken product (a common-mode blind spot).
- **PROVE-OR-FLAG** — a finding is recorded only when it reproduces from a minimized input and a named oracle proves `observed != expected`; otherwise it becomes an explicit `needs_judgment` — never a fabricated default, never a silent drop.
- **Deterministic validator + non-vacuity self-test** — `scripts/validate_attack_records.mjs` enforces structure + reproducibility shape; `evals/run_all.mjs` runs a **planted-bug** (must be caught) + a **clean control** (must be zero false positives) anti-cheat gate.
- **product | idea modes + an attack-scope contract** — identical loop / verdict / budget / carry-forward; only the oracle and proof shape differ. `--scope` / `--out-of-scope` declare which domain is under attack, and out-of-scope finds are kept but not counted.

**When to use** — "attack this feature / try to break it" · "red-team this product" · "red-team this idea/argument/plan" · "find what the tests miss"; or call `/attacker`, or use it as the "attack round" node in a loop-constructor design.
**Not for** — writing/maintaining a project's own unit tests, "add a failing test first" → **vince-tdd** (attacker *distrusts* that suite; it attacks the running product); fixing the bugs it finds → a separate fix round (attacker only records, never edits the target); designing the whole loop → **loop-constructor** (attacker is one node); debugging a live Mini Program runtime with no "break it" framing → **mp-cli-sup**.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/attacker ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
