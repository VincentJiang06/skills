# Attack Round 1 — humanizer-academic (post Step-3-ADD-required change)

Reviewer: fresh, independent (vince-attacker style). Did NOT build this skill.
Attacked the OBSERVABLE behavior of `skills/humanizer-academic/SKILL.md` run faithfully per mode.
Date: 2026-06-23. Inputs are HELD-OUT, fresh topics (none reused from evals/corpus/).

Change under attack: Step 3 "ADD" is now REQUIRED-when-triggered (academic: surface a
committed claim + promote a SOURCE-PRESENT specific; popsci: one analogy carries a point +
grounded close). abstain-first (Step-1 rewrite entry gate) is UNCHANGED.

Risk focus:
  (A) OVER-EDITING / FP regression — stronger ADD makes it rewrite/inflate prose it should ABSTAIN on.
  (B) FABRICATION — "promote a source-present specific" tips into inventing a number/name/date/mechanism.
  (C) POPSCI CRAFT DESTRUCTION — stiffening good popsci into fake-academic / adding hype.
  (D) MADE WORSE — rewrite less complete/faithful than source.

Detector is diagnostic only (a hint, not the oracle); verdicts cited as before/after delta context.
Inputs saved under .loop/humanizer-perf/attack-inputs/ ; rewrites under .loop/humanizer-perf/attack-outputs/.

---

## A1 — ALREADY-GOOD academic (antibiotic-resistance subscription economics)
- mode: academic
- detector: verdict=human_like, abstain_recommended=true, lexical 0/0, sentence_cv 0.64
- TRIAGE: genuine human scholarship. Already carries authorial stance ("We do not find
  support for the stronger claim…"; "it closes perhaps half the gap"), source-grounded
  specifics (£10M cap, 2%->5% resistance hazard, factor-of-four wedge), real asymmetry,
  and calibrated hedging ("perhaps", "our data cannot adjudicate"). NO nameable AI signal.
- BEHAVIOR: Step-1 abstain gate fires => ABSTAIN. Required-ADD does NOT trigger (gate is
  upstream of ADD). Output = source unchanged + "reads human for academic; no rewrite needed."
- VERDICT: clean. No over-edit. The required-ADD did not punch through abstain.

## A2 — ALREADY-GOOD popsci (glymphatic clearance during sleep)
- mode: popsci
- detector: verdict=human_like, abstain_recommended=true, lexical 0/0, sentence_cv 0.62
- TRIAGE: genuine human popsci. Hook ("the brain mostly takes itself out at night"),
  honest uncertainty ("still being worked out", "the field argues"), a source-grounded
  specific ("clearance roughly doubled"), real voice. No clickbait/listicle/hype.
- BEHAVIOR: abstain gate fires => ABSTAIN, return unchanged.
- VERDICT: clean. No over-edit.

## B1 — AI-SLOP academic (urban heat island mitigation) — FABRICATION TRAP
- mode: academic
- detector BEFORE: ai_like, ambiguous 12 (5 families: Moreover/Furthermore/In addition/
  Ultimately connector overload + brochure "robust and comprehensive" + on-the-one-hand mirror).
- TRIAGE: clear, nameable AI tells -> rewrite triggered. SUBTRACT connectors/mirror/uplift.
  ADD (required): committed claim ("no single measure is sufficient") = the source's own
  "will require multiple strategies"; a source-present specific — NONE EXISTS in source.
- KEY TEST: source has zero numbers / named entities / studies. Required-ADD says "promote
  an abstract summary into a concrete number/case/mechanism ALREADY IN THE SOURCE." Skill
  took the documented escape hatch ("if the source has none, keep it general; name the gap"):
  rewrite ADDS NO number/name/date/study and explicitly writes "The source does not quantify
  how much each contributes." Fabrication audit of every concretization:
    - "surface that absorbs the most sun" = restatement of source's own "reflective cool roofs"
    - "low-rise district vs dense core" = generic illustration of source's own "varies across
      different urban contexts" (no real place named, no datum)
  -> no net-new fact.
- detector AFTER: human_like, lexical 0/0 (paragraph_cv=0 is a one-block artifact, not a defect).
- VERDICT: clean. No fabrication. The now-required ADD correctly DEFERRED to "name the gap"
  instead of inventing specificity. Reproducible.

## B2 — AI-SLOP popsci (volcanic lightning) — FABRICATION TRAP (analogy)
- mode: popsci
- detector BEFORE: ai_like, high_precision 8 (emoji/mind-blowing/buckle up/game-changing/
  jaw-dropping/epic/uplift/"isn't science amazing"). Fake "Have you ever wondered" hook.
- TRIAGE: heavy clickbait -> rewrite triggered. SUBTRACT all hype/emoji/fake-hook/uplift.
  ADD (required): one analogy carries the point + grounded close.
- KEY TEST: thin source science = "ash plume rises; particles rub together and become charged;
  charge builds; discharges as lightning." ADD pressure could tempt an INVENTED analogy
  (socks-on-carpet, balloon-on-hair). Audit of rewrite:
    - "the way any two surfaces grinding together can build up a static charge" = generalization
      of the source's OWN "particles rub against each other and become electrically charged" +
      "lightning needs electric charge". NO external analogy (no socks/carpet/balloon) introduced.
    - "separates into regions of opposite charge" = the implied mechanism of the source's stated
      triboelectric charging + discharge; no new named process, number, or entity.
    - grounded close "still plenty researchers are working out about exactly when and where it
      strikes — the real reason it's worth studying" = source's own "scientists are still
      studying" / "still so much more to discover", reframed as a real open question (no new fact).
- detector AFTER: human_like, high_precision 0.
- VERDICT: clean. No fabricated number/name/date/study/external-analogy. The required analogy
  was satisfied by RESTATING the source's own mechanism, not by inventing one. Reproducible.

## C1 — CRAFT-HEAVY popsci (citric-acid/Krebs cycle: roundabout + pickpocket analogy, "you", rhetorical Qs) — CRAFT-DESTRUCTION TRAP
- mode: popsci
- detector: verdict=human_like, abstain_recommended=true, lexical 0/0, sentence_cv 0.72
- TRIAGE: craft IS the value here — rhetorical Q ("where does the energy in your breakfast
  go?"), 2nd person, a carrying analogy (roundabout / pickpocket lifting wallets), a genuine
  "here is the part that surprises people" turn, honest framing. NO clickbait, NO hype, NO
  listicle, NO fake "did you know", NO empty uplift. No nameable AI tell.
- BEHAVIOR: abstain gate fires => ABSTAIN (or at most a light touch with nothing to fix).
  Critically, the popsci required-ADD ("let ONE analogy carry the point") is ALREADY satisfied
  by the source — it does NOT trigger a rewrite, because ADD is gated behind Step-1 (which
  abstains). The existing roundabout/pickpocket analogy is preserved, not swapped/stiffened.
- VERDICT: clean. Craft preserved; no stiffening into fake-academic; no over-edit.

## C2 — CRAFT-HEAVY popsci (tardigrade desiccation: "you", glass analogy, honest uncertainty) — CRAFT-DESTRUCTION TRAP
- mode: popsci
- detector: verdict=human_like, abstain_recommended=true, lexical 0/0, sentence_cv 0.86
- TRIAGE: rhetorical Q opener, sustained 2nd person, a carrying analogy ("turn the cell's
  interior into a kind of glass"), explicit honest uncertainty ("we still do not fully
  understand every step… an open question"), strong burstiness. No clickbait/hype/listicle.
  No nameable AI tell.
- BEHAVIOR: abstain gate fires => ABSTAIN. ADD already satisfied by source's own glass analogy
  + grounded close ("a creature on your roof that can… pause being alive"). No rewrite, craft kept.
- VERDICT: clean. No over-edit, no craft loss.

---

## ROUND VERDICT: clean

6/6 attempts behaved correctly under the new required-ADD change:
- (A) OVER-EDIT: A1, A2, C1, C2 all ABSTAINED. The required-ADD did NOT punch through the
  unchanged Step-1 abstain gate. No clean prose was churned or inflated. No FP regression observed.
- (B) FABRICATION: B1 (zero-specific source) and B2 (thin source, analogy pressure) both
  rewrote WITHOUT inventing any number/name/date/study/external-analogy. B1 took the
  "name the gap" escape hatch; B2 satisfied the required analogy by restating the source's
  own mechanism. No fabrication.
- (C) CRAFT DESTRUCTION: C1, C2 craft preserved (abstained); B1/B2 not stiffened, no hype added.
- (D) MADE WORSE: B1, B2 rewrites are more faithful + more complete than the slop sources
  (committed claim + grounded close, zero content lost). Abstain cases unchanged by definition.

No proven, reproducible breakage. This is round 1 of the required >=2 clean rounds.

NOTE on detector paragraph_cv=0 for B1/B2 after-rewrites: an artifact of collapsing a
single-paragraph source to a single paragraph (no inter-paragraph variance to measure), NOT a
quality defect; the sources were themselves single blocks. Diagnostic-only metric, not a gate.
