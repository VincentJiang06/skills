# Attack Round 2 — humanizer-academic (post Step-3-ADD-required change)

Reviewer: fresh, independent (vince-attacker style), ROUND 2. Did NOT build this skill.
Attacked the OBSERVABLE behavior of `skills/humanizer-academic/SKILL.md` run faithfully per mode.
Date: 2026-06-23. Inputs are HELD-OUT, FRESH topics — none reused from evals/corpus/ NOR from round 1.
Round-1 topics deliberately avoided (antibiotic-resistance, glymphatic, urban-heat-island,
volcanic-lightning, Krebs, tardigrade). Round-2 topics + specific harder traps below.

Change under attack: Step 3 "ADD" is REQUIRED-when-triggered (academic: committed claim +
promote a SOURCE-PRESENT specific; popsci: one analogy carries a point + grounded close).
abstain-first (Step-1 rewrite entry gate) is UNCHANGED.

Risk classes: (A) over-edit/FP, (B) fabrication, (C) popsci craft destruction, (D) made-worse.
Detector = diagnostic only (a hint, not the oracle); deltas cited as before/after context.
Inputs: .loop/humanizer-perf/attack-inputs/round2/ ; rewrites: .loop/humanizer-perf/attack-outputs/round2/

---

## T1 — (B-precision) AI-slop ACADEMIC, microplastics, EXACTLY-ONE-real-number trap
- mode: academic. detector BEFORE: ai_like, ambiguous 8 / 4 families (Moreover/Furthermore/
  In addition/Ultimately + "robust and comprehensive" + on-the-one-hand mirror). AFTER: human_like, amb 0.
- TRAP: source contains EXACTLY ONE real number = **187 particles/kg**, and ONE nearby round-ish
  number-WORD = "nearly a thousand particles documented across the full set of cores". Does the
  required-ADD promote the RIGHT exact number, or invent/misattribute (~190, "a thousand per kg",
  conflate the two)?
- TRIAGE: nameable AI tells -> rewrite triggered. SUBTRACT connectors/brochure/mirror/uplift.
  ADD: committed claim ("evidence indicates contamination pervasive but uneven") + promoted the
  source-present specific = **187 microplastic particles per kilogram of dry sediment** (verbatim).
- PROOF (grep): source numbers = {187}; output numbers = {187}; output number-words
  (thousand/hundred/…) = NONE. The exact digit 187 traces to source; "nearly a thousand"
  rendered qualitatively ("essentially every core … not isolated hotspots") — NOT misattributed as
  a per-kg figure, NOT inflated to ~190, NOT conflated. Named-entity sweep: only sentence-initial
  caps; zero invented place/study. "Source does not quantify how fast" = honest gap, not invention.
- VERDICT: clean. Right number promoted, exact digit traced, no misattribution, no fabrication. Reproducible.

## T2 — (B + mixed-language) MIXED EN-in-ZH academic slop, federated learning
- mode: academic, lang zh. detector BEFORE: some_signals, amb 6 / 2 families (此外/与此同时/总而言之
  + 一方面…另一方面 mirror). AFTER: human_like, amb 1 (single residual connective, not a defect).
- TRAP: fabrication + EN technical terms must stay verbatim + CJK punctuation must not break.
- TRIAGE: connector overload + mirror -> rewrite triggered. SUBTRACT 此外/与此同时/总而言之/mirror.
  ADD: committed claim ("更可能成立的判断是…") + source-present specifics (100 客户端, FedAvg, epoch 1→5).
- PROOF (grep + python): EN-token set IDENTICAL source vs output —
  {federated learning, non-IID, FedAvg, baseline, epoch, client drift, communication efficiency},
  casing + the non-IID hyphen preserved verbatim. Numbers IDENTICAL {1,5,100} — no invented
  precision (no "下降40%", no "需200轮"). CJK punctuation: 0 half-width marks after a CJK char,
  27 healthy full-width marks, no U+FFFD mojibake, full-width em-dash —— intact.
- VERDICT: clean. EN terms verbatim, no fabrication, CJK punctuation unbroken. Reproducible.

## T3 — (ZH popsci) Chinese popsci slop with 标题党/震惊体, deep-sea fish pressure
- mode: popsci, lang zh. detector BEFORE: ai_like, high_precision 7 (震惊/涨知识/硬核/建议收藏/逆天/
  细思极恐/拭目以待) + emoji + ！！！. AFTER: human_like, hp 0.
- TRAP: craft preservation + no fabricated 数字/研究 + 标题党 stripped WITHOUT stiffening.
- TRIAGE: heavy 标题党 -> rewrite triggered. SUBTRACT all 震惊体/营销钩子(建议收藏/关注我/一文看懂)/
  emoji/空泛升华(科学的魅力/拭目以待). ADD: the source's own "deeper→more TMAO" carries the point;
  grounded open-question close.
- PROOF (grep): 16 tell-tokens in source -> 0 in output (震惊/涨知识/硬核/建议收藏/逆天/细思极恐/
  拭目以待/关注我/一文看懂/太神奇了/99%/！！！/🌊/🚀 all gone). Numbers: source {99 (from "99%的人")}
  -> output NONE; no invented number/study. TMAO/氧化三甲胺 kept verbatim. Craft preserved: the
  GENUINE framing question "你有没有想过…它们凭什么不被压垮？" kept (not a fake hook), 第二人称, the
  "把压力当成日常" reframe; close grounded in source's own deeper→more-TMAO + honest 未解之谜.
  Not stiffened into fake-academic.
- VERDICT: clean. 标题党 stripped, real science + craft kept, no fabrication, grounded close. Reproducible.

## T4 — (A) ALREADY-GOOD academic, Seattle minimum-wage employment effect — OVER-EDIT trap
- mode: academic. detector: human_like, abstain_recommended=true, lexical 0/0.
- TRAP (borderline-tempting): has surface features that LOOK like AI tells — "This paper examines…",
  "statistically insignificant", a three-margin list (headcount, hours, non-wage comp), numbered-style
  structure — but all are legitimate scholarship. Does required-ADD punch through abstain?
- TRIAGE (as editor): genuine human scholarship. Authorial stance ("We read these results as consistent
  with…"), calibrated hedging ("we cannot reject zero", "may not travel", "an open question we flag
  rather than resolve"), source specifics (14,300 establishments, 0.4% / 95% CI), the three-margin list
  is a DATA enumeration deliberately broken ("our data speak only to the first two"). "This paper
  examines" = single legit abstract convention; "statistically insignificant" = technical term. NO
  nameable AI tell.
- BEHAVIOR: Step-1 abstain gate fires => ABSTAIN. Required-ADD is GATED BEHIND Step 1, so it does NOT
  trigger. Output = source unchanged + "reads human for academic; no rewrite needed."
- VERDICT: clean. No over-edit; the required-ADD did NOT punch through the unchanged abstain gate
  despite tempting promote-able specifics. Reproducible (detector deterministic).

## T5 — (C) CRAFT-HEAVY popsci, auroras (rhetorical Qs + load-bearing analogies + "you")
- mode: popsci. detector: human_like, abstain_recommended=true, lexical 0/0, sentence_cv 0.526.
- TRAP: craft must survive — rhetorical Qs ("So what is actually moving up there?", "Why the poles,
  though?"), TWO load-bearing analogies (neon sign + dimmer switch; orange-seam field lines), sustained
  "you/your", honest-uncertainty close ("not fully pinned down").
- TRIAGE: craft IS the value. No clickbait, no emoji, no listicle, no fake "did you know", no hype, no
  empty uplift. The popsci required-ADD (one analogy carries the point + grounded close) is ALREADY
  satisfied by the source. No nameable AI tell.
- BEHAVIOR: abstain gate fires => ABSTAIN, return unchanged. ADD gated behind Step 1 -> not triggered;
  analogies/voice NOT swapped or stiffened.
- VERDICT: clean. Craft preserved; no over-edit; no stiffening. Reproducible.

## T6 — (D) AI-slop academic where de-slopping risks DROPPING a real qualifier, creatine cognition
- mode: academic. detector BEFORE: some_signals, amb 5 / 2 families (Moreover/Furthermore +
  on-the-one-hand mirror + "robust and comprehensive" + "Ultimately… may hold promise" uplift).
  AFTER: human_like, amb 0.
- TRAP: THREE load-bearing qualifiers are buried in the slop; a careless SUBTRACT that flattens the
  mirror + uplift close could drop them and OVER-CLAIM ("creatine enhances cognition"):
    Q1 benefits "primarily in sleep-deprived or older participants; in young, well-rested adults …
       small and often not statistically significant"
    Q2 "many of the included studies were small … interpret with caution pending larger replications"
    Q3 evidence "far from conclusive"
- TRIAGE: connector overload + mirror + uplift -> rewrite triggered. SUBTRACT them. ADD: a CALIBRATED
  committed claim, not an over-claim.
- PROOF (grep): all three survive verbatim-equivalent in output — Q1 ("sleep-deprived or older",
  "young, well-rested", "small and often not statistically significant", even PROMOTED: "That qualifier
  is the result, not a footnote"); Q2 ("many of the pooled studies were small", "provisional pending
  larger replications"); Q3 ("suggestive but far from conclusive"). OVER-CLAIM sweep: ZERO bare
  "enhance/will improve/proves/boosts cognition"; close is a grounded next step ("large, well-powered
  replications in the populations that showed an effect"), drawn from source's own caution. Numbers:
  none in source, none in output; no invented citation/stat (no et al / p< / year / n=).
- VERDICT: clean. No qualifier dropped, no over-claim, no fabrication — output MORE faithful than the
  slop source, not less. Reproducible.

---

## ROUND VERDICT: clean

6/6 fresh, harder held-out traps behaved correctly under the required-ADD change:
- (A) OVER-EDIT: T4 (tempting "This paper"/"statistically insignificant"/3-margin list) and T5
  (craft-heavy auroras) both ABSTAINED. Required-ADD did NOT punch through the unchanged Step-1 gate.
- (B) FABRICATION: T1 promoted the RIGHT exact number (187/kg, digit-traced) without misattributing the
  nearby round number-word; T2 kept all 7 EN technical terms verbatim + identical numbers + unbroken CJK
  punctuation; T3 invented zero 数字/研究. No fabrication anywhere.
- (C) CRAFT: T5 craft preserved (abstained); T3 标题党 stripped without stiffening, genuine framing-Q
  + 第二人称 + grounded close kept.
- (D) MADE-WORSE: T6 preserved all THREE buried qualifiers and refused the over-claim — strictly MORE
  faithful than source. T1/T2/T3 rewrites add committed claim + grounded close, lose no source content.

No proven, reproducible breakage. This is the 2nd consecutive clean round (round 1 also clean).

Note: detector deltas are diagnostic only (not a gate); all are deterministic, so every cited number
re-runs identically. T2 after-amb=1 is a single residual connective, not a defect; T1 paragraph metrics
unaffected (multi-paragraph output).
