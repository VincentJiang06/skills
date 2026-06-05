# phase-intake — Phase 0: Intake (single exchange)

Run all steps in **one message**, then start on confirmation. Intake is one
exchange, not five. There is **no package choice** — the deliverable is always
`revision-notes.md` (+ an optional `quick-reference.md` cheat sheet if asked).

---

## Step 1: Ask everything at once

**Supported input is PDF (via the `/pdf` skill), a topic list, or a course
name.** If the user has PPTX / DOCX / images, ask them to convert to PDF via
`/pdf` first — never read non-PDF files directly.

Ask in a single message:

> What do you have?
> 1. **PDF slides** — point me at them and we extract via the `/pdf` skill.
> 2. **A topic/concept list** — paste it; I'll turn it into the coverage checklist.
> 3. **Just a course name** — I'll search a standard syllabus to build the outline.
>
> Also (one line each is fine):
> - Roughly how many pages total?
> - Output language? (e.g. English, 中文, bilingual)
> - Exam date / deadline, if any?
> - Any priority topics to go deeper on? (e.g. "focus on Ch3–5")
> - Output folder? (default: current directory)
> - Want an optional `quick-reference.md` cheat sheet too?

---

## Step 2: Pick the scale tier from SIZE

**Size picks the tier — by PAGE count for PDF input (Path A), or by TOPIC /
CONCEPT count for a topic list / course name (Path B/C), where pages are
undefined.** Apply immediately — do not ask again.

**Path A — PDF input (size by pages):**

| Total pages | Tier | Strategy |
|---|---|---|
| ≤ 60 | Light | Full extraction per page |
| 61–200 | Medium | Batch by lecture; checklist + summary per lecture |
| 201–400 | Heavy | Batch + compress Phase-1 detail before Phase 2 |
| > ~400 | Split | **Recommend per-module runs**; batch so nothing is silently dropped |

**Path B/C — topic list / course name (size by topic/concept count):**

| Total topics | Tier | Strategy |
|---|---|---|
| ≤ ~30 | Light | Full Feynman block per topic at its weight |
| ~31–80 | Medium | Batch by module; checklist + summary per module |
| ~81–150 | Heavy | Batch + calibrate depth before Phase 2 |
| > ~150 | Split | **Recommend per-module runs**; batch so nothing is silently dropped |

For **Split** (either path), tell the user the course is large and recommend
running it per-module (or per a few lectures / topic-groups at a time). Process
in batches and keep the coverage checklist spanning the **whole** course so no
topic is dropped across batches. The Split batching rule applies to **both**
paths.

---

## Step 3: Decide the web mode (by tool availability)

**Intake decides the web mode**, from whether **WebSearch / WebFetch is actually
available in your tools**. **If you cannot tell, default to no-web mode and say
so.** The user may grant or deny web access to override your default. State the
mode in one line:
- ✓ Web available in your tools → Phase 3 Supplement (if needed) cites real
  retrieved sources (Mode A).
- ✗ Not available / cannot tell → **default to no-web** (Mode B): Phase 3 marks
  supplements `[Standard curriculum knowledge]` and invents nothing.

This only affects the **optional** Phase 3; the notes themselves come from the
course materials. The mode set here is what Phase 3 (`phase-supplement.md`) uses —
the two phases do not disagree on who decides.

---

## Step 4: Confirm and go

One-line summary (input type, tier, language, web mode, folder), then start
Phase 1 immediately on no-objection. No further forms before Phase 1.
