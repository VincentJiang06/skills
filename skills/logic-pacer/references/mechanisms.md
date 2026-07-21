# mechanisms.md — WHY the six moves work (design-time provenance)

Read this ONLY when a specific leap resists minimal unfolding and you need the
underlying reason to decide where the single-step boundary sits. This is design-time
provenance — it informs the rewrite, it is NEVER inserted into the output.

The skill's transform (A–F in SKILL.md) is the operational face of six mechanisms.
Each move traces to one; if a move ever seems arbitrary, the mechanism tells you what
it is actually protecting, so you can adapt instead of overfitting to the Quetelet case.

## 1. Inferential distance (Yudkowsky, "Expecting Short Inferential Distances")
When an explanation fails, the explainer took ONE step back where two or more were
needed. Writers systematically assume the reader can cross in one hop a distance that
needs several. → This is the CORE DIAGNOSIS behind **A (leap detection)**: find the
junctures where the text advances more inferential moves than an average reader can make
unaided. "One inferential move" is judgment-laden (U1); the operational test lives in the
probe rubric — a step is too big when a cold reader who has read only up to step N cannot
accept step N+1 without importing an unstated premise.

## 2. Curse of knowledge + classic style (Pinker, *The Sense of Style*)
"The single best explanation of why good people write bad prose." The expert cannot
imagine not knowing what they know, so they skip "the missing steps that seem too obvious
to mention." Pinker's fix is *classic style*: treat the reader as an equal, guide their
eye to terrain they haven't seen — NOT oracular pronouncement, NOT condescension. → This
fixes the REGISTER the whole time (**voice preservation** + **no padding**): crisp,
direct, peer-to-peer. Hand-holding ("如你所知", "让我们一步步来") is the OPPOSITE of classic
style — it talks down. Smaller steps, not a softer tone.

## 3. Given-New / Known-New contract (composition theory; writing-center canon)
Put KNOWN/old information at the sentence start; put NEW information at the end. Then
CHAIN: the new element (comment) of one sentence becomes the known element (topic) of the
next. → This is the mechanism for 跳得稳 (stable jumps), i.e. **C (given-new re-anchoring)**.
Every new step bolts onto the immediately preceding new element, so the reader always steps
from ground they just gained. This is what converts "fast" into "stable" without adding
information — it only reorders where old vs new sits.

## 4. Topic / stress position (Gopen & Swan, "The Science of Scientific Writing")
The most operational source. Concrete rules:
- Topic position (start) = context + backward link (old info).
- Stress position (end) = the new point you want emphasised (new info).
- ONE unit of discovery / one function per sentence → **D (one-move-per-sentence)**.
- Minimise subject–verb separation; don't bury the verb.
- Align syntactic emphasis with the actual logical emphasis.
- Diagnostic: if a stress-position new item is never picked up later, a thread was dropped
  — a logical gap, not a pacing one.

## 5. Cognitive load / chunking (working-memory research, ~4 chunks)
Introduce ONE new idea at a time; connect each to existing knowledge. Two novel
inferential moves stacked in one sentence overflow working memory. → The hard rule behind
**D**: at most one new inferential move per sentence. This is also why **B** stays
*minimal* — piling on intermediate steps to be safe just refills the buffer with ornament.

## 6. Metadiscourse / signposting (Hyland; discourse-marker studies)
Explicit connectives ("because", "therefore", "which means", "先/后") signpost the path of
coherence — BUT only where a real hinge exists. Over-signposting is filler and violates
干练简洁. → **E (hinge-only connectives)**: name the relation (cause / contrast /
consequence / equivalence) at the REAL pivot, and strip decorative transitions elsewhere.

## The central tension (the hardest 20%)
Unfolding logic ADDS words; 干练简洁 wants LEAN. Resolution: **add inferential steps,
subtract everything else** — hedges, redundancy, decorative clauses, throat-clearing. Net
length grows only modestly (target <= ~1.3x); the density of *logic* rises while the
density of *ornament* falls. A rewrite that is much longer, or reads padded/hand-holding,
has FAILED even if every step is now small. That is the green-but-wrong shape: "I slowed it
down" measured by word count instead of by step-followability.
