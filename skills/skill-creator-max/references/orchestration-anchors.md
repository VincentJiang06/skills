# Orchestration anchors + conventions (O-series, on-demand)

The conductor loads this only when it needs routing detail, gate classification, ladder conditions,
or ship conventions. It keeps SKILL.md thin. Every claim cites a `skill-philosophy` anchor as
**design-time provenance** — that KB is a separate local asset kept OUTSIDE the repo, NOT shipped and
NOT read at runtime. The rules are operationalized inline in the role-packs; the anchors are citation
labels, so this skill runs fully standalone (no KB present required).

---

## 1. The five artifacts — charters + acceptance (O1, P8)

The conductor's power comes from artifacts, never from reading a subagent's process. Each is typed,
machine-checkable, and **externalizable** (C8/AMZ-APIMandate): a fresh agent picks it up and works
with zero questions. Each artifact's hash / writer / acceptance status is logged in the conductor's
Decision Record ledger, which the conductor **alone** writes (A35 single-writer, O6).

| Artifact | Role | Grounding | Charter (one line) |
|---|---|---|---|
| SkillSpec | composer | C-series | A decision object with no implicit voids — every dimension filled, or explicitly unknown (with a discovery plan), or explicitly disputed. Reject is a legal output (C7). |
| Structure Contract | guidance | S-series | An executable micro-constitution: nouns (materials) + verbs (when read/run) + invariants (what's forbidden), each unit a ten-tuple with provenance. |
| Evidence Dossier | engineer | E-series | Layered doubt (E-L0..L5) + evaluator-audits-itself + a real red-light history. The gate re-runs the harness. |
| Compression Report | zipper | Z-series | Behavior-equivalence VETO first, token gain second (lexicographic). The one optional stage. |
| Decision Record + Learning Record | conductor | O-series | A complete decision object per gate + a learning record with three live destinations. |

Structure gates are **L0 only** — passing is never evidence the artifact is substantively right
(schema-valid ≠ true, O1 shadow / SELF-GBW). Substance is bought by the battery (O5) and by
second-order spot-checks on the artifact's most-gameable fields (empty `rejected`, blank
`provenance`, template `options_considered`).

---

## 2. min() routing table (O3, P0)

行为正确性 ≈ min(spec 完整度, 结构承载力, eval 证据力). On a gate failure the conductor emits a
**routing hypothesis** — the smallest term, not where it alarmed. This map is the starting prior;
it is a hypothesis, recorded in the Decision Record, and **voided + corrected** if the repair there
doesn't clear the failure (the router is itself audited, P5).

| Failure symptom | Most likely smallest term | Route to |
|---|---|---|
| eval red concentrated in an under-specified area | spec has high Unknowns density / blank field | composer |
| skill can't be built as specified (unbuildable design) | structure over/under-decomposed, wrong altitude | guidance |
| green suite that never went red / evaluator can't discriminate | Evidence Dossier: red-light or evaluator-calibration missing | engineer |
| behavior degrades only under context pressure | E-L3 pressure sentinel absent | engineer |
| token bloat / always-loaded body too heavy | Compression Report never ran or gate-1 failed | zipper |
| trigger fires wrong / sibling over-trigger | spec.trigger_tests weak (no near-miss negatives / neighbors) | composer |
| a "green but visibly wrong" output slipped a gate | battery independence too low (instance-tier where model needed) | conductor/battery |

Anchors: [PLT-定理1][SELF-debugloop].

---

## 3. Two-tier gate economics (O4, P9)

- **High-leverage gates** — first build, first ship, major version. Independent, veto-holding,
  expensive: the O5 battery. Never skipped at these points.
- **Routine gates** — each iteration, wording fix, small edit. Self-serve, machine-runnable
  checklist distilled from incident history (ORR pattern). **Never queue a fresh battery for a
  wording fix** (don't send the Bar Raiser to check attendance).

Checklist supply line: every incident postmortem produces a checklist entry (O8 → O4). Checklist
items must be machine-runnable where possible; human items get periodic spot-checks for
tick-vs-fact drift. Anchors: [AMZ-ORR][AMZ-Stripe评审][SELF-battery渐近].

---

## 4. Capability ladder (O7, P9 / PLT-定理5)

```
O-L0  every gate human-judged            (ships here — pipeline factory setting)
O-L1  machine checklist runs, human signs off
O-L2  routine gates auto, high-leverage gates human-judged
O-L3  battery auto-executes, veto reserved to human
O-L4  fully auto + periodic human spot-check
```

Upgrade conditions are **pre-registered** (e.g. O-L1→O-L2: routine checklist N consecutive rounds
zero disagreement with the human). Any serious incident **auto-demotes one level** (rollback before
autonomy, PLT-原则24); a demotion records its recovery condition (same pre-registration as upgrade).
Autonomy is bought by the Evidence Dossier, not by demo polish. Anchors: [PLT-定理5/宪法14/原则24][OAI-粒度表].

---

## 5. Release engineering (O9, P6+P9)

A skill is a live asset; a version change is a change to production behavior. Ship via
semver + staging→canary→prod + a CI eval gate (core regression subset must pass) + a canary
(small session share on the new version) + "metric regression ⇒ roll back to last-known-good."
For **low-frequency skills** (few triggers/month), the canary degrades to **shadow-run** (new+old in
parallel, record-only) with a longer window, not a traffic ratio. Never rsync-overwrite two live
installs in one step (that was the perl-rewriter double-install incident). Anchors: [WEB-CanaryPrompt][PLT-原则24][SELF-制品雏形].

---

## 6. Learning Record — three live destinations (O8, P6)

Every pipeline close emits a Learning Record whose lessons go three fixed places, each a
diff-checkable write:
1. **Checklist entry** (O4 supply line) — a routine-gate item.
2. **Gotcha backfill** (S6 supply line) — into the built skill's Gotchas, with provenance.
3. **KB revision** — may weaken/overturn an existing `skill-philosophy/` article. A long stretch
   with zero KB weakening = reflux dead (a KB that only grows is S8 debt). Anchors: [PLT-九步/定理8][AMZ-ORR][SELF-记忆断链].

---

## 7. Cross-cutting conventions (library-level L0, S7)

- **Install / naming.** Repo keeps the **bare** name (`skills/skill-creator-max/`, SKILL.md
  `name: skill-creator-max`). Installs carry the `vince-` prefix in BOTH `~/.claude/skills/` and
  `~/.agents/skills/` (name + trigger prefixed). Use a SAFE targeted name-fixer (exact string,
  `[ \t]` not `\s`) — the global perl rewriter has mangled common-word names before.
- **Description limits.** Portable hard limit 1024 chars (Kimi red line [CN-Kimi限制]); 320-char
  target. **Trigger precision beats the 320 target** for an expensive skill — spend chars on
  anti-triggers before trimming. Head prefix zero-dynamic (Z6 cache).
- **Bilingual README (standing rule).** Every skill ships `README.md` (简体中文 default) +
  `README.en.md` + `CHANGELOG.md`, and every skill update also updates the root project README
  (one-liner + changelog line). See memory `feedback-skill-update-readme-rule`.
- **Model-agnostic portability.** Role-packs + schemas are portable Markdown / six-vendor-
  intersection JSON (object root, all required, no `minLength`/`minItems`, snake_case, English), so
  any dispatched subagent — any vendor — can produce a conformant artifact. Reasoning-line models
  keep their `<think>` (never compressed, Z5 / CN-think不可压).
