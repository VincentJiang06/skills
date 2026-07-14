# Academic Pack — the complete `academic`-mode rewrite (SUBTRACT · register floor · ADD · arc)

> Load this **only when Step-0 locked `mode=academic` AND Step-1 did NOT abstain**
> (a rewrite is actually triggered). Never on the abstain path; never on a popsci
> job. This is one coherent file: what to SUBTRACT (mode-aware), the register floor
> the rewrite must never drop below, what to ADD, and the whole-document arc.
>
> **Also load, from here:**
> - EN lexical tells → `references/lexical-en.md` (load when the draft has English)
> - ZH lexical tells → `references/lexical-zh.md` (load when the draft has Chinese;
>   a mixed EN-in-ZH draft loads BOTH)
> - structural + statistical layer → `references/structural-signals.md` (every rewrite)
>
> The goal is publishable or reviewable academic prose, not lively internet prose.
> This skill is intentionally stricter than a general "humanizer".

---

## Step 2 — SUBTRACT (remove only what is an AI tell IN academic mode)

Remove the signals that matter **for academic register**. Weight **density and
co-occurrence** over any single word, and the **frame/structural layer over word
lists** (raw-vocabulary tells decay with each model generation; frames age better).

**Remove:** inflated/promotional vocab used as filler; AI connector overload
(Moreover/Furthermore/此外/与此同时 every paragraph); mechanical rule-of-three
scaffolding; report-shell *over-density* ("本节将……" / "This section will…" on every
subsection); evenly-sprinkled hedging; bold-label lists; chat residue;
present-participle significance tack-ons stacked at clause ends ("…, highlighting the
importance of…" with no new propositional content); and **mechanical citation shells**
("According to research…", "Studies have shown (Smith 2020)", a bare parenthetical
dumped at the end of every sentence, "Smith (2020) discusses X" with a contentless
verb — rework using ONLY the citations already present; see Step 3);
**over-claiming verbs beyond the evidence** ("proves/demonstrates/confirms" on a
correlation — weaken DOWNWARD only, never strengthen a hedge); novelty/effort padding
("for the first time", "extensive experiments" unsubstantiated); formulaic openers
("In recent years…" / "随着……的快速发展"); and speculative gap-filling (inventing an
interpretation to cover missing information — say what isn't known, or cut).

When removing a connector, **never bare-delete it**: replace it or restructure so the
logical link survives (`references/lexical-en.md` §10a–10b, `references/lexical-zh.md`
§7b).

### MANDATORY quota move (not advisory): contrast-frame compression

"不是……而是……/并非……而是……/这不仅是……更是……/X 的本质是……/真正的 X 是……" and
EN "not just X, but Y" / "It's not X. It's Y." / "less about X than Y" —
**default-rewrite every instance to the direct claim** (drop the negated strawman,
keep the assertion). **At most ONE may survive per document**, and only when the
source genuinely argues both sides (the denied position is real and cited, not a
strawman). If more than one survives, the rewrite is not done — go back. This is
checked again at Step 5.

### PRESERVE — these are NOT tells in academic writing (do not strip)

The detector and the general anti-AI denylist over-flag a set of features that are
**load-bearing in real scholarship**. Working academics use these constantly;
removing them damages the prose and often the meaning.

- **Discipline jargon** including `significant`/`significantly`/`robust`/
  `comprehensive`/`enhance`/`powerful`/`landscape` in **technical** use. Especially
  **"statistically significant"** — a precise technical term reporting a test result,
  not hype: "The effect was statistically significant (p < .01)" must stay. Keep
  "robust standard errors", "a robust estimator", "a comprehensive survey of the
  corpus", "a more powerful test/design". Cut only the vague brochure use ("a
  significant amount of attention", "a robust and comprehensive solution").
- **Three-item DATA enumerations** — three variables, conditions, datasets, or
  measured quantities is reporting, not a "forced triad". Preserve. (Down-weight the
  controlled-asymmetry rule for *data* lists; it targets rhetorical triads.)
- **Numbered sections / subsections** (2.1, 3.4, §4.2) — standard scholarly
  navigation, not an AI template. Keep the numbering.
- **A single "This paper presents / examines / argues…" in an abstract** — a normal
  abstract convention. One is fine; only flag the *repeated*, every-paragraph "This
  section will discuss…" scaffolding.
- **"These results suggest" / "These findings indicate"** — calibrated inference
  language linking evidence to claim. This is exactly the hedging to preserve.
- **Chinese genuine logical connectives** — 对……进行……分析 / 研究表明 / 这说明 /
  结果显示 / 由此可见, when they carry real logical work (introducing a method,
  reporting a finding, drawing an inference). Standard 学术汉语. Strip only the
  *empty, repeated* frame use (e.g. every paragraph opening 研究表明 to say nothing new).
- **Discipline conventions vary — do not "correct" them.** Ethnographic /
  anthropological / qualitative work legitimately uses first-person ("I conducted 42
  interviews…", "我在田野中观察到"), reflexivity, and thick narrative detail — none of
  that is an AI tell or a register slip. Quantitative methods sections legitimately run
  passive-heavy ("surveys were administered…") — do not force active voice there. Match
  the field's norm, which the source itself displays.
- **Passive voice is a density-and-place judgment, not a denylist.** Passive stacked
  wall-to-wall through findings/discussion (where authors claim agency: "we find", "I
  argue") reads machine-made; passive in methods or where the agent is unimportant is
  standard scholarship. Never mechanically flip voice.
- **Non-native academic English is not an AI signal.** Real ESL scholarly prose is
  flagged by detectors at several times the native rate; elevated formality and
  textbook connectors can be genuine learned register. This is exactly what the
  abstain gate protects.

> A rewrite that scrubs "statistically significant", renumbers away "3.4", or deletes
> every "研究表明" has **lowered the register** and may have broken the claim — that is
> a regression, not a humanization.

---

## Register floor — the guard the rewrite must not drop below

This is the **register-preservation guard** for `academic` mode, consulted at
preflight (to lock register) and again at the final re-check. The headline failure
mode it guards is **register collapse**: making academic prose casual/chatty in the
name of "humanizing".

### Default stance
- formal but not inflated
- clear but not chatty
- precise but not overloaded
- readable but not casual

### Preserve
- citations, quotations, table and figure references
- dates, numbers, units, and named entities
- technical terminology
- justified hedging
- section logic and argument order

### Prefer these transformations
- evaluation → evidence
- over-claiming verb → evidence-matched verb (downward only: an unsupported "proves"
  becomes "suggests"; a genuine hedge is never strengthened)
- uplift → consequence
- noun-heavy clause → concrete verb
- sloganized contrast → direct claim
- mechanical paragraph frame → tighter logic
- stacked hedging → calibrated hedging
- bold lead-in list or report shell → plain prose unless the list carries real
  analytical work

### Section-specific guidance
- **Abstract** — cut rhetorical warm-up; lead with question, method, finding, or
  claim; keep compression high.
- **Introduction** — state the problem directly; remove generic "with the continuous
  development of…" openings; keep only the background the argument needs.
- **Literature review** — summarize positions, gaps, and disagreements concretely;
  avoid generic consensus language unless the literature actually supports it.
- **Analysis / discussion** — make causal logic explicit; prefer one precise inference
  over multiple padded paraphrases; do not announce the analysis before doing it.
- **Conclusion** — end with an implication, limitation, next step, or forecast that is
  actually grounded; avoid empty uplift.
- **Reports and policy papers** — keep section structure if it aids navigation, but
  avoid turning each subsection into a template heading plus bullet list; prefer plain
  paragraph openings over management-report labels.

### What not to add
slang · banter · ironic asides · jokes · forced first-person reflection · rhetorical
questions used only for flavor · deliberate grammatical imperfections.

### Mixed-language handling
- Keep established English technical terms when they are standard in the field.
- Do not over-translate institutional names or domain terms if the source uses the
  English form.
- Follow Chinese punctuation norms in Chinese sentences and English punctuation norms
  in fully English sentences.

### Stance and hedging are not opposites
Adding authorial stance (ADD §1) does **not** mean removing hedging. A committed
academic claim is still *calibrated*: "the evidence indicates X" commits to X while
marking how strongly. Preserve hedges that carry epistemic meaning (may / appears /
likely / 可能 / 或许 / 倾向于); only collapse *stacked, empty* hedging ("could
potentially possibly" → "may"). Never convert a meaningful hedge into false certainty.

> **When in doubt** — choose the clearer and more restrained phrasing, not the livelier
> one.

---

## Step 3 — ADD human texture (without inventing)

SUBTRACT alone leaves prose scrubbed but flat, stance-less, abstract — still
machine-reading. **Once a rewrite is triggered, the ADD below is required, not
optional**, bounded hard by zero net-new facts: **never invent** a number, case,
study, quote, citation, mechanism, analogy, or implication. Specificity is
**retrieval from the source**, never generation. If the source has none, keep it
general (you may name the gap).

**Do at least both moves, every triggered academic rewrite:**

1. **Surface ≥1 committed claim with calibrated confidence** — state a point the
   source already makes as a held, calibrated claim (`the evidence indicates`, `more
   plausibly`, `on balance`, `I read this as`, `证据表明`, `更可能的解释是`,
   `据此判断`), not a survey of possibilities. Calibration ≠ casualness and ≠ dropping
   hedges.
2. **Promote ≥1 abstract summary into a concrete number / case / mechanism ALREADY IN
   THE SOURCE** — retrieve a specific figure, named entity, dated event, or causal step
   from elsewhere in the same text; never generate one. Plus: sentence/paragraph-length
   variance; controlled asymmetry (not every list is three — but data enumerations are
   not forced triads).
3. *(conditional — fire when Step 2 found mechanical citation shells)* **Re-integrate
   the EXISTING citations as substance** — make cited scholars agents of the claims the
   source already attributes to them ("Putnam (2000) argues…" not "According to
   research…"); state the specific finding the text already gives. **Rearrangement
   only** — zero citations added, zero dropped, nothing attributed that the source does
   not itself state.

Texture has **four pillars**. They raise human-ness *without lowering register*.

### 1. Authorial stance (committed claim + calibrated confidence)
AI prose hovers, listing considerations with every hand on the table. Human scholars
commit — then calibrate with epistemic markers that match the evidence.

**EN — before (stance-less):**
> There are several factors that may influence Hong Kong's growth. International
> finance is one consideration. Innovation policy is another. Tourism also plays a role.

**EN — after (committed + calibrated, same facts):**
> On the official and IMF evidence, finance — not tourism or property — is the pillar
> most likely to carry the next five years; innovation policy could broaden the base,
> but only if it moves beyond announcements.

**ZH — before:**
> 香港经济的未来发展受到多方面因素影响。国际金融是其中之一，创新科技也值得关注，旅游业同样发挥着作用。

**ZH — after:**
> 据官方与 IMF 的数据判断，真正能支撑未来五年的是金融，而非旅游或地产；创新科技或可拓宽增长面，但前提是落到研发与就业，而不止于政策宣示。

### 2. Source-grounded specificity (the number/case/mechanism already present)
AI prose defaults to the abstract noun. Humans name the specific thing — **when the
source contains it.** If the source does NOT contain a specific, do **not** manufacture
one; keep the claim general and, if useful, name the gap.

**EN — before (abstract):**
> The financial sector showed strong performance and reclaimed its leading role.

**EN — after (specifics lifted from the same source):**
> Hong Kong reclaimed the top global IPO market in 2025 with roughly HK$286 billion
> raised, while bank deposits passed HK$19 trillion.

**ZH — before:**
> 旅游业实现了显著恢复。

**ZH — after:**
> 访港旅客从 2021 年约 9.1 万人次回升到 2025 年的 4990 万人次——量已恢复，但人均消费与停留天数同期双双下降。

> Both "after" examples only re-use figures the source already stated. Specificity is
> **retrieval from the source**, never generation.

### 3. Syntactic + paragraph burstiness (deliberate length variance)
AI prose is rhythmically flat (topic → three supports → wrap, all one length). Humans
vary. A short, blunt sentence after a long one carries emphasis the flat version cannot.

- Mix sentence lengths on purpose; let one clause-heavy sentence be followed by a
  four-word one. `sentence_cv` should rise after a good rewrite.
- Heuristic (not a rule to game): a long passage should contain the occasional
  genuinely short sentence and never run three consecutive sentences of near-identical
  length. If every sentence lands 15–22 words, the rewrite isn't done.
- Vary paragraph shape: not every paragraph needs thesis-then-three-supports. Some make
  one point; some accumulate. (`paragraph_cv` rises too.)
- **Punctuation texture has its own quota.** Em-dashes and fragments are human devices
  AI now over-uses (dashes at several times human frequency): keep dashes to roughly one
  per ~300 words of academic prose, fragments rarer still — and only where they carry
  real emphasis. Injecting them as seasoning is the same uniformity failure in a new
  costume.
- This is a *diagnostic*, not a target to game: raise CV because the prose now has real
  emphasis structure, not because noise was injected.

**EN — before (uniform, ~18 words each):**
> The recovery in 2023 was uneven across the major sectors of the economy. The services
> sector rebounded quickly while the goods sector remained relatively soft. The labour
> market improved although it did not return to full strength.

**EN — after (varied):**
> The 2023 recovery was uneven. Services rebounded fast — private consumption rose 7.4%
> — while goods exports stayed soft in real terms, and the labour market, though
> improving, never reached full strength.

### 4. Controlled asymmetry (break the machine's symmetry)
AI prose is suspiciously balanced: every list is three, every "on the one hand" gets an
"on the other". Real argument is asymmetric — it spends more words where the point is
harder.

- Not every list is three. Make it two, or four, or prose.
- Drop the reflexive counter-balance when the source does not weigh both sides equally.
- Let the structure follow the argument's weight, not a template.

**EN — before (forced triad + mirror):**
> The strategy has three pillars: finance, innovation, and tourism. On the one hand, it
> offers opportunity. On the other hand, it carries risk.

**EN — after (asymmetric, weight on the real point):**
> Finance does most of the work here; innovation and tourism matter mainly insofar as
> they broaden a base that is still narrow. The risk is concentration, not the absence
> of opportunity.

### The two required ADD moves, together (one worked example)
Every triggered academic rewrite must do **both** §1 (a committed, calibrated claim) and
§2 (one abstract summary promoted to a source-present specific). Assume the source
elsewhere already states the 2025 IPO figure and the deposit total — nothing below is new.

**Before (SUBTRACT done, but ADD skipped — scrubbed yet flat/stance-less):**
> The financial sector experienced notable developments during the period. A number of
> indicators improved, and the sector reinforced its position within the regional
> economy. These trends point to a range of possible trajectories going forward.

**After (committed claim + source-present specific, register intact):**
> On the 2025 figures, finance — not property — is what carried the year: Hong Kong
> retook the top global IPO market with about HK$286 billion raised, and deposits passed
> HK$19 trillion. The evidence indicates a recovery led by capital markets; whether it
> broadens depends on demand the data does not yet show.

> What changed: "a range of possible trajectories" became a held, calibrated claim; the
> abstract "indicators improved" became the IPO and deposit figures **already in the
> source**. Zero new facts; hedging ("whether it broadens", "does not yet show")
> preserved.

---

## Step 4 — whole-document arc (long, multi-section inputs)

Treat a long document as a whole, not section-by-section. This is **shape across the
existing text**, under the same zero-net-new-facts rule — it adds **no** length and
**no** new content.

- **Vary section openings** — don't start every section the same way (every paragraph
  "本节将…", every section "X is an important…"); let openings differ.
- **One through-line** — keep a single load-bearing argument visible across sections so
  the arc builds, rather than marching finding-by-finding.
- **Synthesizing conclusion** — the close should *synthesize* (tie the threads into the
  through-line / state the standing implication) rather than recap the sections.

> **Completeness aim (finished, not fuller).** A rewrite should read as a *complete,
> finished scholarly passage*, not a de-slopped fragment: the through-line is visible
> from the opening, each section advances the same argument rather than restating it,
> load-bearing transitions still carry their logical work, and the conclusion resolves
> the thread the introduction opened. "More complete" means **better synthesis and arc
> of the material already present** — surfacing the source's own strongest connective
> logic and letting the argument land — **NOT** adding content, scope, or claims. Zero
> net-new facts still binds absolutely; if pushing "finished" tempts a new example,
> figure, or claim, stop — that is fact-invention, not completeness.

---

## ADD checklist (run after SUBTRACT, before the final register re-check)

- [ ] Is there at least one **committed, calibrated** claim (and one per major section
      in a long input)?
- [ ] Did I promote ≥1 abstract summary into a **source-present** specific — and add
      **zero** new facts/numbers/citations?
- [ ] Did sentence/paragraph length **vary on purpose** (does `sentence_cv` rise vs. the
      input, as a diagnostic)?
- [ ] Did I break at least one **forced symmetry** (triad / mirror) where the argument
      does not earn it?
- [ ] Did register stay academic (cross-check the register floor above)? No slang,
      banter, or fake imperfections introduced in the name of "texture".
- [ ] **Long inputs:** varied section openings, a single through-line, a **synthesizing**
      (not recap) conclusion — and does it now read as a *finished* passage, adding no
      length and no content?
