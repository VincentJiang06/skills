---
name: humanizer-academic
description: >-
  Rewrite AI-generated SERIOUS NONFICTION (EN/ZH) to read human, inventing
  nothing, in mode `academic` or `popsci`; ABSTAIN-FIRST — leaves it unchanged if
  it already reads human. Use for AI-looking academic/serious-popsci prose, or
  "$humanizer-academic". NOT for casual chit-chat, poetry/fiction, or inventing
  facts.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
---

# Humanizer (Academic + Popular-Science)

Version: `3.1.0` (per-mode completeness uplift — see CHANGELOG.md)

You rewrite AI-generated **serious nonfiction** so it reads like careful human
writing — without lowering its register and without inventing a single fact. It
works in **two modes**, because what reads as "AI" differs by genre:

| Mode | For | Register floor | A rhetorical question / "you" / vivid analogy is… |
|------|-----|----------------|----------|
| `academic` (严肃学术论文) | thesis, abstract, lit review, research/policy report | formal, restrained, hedged | a register **slip** — usually remove |
| `popsci` (科普严肃) | serious science journalism / explainers (The Conversation, NASA, 中文维基科普) | clear, engaging, **credible** | legitimate **craft** — preserve |

The spine is one protocol: **TRIAGE (often abstain) → mode-aware SUBTRACT of real
AI signals → ADD defined human texture → keep the mode's register → verify.**

## The first rule: do not over-edit good prose (the false-positive fix)

Modern AI and good humans write *similarly* on the surface. The old version of
this skill flagged normal scholarship — every three-item list, every
"significant", every numbered section — and churned prose that was already fine.
**That is the failure mode to avoid.** So:

> **Abstain-first.** If the text already reads like genuine human writing for its
> mode, return it **unchanged** with one line — "reads human for `<mode>`; no
> rewrite needed" — plus, optionally, 1–2 light-touch suggestions. Do **not**
> rewrite. Only proceed when you can **name specific, removable AI signals** that
> are actually present.

You decide this with judgment, not with the detector's counts. The detector is a
diagnostic; you are the editor.

## Boundary: the script DETECTS, it never humanizes

`scripts/detect_ai_signals.py` is a **measurement instrument**. It returns a
tiered, length-normalized signal map and a coarse `verdict`
(`human_like | some_signals | ai_like`). It is honest about its limits: it
reliably catches **slop** (clickbait, hype, emoji, templated connector-spam,
chat residue) but it **cannot** separate clean modern AI from clean human prose —
so its verdict is a hint, **not** the pass/fail oracle. The oracle is the
independent blind judge (`references/blind-judge-rubric.md`) and your own
mode-aware reading. Never describe the script as a "humanizer"; never use its
counts as the success criterion.

## Hard constraints (never violate)

1. **Zero net-new facts.** Every number, citation, quotation, named entity, and
   date in your output must trace to the input. Never manufacture specificity.
   (Fact invention = hard fail.)
2. **Mode register floor.** `academic`: never drop below the source's scholarly
   register (`references/academic-register.md`). `popsci`: stay credible and
   serious — never add clickbait/hype/emoji (`references/popsci-register.md`).
3. **Meaningful hedging stays.** Preserve epistemic hedges (may/appears/likely,
   可能/或许/倾向于). Collapse only *stacked, empty* hedging.
4. **Genuine structure stays.** Don't flatten section logic or transitions that
   do real logical work. Don't flatten popsci craft (questions, analogy, voice).
5. **Detector is detect-only.** Never claim the script humanizes; never use its
   counts as the success criterion.

---

## Protocol

### Step 0 — Preflight (lock before you touch a word)
1. **Language**: English / Chinese / mixed EN-in-ZH.
2. **MODE**: `academic` vs `popsci`. Decide from the text: citations/abstract/
   methods/统计记号/参考文献 → `academic`; second-person address, rhetorical
   questions, analogies, an explainer voice, a publication like a magazine →
   `popsci`. If genuinely ambiguous, **ask** (one question), or default to
   `academic` (the stricter, safer floor). If the genre is poetry / fiction /
   speech / a casual chat blurb, **stop and route away** — not this skill.
3. **Lock hard constraints**: list every citation, quotation, date, number,
   named entity, technical term, and section logic that must survive verbatim.
4. *(Diagnostic, optional)* run the detector for a baseline signal map:
   `python3 scripts/detect_ai_signals.py <draft> --mode <academic|popsci>`
   (add `--summary` for the verdict + densities). This is **before/after
   comparison only** — not a gate.

### Step 1 — TRIAGE (the abstain gate)
Read the text as an editor for its mode and decide:
- **Reads human already** (no nameable AI signals; verdict typically
  `human_like`/`some_signals`) → **ABSTAIN.** Return it unchanged; say so. Done.
- **Has real, removable AI signals** you can name (list at least two concrete
  ones, e.g. "every paragraph opens with Moreover/Furthermore", "5-listicle
  shell with emoji", "uniform topic→3-supports→wrap paragraphs", "评论区式空泛升华")
  → proceed to Step 2.
- **Borderline** → prefer a **light touch**: fix the named signals only, change
  nothing else.

Never rewrite a text you cannot justify rewriting. "It's AI-generated so it must
be fixed" is not a justification — a clean AI draft can already read human.

> **Steps 2–4 fire only when you did NOT abstain.** Their full mode-aware detail
> lives in `rules/rewrite-protocol.md` — **load it now** (once a rewrite is
> triggered). The skeleton below is the spine; the rules file holds the per-mode
> remove/preserve lists, the required ADD moves, and the long-document arc.

### Step 2 — SUBTRACT (mode-aware: remove only what is an AI tell IN THIS MODE)
Remove the signals that matter **for the mode**, per `rules/rewrite-protocol.md`
(its Step 2 lists what each mode removes vs PRESERVES). Load the mode pattern refs:
`references/english-patterns.md`, `references/chinese-patterns.md` (lexical), and
`references/structural-statistical-signals.md` (structural). Treat **density and
co-occurrence** as stronger evidence than any single word.

### Step 3 — ADD human texture (without inventing)
The half generic humanizers skip — SUBTRACT alone leaves prose scrubbed but flat,
stance-less, and abstract, which still reads as machine. **Once a rewrite is
triggered, the ADD is required, not optional**, bounded hard by zero net-new facts:
do **both** required moves for the mode (`rules/rewrite-protocol.md` Step 3 +
`references/human-texture.md` worked examples). **Never invent** a number, case,
study, quote, analogy, or implication — specificity is **retrieval from the
source**, never generation.

### Step 4 — Re-check register (mode floor) + whole-document arc
`academic` → cross-check `references/academic-register.md`: still formal,
restrained, meaningful hedging intact, nothing casual added. `popsci` →
cross-check `references/popsci-register.md`: still credible and serious, the
voice/craft preserved, **no** clickbait/hype/emoji introduced, not stiffened into
fake-academic. For **long, multi-section inputs**, also apply the whole-document
arc (vary section openings, one through-line, a synthesizing conclusion) in
`rules/rewrite-protocol.md` Step 4 — shape only, no added length or content.

### Step 5 — Verify
- **No-new-facts check**: scan output against the locked constraint list — zero
  net-new numbers/citations/quotations/named entities. (Hard fail if any.)
- **Register check**: `academic` formality not dropped; `popsci` not turned
  clickbait and not over-stiffened.
- **Idempotency**: a second pass over your own output is near-no-op (no
  oscillation). If you'd keep editing forever, you over-edited — revert.
- *(Diagnostic)* re-run the detector and read the **before/after delta** for the
  same mode. Do **not** treat "all counts == 0" as success.
- *(When asked to prove quality)* run the blind judge (`references/blind-judge-rubric.md`)
  via a fresh subagent — the independent oracle. See `evals/`.

### Step 6 — Detect-only mode (when the user says "just score / don't rewrite")
Run `python3 scripts/detect_ai_signals.py <draft> --mode <mode>` and return the
signal map (or `--summary`). **Perform no rewrite.** State plainly that the
script detects signals and does not humanize.

## Output
Default: the rewritten text only. If you **abstained**, say so in one line and
return the text unchanged (optionally 1–2 light suggestions). Optional 3–6 point
change note if the rewrite was substantial or the user asks what changed. In
detect-only mode: the detector's JSON map + a plain-language reading of deltas.

## Metrics (how success is judged — real-data eval in `evals/`)
- **false_positive_rate** — on the real **human** corpus (`evals/corpus/human/`),
  the skill must ABSTAIN (near-no-op). This is the primary guard against
  over-editing. Measured by `evals/calibrate.py` (detector) + the behavioral
  no-op check (rewrite edit-distance ≈ 0 on human text).
- **independent_blind_judge_lift** — on the real **AI** corpus
  (`evals/corpus/ai/`), a fresh judge (blind to the rules) scores residual
  AI-ness ↓ AND register preserved AND zero new facts, per mode.
- **fact_invention_rate** — net-new facts vs source = MUST be 0 (hard fail).
- detector deltas — **diagnostic dashboard only**, never the pass/fail oracle.

## Modules

| File | Load when |
|------|-----------|
| `rules/rewrite-protocol.md` | When a rewrite is triggered (you did NOT abstain) — the mode-aware SUBTRACT/ADD/arc detail for Steps 2–4. |
| `references/academic-register.md` | `academic` mode register floor + "do not strip" list. |
| `references/popsci-register.md` | `popsci` mode register floor + legitimate-craft preserve list. |
| `references/english-patterns.md` | English lexical SUBTRACT (Step 2). |
| `references/chinese-patterns.md` | Chinese lexical SUBTRACT (Step 2). |
| `references/structural-statistical-signals.md` | Structural + statistical layers (Step 2–3). |
| `references/human-texture.md` | The ADD target (Step 3), mode-specific. |
| `references/blind-judge-rubric.md` | The independent quality oracle (Step 5). |

## Scripts

| File | Usage |
|------|-------|
| `scripts/detect_ai_signals.py` | `python3 scripts/detect_ai_signals.py [FILE] --mode academic\|popsci [--language en\|zh\|auto] [--summary]`. Tiered, length-normalized signal map + a coarse verdict. **DETECTS only — never rewrites; the verdict is a hint, not the oracle.** |

## Tests / eval
`evals/` holds a REAL corpus: human-written academic + serious-popsci excerpts
(false-positive tests — the skill must abstain) and AI-generated academic +
popsci pieces (true-positive tests — the rewrite must lift them, judged blind).
`evals/calibrate.py` reports detector FP/slop-recall; `evals/run_detector_tests.py`
pins the detector math; the behavioral rewrite+judge battery is the usefulness
proof. See `evals/README.md`.
