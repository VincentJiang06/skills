# attacker

> Attack a product's ACTUAL observable behavior from a fresh, TDD-independent subagent; record only proven, reproducible breakages.

**English** · [简体中文](README.md)

**What it does** — Adversarially attacks a feature's *observable behavior* (not its source), then writes the attacks that *succeeded* (proven, reproducible, `observed != expected`) as machine-checkable **attack records** for the next round to fix. The output is a **handoff document set** — it **never edits the target**.

**Why** — The defect it targets is the **false-positive test suite**: a green TDD suite on top of a broken product. The cause is **correlated error** — a test, a mock, an "expected" fixture, even the author's framing of "what it should do," produced from the *same mental model* as the impl, inherits that model's misread (Knight–Leveson: the specification is the dominant common-mode channel). The only fix is **engineered independence**: the attacker runs from a context that never saw the impl, the tests, or the author's framing. **Independence is the entire value proposition.**

**What's good about it** —
- **Fresh-context independence (auditable)** — each round runs as a fresh subagent given ONLY the requirement + the target's observable behavior; never impl source / TDD suite / author framing. Every record carries an `independence_attestation`; the validator **REJECTS** a confirmed record whose `withheld` omits `implementation_source` or `tdd_suite`.
- **PROVE-OR-FLAG** — a finding is recorded only when reproducible from a minimal case AND `observed != expected` is shown via a *named* oracle; otherwise it goes to an explicit `needs_judgment[]` — never a fabricated default, never a silent drop.
- **Deterministic validator + non-vacuity self-test** — `scripts/validate_attack_records.mjs` enforces structure + reproducibility shape; `evals/run_all.mjs` runs a **planted-bug** fixture (must be caught) and a **clean-control** (must yield zero findings) as the anti-gaming gate.
- **Enumerable attack surface** — `assets/payload-library.json` ships boundary values (AFL interesting values), the Unicode/CJK set, and the business-logic abuse catalog as DATA, so coverage is visible and gaps are visible.

**When to use** — "attack this feature / try to break it", "red-team this product", "find what the tests miss", "$attacker", or as the attack-round node of a loop-constructor loop.

**Do NOT use for (route away)** —
1. Writing/maintaining the project's own unit tests, or "add a failing test first" → **vince-tdd** (attacker *distrusts* that suite and attacks the running product).
2. Fixing the bugs it finds → a separate fix round/skill (attacker only records; it never edits the target).
3. Designing the overall loop → **loop-constructor** (attacker is one node).
4. Debugging a live MP runtime / inspecting pageData with no break-it framing → **mp-cli-sup**.

The sharpest boundary is vs **vince-tdd**: same word (test/break), opposite stance — TDD *grows* the builder's spec suite; attacker *attacks* the running product from a decorrelated context.

**The loop it lives in** —
```
round N    attacker  → READ/DESIGN/EXECUTE/PROVE/RECORD → attack-records.jsonl (proven breaks)
round N+1  fixer     → repairs the proven breaks (separate skill/agent)
round N+2  attacker  → regression by regression_key + new surface
```

**Install** — `cp -R skills/attacker ~/.claude/skills/` (deploys by the SKILL.md `name`). Attack records + the battery ledger live under the **target project's** `.loop/` (project-local).

See [SKILL.md](SKILL.md) for the full runbook.
