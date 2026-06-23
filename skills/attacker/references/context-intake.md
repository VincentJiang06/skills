# Context intake — feed the attack the sharpest possible context

Load this in **Preflight step 0 (CONTEXT)**, before scope/mode/budget. The thesis is
simple: **a sharper, better-scoped attack is downstream of better context.** A vague
"break this" forces the attacker to guess the target, the spec, and what even counts as
a break — and a guessed break is not a proven break. So the skill **actively encourages
more context: when the bundle is thin or ambiguous, PROMPT the user for the missing
specifics — ASK rather than guess.**

## The MANDATORY context+scope gate (v0.3.1) — do not attack until it is satisfied

Context+scope is a **HARD GATE**. The attacker MUST NOT attack until **(a) scope is clear**
(`summary.in_scope` declared and specific) **AND (b) context is sufficient**. The order:

1. **Use what the user gave.** Take the bundle (the checklist below).
2. **If insufficient, ASK** — prompt for the missing specifics (the elicitation prompts).
3. **If still thin, SELF-RESEARCH the project** to establish scope / attack surface / structure
   (the WHAT) — read the repo, map the surface, infer the boundaries. This is how a thin "break
   this" still becomes a sharp, scoped round instead of a guess. **Keep it bounded (v0.3.2, soft):**
   self-research stays **scope-relevant** and within the loose **`--max-context` (≈ 30k default)**
   ceiling — read what the declared scope needs, do NOT slurp the whole repo (a rough ceiling so
   context/cost don't balloon, not a hard gate).
4. **Record where the context came from** in **`summary.context_sources`** (≥1 non-empty strings,
   e.g. `"user-provided"`, `"self-researched: attack-surface map"`, `"self-researched: module
   structure"`). The validator requires this on a user-supplied summary.

**Self-research independence split (critical — do NOT re-contaminate debug expectations):**

- **debug pass** — self-research may map the **surface / requirement** (the WHAT), but you must
  still derive **EXPECTATIONS from the requirement, NOT from reading impl internals**. Reading the
  implementation to decide what "correct" is re-inherits the builder's blind spot — the exact
  false-green this skill exists to prevent. So: map the surface freely; derive `expected` only from
  the requirement.
- **structural pass** — **reading the structure IS the task** and is fine. You critique the
  design/logic you can see, against an external principle/goal (`critique_basis`), deriving
  `expected` (what good structure requires) independently from that principle — not from "whatever
  the code currently does is fine."

## The context checklist (take ALL that apply)

| Slot | What it is | Why it sharpens the attack |
|------|------------|----------------------------|
| **Target + type** | The product OR the idea/argument/plan, and `target.type` (`product` \| `idea`). | Selects the whole mode: product oracles + the impl/TDD firewall + a real seam, OR idea oracles + claim/not_strawman/derived_independently. |
| **Claim / requirement** | The thesis the idea asserts, or the requirement the product must meet. | This is what `expected` is derived from, **independently**. No claim → no oracle → no provable break. |
| **Constraints** | Hard limits the target operates under (env, inputs, assumptions, non-goals). | A "break" that violates a stated constraint is not a finding; constraints carve the legitimate attack surface. |
| **Success criteria** | What "working / correct" means here. | The inverse of success criteria IS the attack surface (spec-inversion). |
| **What counts as a real break** | The bar the user will accept as a genuine defect. | Aligns the oracle + severity with the user's bar; prevents both false positives and missed real breaks. |
| **In / out of scope** | Which domains/layers to attack (`--scope`) and which to exclude (`--out-of-scope`). | Becomes `summary.in_scope` / `out_of_scope`; every finding's `attack_scope` must match in_scope; out-of-scope discoveries are kept but not counted. |
| **Prior rounds** | The carry-forward ledger (round>1): surface map, attempted attacks, confirmed/fixed records. | Spend fresh budget on NEW surface, not re-deriving the plan (token waste). |

## How context feeds DESIGN

- **Claim + success criteria → spec-inversion**: invert each stated behavior/criterion into
  its violations — the seed of the attack tree.
- **Constraints + what-counts-as-a-break → the oracle + the severity bar**: pick the cheapest
  oracle that genuinely discriminates a real break at the user's bar.
- **In/out-of-scope → the scope contract**: the declared `in_scope` set is the only domain a
  finding may target; everything else routes to `out_of_scope[]` (kept, not counted).
- **Prior rounds → carry-forward**: skip/deprioritize already-tried low-yield attacks.

## Why MORE context = better attacks (and is independence-safe)

The more precise the context, the **sharper, better-scoped, and more provable** the attack —
a precise claim yields a precise `expected`, a precise scope yields a precise `attack_scope`,
a precise break-bar yields a precise oracle. Crucially this does **not** compromise
independence:

- **Product mode** — you still EXCLUDE the implementation source, the TDD/unit suite, and the
  author's framing/commentary (those re-inherit the builder's blind spot → green-suite /
  broken-product false positive). The context you take is the **requirement + observable
  behavior + scope + break-bar** — never the impl or its tests.
- **Idea mode** — the idea + its justification IS the input (you must read the steelmanned
  claim to attack it honestly: `not_strawman`). But the attacker **derives its critique
  independently** (`independence_attestation.derived_independently:true`) — it does NOT adopt
  the proposer's defense/rebuttal as settled.

## Elicitation prompts — use these when context is thin

Ask the smallest set that unblocks a sharp attack; do not interrogate. Examples:

- "Is the target a **running product** or an **idea/argument/plan**? (sets `target.type`)"
- "Should I hunt **concrete behavioral bugs** (`debug`), interrogate the **logic/architecture**
  (`structural`), or **both** — structural first, then debug? (sets `summary.attack_mode`)"
- "What **exact claim / requirement** should I hold it to? (this is what I derive `expected` from)"
- "What **counts as a real break** for you — what would you accept as a genuine defect?"
- "What's **in scope** (e.g. UI rendering, page navigation) and explicitly **out of scope** (e.g. backend logic, the auth wall)?"
- "Any **constraints or non-goals** I should respect, so I don't flag a deliberate limitation?"
- "What **success criteria** define 'working / correct' here?"
- (round>1) "Where's the **prior attack ledger** so I attack new surface, not re-run the plan?"

The closing line to the user: **"The more precise this context, the sharper and better-scoped
the attack — I'd rather ask than guess."**

## The machine handles on the summary

- **`summary.context_sources`** (v0.3.1, **REQUIRED**, ≥1 non-empty strings) — where THIS round's
  context came from (user-provided / self-researched: <what>). The validator enforces it on a
  user-supplied summary; it is the auditable trace of the mandatory-context gate above.
- **`summary.attack_mode`** (v0.3.1, REQUIRED, `debug`|`structural`|`both`), **`scope_change`**
  (`initial`|`stable`|`expanded`|`narrowed`), **`depth`** (int ≥1) — the round altitude, scope
  stability, and progressive-deepening level (see `references/attack-process.md`).
- **`summary.context_digest`** (v0.3.0, OPTIONAL) — a one-line attestation of what context the
  round's attacks were grounded in (claim/requirement, scope, break-bar). Kept lean; when present
  the validator only type-checks it (non-empty string).
