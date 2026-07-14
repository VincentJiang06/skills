# Popsci Pack — the complete `popsci`-mode rewrite (SUBTRACT · register floor · ADD · arc)

> Load this **only when Step-0 locked `mode=popsci` AND Step-1 did NOT abstain** (a
> rewrite is actually triggered). Never on the abstain path; never on an academic job.
> This file is **self-contained**: it carries its own EN + ZH clickbait denylist and
> does **not** load the academic lexical catalogues.
>
> **Also load, from here:**
> - structural + statistical layer → `references/structural-signals.md` (every rewrite;
>   in popsci, **down-weight** the casual-register and rhetorical-question rules the way
>   structural rules are down-weighted for poetry).
>
> Serious popsci is **The Conversation**, NASA/ESA explainers, *Quanta*, good science
> desks (NYT/Guardian/BBC), Wikipedia science, 中文维基科普, 《环球科学》/《科学美国人》
> 中文版, 果壳's careful pieces. A curious human explaining something true to a smart
> non-specialist. It is **NOT** a listicle, clickbait, a hype thread, a brand blog, or an
> SEO content farm. "Serious" is the load-bearing word.

Serious popsci has **two** failure modes, and this guard sits between them:
- **Register collapse upward** — making explanatory prose stiff, hedged, and
  jargon-walled in the name of "credibility". That kills good popsci.
- **Register collapse downward** — letting it slide into clickbait, hype, and listicle
  filler in the name of "engagement". That is what AI defaults to, and it is the louder
  signal here.

The denylist is therefore mostly about the *downward* slide; the preserve list is mostly
about protecting craft the academic-tuned detector would wrongly flag.

---

## Step 2 — SUBTRACT (remove only what is an AI tell IN popsci mode)

Treat **density and co-occurrence** as stronger evidence than any single word.

**Remove:** clickbait/hype ("mind-blowing", "you won't believe", "buckle up",
震惊体/涨知识/快收藏); emoji and exclamation spam; listicle shell ("5 facts that…",
**bold-numbered** headers as a structural crutch); fake "did you know" hooks; generic
"the future is bright" wraps; AI connector overload; over-explaining the obvious.

### AI signals that matter MORE in popsci (weight these UP)
The dominant tells shift toward the clickbait/content-farm register:
- **Listicle skeleton** — "Here are 7 surprising facts about…", numbered hype items,
  each a one-line bullet with a bold lead-in and no connective tissue. Collapse into
  flowing explanation unless the enumeration does real work.
- **Hype adjectives** — mind-blowing, jaw-dropping, game-changing, revolutionary,
  groundbreaking (as filler), incredible, insane, crazy, "literally" as intensifier.
- **Fake "did you know" / "have you ever wondered" hooks** — the template opener that
  asks a question it never really uses. Replace with a real hook or a direct opening.
- **Over-explaining the obvious** — "Water, as we all know, is essential to life. But
  have you ever stopped to think about *why*?" Cut the throat-clearing.
- **Generic uplift wraps** — "The future is bright", "the possibilities are endless",
  "one thing is certain: science will continue to amaze us", "only time will tell".
  Replace with a grounded, specific close (an open question, a real next step, a
  concrete implication).
- **Emoji enthusiasm and exclamation spam** — 🚀🤯🔥, "Mind = blown!!!", "Wow!". Strip
  entirely.
- **SEO/engagement scaffolding** — "In this article, we'll explore…", "Let's dive in!",
  "Keep reading to find out…", "TL;DR", "Bottom line:".

### PRESERVE — legitimate craft (removing it is a FALSE POSITIVE)
These are the tools of good science writing. The academic detector treats several of
them as "AI tells" or "casual register". In `popsci` mode they are **load-bearing and
must be preserved**. Stripping them is a regression, not a fix.
- **Rhetorical questions** that frame a real puzzle or set up an explanation — "So why
  doesn't the Moon just fall to Earth?" Keep them. (Only cut the *fake* "Did you know…?"
  hook.)
- **Second-person address** ("you", "imagine you're standing on…", "你") used to put the
  reader inside the phenomenon. Normal, good popsci; NOT chatty banter.
- **Vivid analogies and metaphors** that carry real explanatory load — "the genome is
  less a blueprint than a recipe", "spacetime sags like a trampoline under a bowling
  ball". Preserve; do not flatten to literal jargon.
- **A narrative hook / scene-setting opening** — a concrete moment, a person, a date, an
  everyday observation that earns the topic. (Distinct from the fake "Have you ever
  wondered…" template.)
- **An occasional guiding three-item list** when it genuinely organizes the material
  ("there are three ways stars die: …"). One real, content-bearing list is craft; the
  tell is the *reflexive* triad on everything.
- **Concrete everyday examples** — coffee cooling, a swing's pendulum, sourdough starter,
  高压锅. The whole point of popsci is grounding the abstract.
- **A human, curious, first-person-plural voice** — "we still don't fully know why",
  "researchers were stumped", "我们其实还不清楚". Curiosity and honest uncertainty are
  register-appropriate here.

> Rule of thumb: if the device serves *understanding* and the facts stay true, it is
> craft — preserve it.

---

## Register floor — do NOT lower these

Even while keeping the voice lively, the rewrite must hold the line on:
- **Factual accuracy.** Never invent a number, study, mechanism, date, or quote to make
  the prose punchier. Specificity is retrieval from the source, never generation.
  > **Worked-NEGATIVE — a real-world-true but source-absent inference is STILL
  > fact-invention.** The source says only *"that third heart stops beating when the
  > octopus swims."* Rewriting it as *"…stops beating when the animal swims, **which is
  > part of why octopuses often prefer to crawl**"* is a **hard fail** — you added a
  > behavioral claim ("prefer to crawl") and a causal link ("which is part of why") the
  > source never stated. That octopuses do crawl more than they swim is *true in the
  > world* — and that is exactly the trap. **Plausibility / real-world-truth is NOT a
  > license.** The only test is: **does the source state it?** If not, cut it, even when
  > it would make the sentence feel more finished. Adding a "finishing" causal clause or
  > a plausible detail is the single easiest way to invent a fact — watch for it.
  > **Worked-NEGATIVE #2 — the NAMED-ENTITY-PARALLEL trap: completing a contrast the
  > source only half-stated by naming the OTHER side's entity or composition.** The source
  > says only that the blood is *"blue instead of red"* (its cause: a *"copper-based
  > molecule called hemocyanin"*). Rewriting it as *"hemocyanin **rather than the
  > iron-based hemoglobin in our own**"* is a **hard fail** — the contrasting molecule
  > (*hemoglobin*), its composition (*iron-based*), and the *our-own-blood* comparison are
  > all invented to complete a "copper-based X rather than iron-based Y" symmetry the
  > source never drew. **Restating the source's OWN contrast is fine** ("blue instead of
  > red" → "blue rather than red"); **naming a NEW entity/composition to build a symmetry
  > the source never stated is invention** — even when the pairing is real-world-true. Same
  > trap, different shape: watch any "X rather than / instead of Y" where the source gave
  > only X.
- **No hype / superlative inflation.** Don't promote "useful" → "revolutionary", "a
  notable result" → "a breakthrough that changes everything".
- **No clickbait.** No "mind-blowing", "you won't believe", "buckle up", "this one weird
  trick", "scientists are baffled" (as filler), no "N facts that will…", no
  emoji-as-punctuation, no exclamation spam.
- **No fake urgency.** "Read this before it's too late", "everyone needs to know this
  right now" — strip.
- **No over-claiming beyond the evidence.** Correlation stays correlation; a single study
  stays a single study ("one small trial suggests", not "science proves"). Keep the
  calibration the source actually warrants.
- **No talking-down.** No "it's actually really simple, don't worry", no condescending
  "basically, science is just…". Accessible ≠ patronizing.

### Default stance
- accessible but not dumbed-down
- engaging but not hyped
- vivid but not sensational
- confident but not over-claiming
- warm/curious but not chummy

### What NOT to add (the symmetric trap — over-correcting into stiffness)
- Don't make it academic-stiff: no gratuitous jargon, no passive-voice walls, no stacked
  hedging where one calibrated phrase will do.
- Don't strip the voice: keep the warmth, the curiosity, the "you", the analogy. Removing
  every rhetorical question and every metaphor is a register *collapse*, not a cleanup.
- Don't add slang, memes, or banter to compensate for the hype you removed — serious
  popsci is lively, not jokey.
- Don't invent a hook, an anecdote, or a "fun fact" the source doesn't support.
- Don't bury the lede in caveats. Lead with the clear idea, then qualify.

> **When in doubt** — ask: does this device help a curious non-specialist *understand
> something true*? If yes, keep it even if it "looks informal". If it only manufactures
> excitement or clicks, cut it. The target is the science desk, not the academic journal
> — and never the content farm.

**EN — before (clickbait popsci):**
> 🤯 Have you ever wondered why the sky is blue? Buckle up, because the answer will BLOW
> YOUR MIND! Here are 5 incredible facts about light that scientists don't want you to
> miss. The future of physics is bright — let's dive in!

**EN — after (serious popsci, voice intact):**
> The sky is blue for the same reason a sunset is red: air scatters short wavelengths
> much more strongly than long ones. Look straight up at midday and you're seeing
> sunlight that has been bounced sideways by the atmosphere — mostly the blue end of it.
> Near the horizon at dusk, the light has traveled through far more air, the blue has
> scattered away, and what reaches you is what's left: red.

> Note what survived: a rhetorical framing, a second-person "you", a vivid contrast, a
> concrete everyday observation. What went: the emoji, the hype, the fake hook, the
> listicle promise, the empty uplift.

---

## Chinese popsci specifics

Good 中文科普 reads like 中文维基百科, 《环球科学》/《科学美国人》中文版, 果壳 (careful
pieces), or a thoughtful 科普 column: clear, example-driven, honest about uncertainty, no
标题党. AI/clickbait 中文科普 reaches for 震惊体 and content-farm tics.

**Preserve (legitimate 中文科普 craft):**
- 设问/反问 that frame a real question — "为什么月亮不会掉下来？"
- 第二人称与日常类比 — "想象你站在电梯里，电梯突然下坠……"
- 诚实的不确定 — "我们目前还不完全清楚", "这一点科学界仍有争论"
- 一个真正有组织作用的小清单 — "恒星的死亡大致有三种结局：……"
- 具体生活化例子 — 高压锅、骑自行车的平衡、面团发酵。

**Strip (AI / 标题党 tells — weight UP):**
- 震惊体与夸张词 — 震惊、惊呆、颠覆认知、逆天、炸裂、神操作、细思极恐。
- 营销钩子 — 涨知识了、硬核科普、一文看懂、收藏这一篇就够了、建议收藏、看完你就懂了、
  关注我带你了解更多。
- 假紧迫与命令式 — 快收藏、一定要知道、再不看就晚了、99% 的人都不知道。
- 过度感叹与表情堆砌 — "太神奇了！！！🤯"、滥用感叹号。
- 空泛升华尾 — "科学的魅力是无穷的"、"未来可期"、"让我们拭目以待"。

**ZH — before (标题党):**
> 震惊！99% 的人都不知道，为什么天是蓝的？看完涨知识！硬核科普一文看懂，建议收藏！
> 科学的魅力真是无穷啊，让我们一起拭目以待！🚀

**ZH — after (严肃中文科普，声音保留):**
> 天为什么是蓝的？说到底，和日落为什么是红的是同一件事。空气对短波长的散射远强
> 于长波长，所以正午抬头，你看到的是被大气向各个方向"弹"过来的阳光——以蓝光为主；
> 而黄昏时，阳光穿过的空气厚得多，蓝光早已散射殆尽，留下的便是红。

> 保留了：一个真问题式的开头、第二人称"你"、一个生活化的对照、诚实直接的解释。
> 去掉了：震惊体、营销钩子、收藏号召、表情、空洞升华。

---

## Step 3 — ADD human texture (without inventing)

SUBTRACT alone leaves prose scrubbed but flat. **Once a rewrite is triggered, the ADD
below is required, not optional**, bounded hard by zero net-new facts: **never invent** a
number, case, study, quote, analogy, or implication. Specificity is **retrieval from the
source**, never generation.

**Do at least both moves, every triggered popsci rewrite:**

1. **Let ONE real, source-grounded analogy or concrete example carry a key point** — pick
   the single best one the source already implies and let it do the explanatory work
   instead of restating the mechanism abstractly. Preserve existing craft (rhetorical Q,
   "you", analogy) — removing it is a false positive.
2. **Replace any generic uplift close with a grounded one** — swap "the future is bright"
   / "未来可期" / "拭目以待" for an open question, real next step, or concrete implication
   **already in the source**. Vary rhythm; keep one through-line, not a listicle — and
   stay **serious**, never hype.

### Popsci worked example
> The ADD is: (1) let **one** real, source-grounded analogy/example carry the key point,
> and (2) replace a generic uplift close with a grounded one (an open question or real
> implication **already in the source**). Never invent the analogy or the implication.

**Before (SUBTRACT done — hype gone — but explanation abstract + uplift close):**
> Vaccines work by preparing the immune system in advance. The immune system is able to
> recognize and respond to threats more effectively after this preparation. Ultimately,
> the future of immunology is incredibly bright.

**After (one analogy carries it; grounded close; voice intact):**
> A vaccine is a wanted poster handed to your immune system: it shows the pathogen's face
> without the crime, so the next time the real thing shows up, the response is already
> drawn up and fast. Why do some vaccines need boosters, then? Because that memory fades
> at different rates — which is exactly what the source's antibody-decay curves are
> tracking.

> What changed: the abstract "recognize and respond" became **one** carrying analogy (the
> wanted poster); the empty "future is bright" close became a real open question answered
> from the source's own decay data. Craft kept (second person, a genuine rhetorical
> question); no hype, no invented fact.

---

## Step 4 — whole-document arc (long, multi-section inputs)

Treat a long document as a whole. This is **shape across the existing text**, adding **no**
length and **no** new content: varied section openings, a single through-line, and a
**synthesizing** (not recap) conclusion.

> **Completeness aim (finished, not fuller) — and DO NOT chase it past a fact.** A
> rewrite should read as a *complete, publishable science-journalism piece* — a clear
> through-line from a real hook to a payoff, the phenomenon explained for a smart
> non-specialist, honest about uncertainty, closing on a **grounded** note (an open
> question / real implication, never an empty "the future is bright"). "More complete"
> means **only better synthesis and arc of the material already present** — letting the
> source's own best analogy carry the explanation and resolving the thread the hook
> opened. It does **NOT** mean adding content, a new fact, hook, anecdote, "fun fact",
> or a "finishing" causal clause.
>
> **The invention trap (read before you polish any sentence):** the pull toward a
> *finished*-sounding piece is the exact pressure that manufactures a plausible,
> real-world-true detail the source never stated (see the octopus "prefer to crawl"
> Worked-NEGATIVE in the register floor above). **If finishing a sentence tempts a new
> detail or a "which is why / which is part of why" causal link — STOP. That is the
> invention, not the completion.** A source-faithful sentence that stops where the
> source stops is *complete*; a smoother one that adds a claim is a hard fail. When the
> two conflict, faithfulness wins every time — leave the prose a touch less rounded
> rather than invent. Zero net-new facts binds absolutely.

---

## ADD checklist (run after SUBTRACT, before the final register re-check)

- [ ] Does **one** real, **source-grounded** analogy/example carry the key point (not the
      mechanism restated abstractly)?
- [ ] Is any generic uplift close replaced with a **grounded** one (open question / real
      implication **already in the source**) — and **zero** new facts?
- [ ] Is the craft **preserved** (rhetorical Q, "you", analogy) and the register still
      serious (cross-check the register floor above)? No hype/clickbait/emoji.
- [ ] **Long inputs:** varied section openings, a single through-line, a **synthesizing**
      (not recap) conclusion that reads as a *finished* explainer — adding no length and
      no content.
