# course-study

> A per-lecture study companion that keeps your teacher's pace: explain this lecture properly, say how it gets examined, and file what's new into the course memory bank.

**English** · [简体中文](README.md)

**What it does** — Takes one lecture's slides and writes a Chinese companion document that follows the lecture's own order (into the course folder's `study/伴读/`), while appending the lecture's new knowledge to `study/记忆库/` so the next lecture can pick up the thread correctly. At the end of term it summarizes the whole course from that memory bank.

**Why it's good** —
- **Follows the teacher's order**: one section per 1–3 slides, page range in the heading, every content page gets its own explanation paragraph; section and page order are never rearranged.
- **The teacher's own words are the anchor**: verbatim `> **p.N** quote` blockquotes with the explanation underneath; anything the slides didn't say goes into a clearly marked "**补充**" (supplement).
- **Three questions per concept**: what it is / why it is so / how it gets examined. Questions the slides raise but never answer get finished; derivations given only as results get completed — the full derivation and the full worked calculation go into an **appendix**, so the main body stays readable.
- **Exam angle with graded evidence**: A (it actually appeared in a past paper / homework — file name and question number given) · B (syllabus or the slides saying so) · C (general knowledge, phrased only as "a common way this is tested is…"). No grade ever claims "this will be on the exam".
- **A course memory bank that survives a cold restart**: one line per concept in the index (source page, one-sentence gloss, status), append-only, never rewritten; a fresh session reading only the index plus this lecture's PDF can still cite earlier lectures correctly — when a later lecture corrects an earlier one, the corrected conclusion is **written back as a new correction row in the index**, so the index stays self-sufficient.
- **Four entries**: follow-the-lecture (default) · follow-up questions on stored concepts · end-of-term summary · cross-lecture reorganization.
- Chinese explanation with English technical terms kept as-is (exams are in English); markdown first, optional PDF export via a fixed template that only guarantees all text is visible.

**When to use** — "here's lecture 9, write the companion and file it" · "write a companion doc for this PPT" · "so why is lw's critical path 1ns longer?" (a follow-up on a stored concept) · "finals are coming, summarize the whole course"; or call `$course-study`.

**Not for** — writing the graded homework you have to hand in (same-type questions are only worked through in the appendix, with the source file and question number stated); Feynman-style explanation of physics problems (→ feynman-physics-distiller); quizzing, spaced repetition, Anki export, interactive tests; unofficial third-party notes (official slides only).

**Deliberately dropped from v3** — whole-course batch mode with its coverage checklist and reconciliation; the Phase-0 intake questionnaire; page-count tiers; the "PDFs may only go through the `/pdf` skill" rule.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/course-study ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
