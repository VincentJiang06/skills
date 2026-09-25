# course-study

> A per-lecture study companion that keeps your teacher's pace: explain this lecture properly, say how it gets examined, and file what's new into the course memory bank.

**English** · [简体中文](README.md)

**What it does** — Takes one lecture's slides and writes a Chinese companion document that follows the lecture's own order (flat under the course folder's `study/`; courses that already have a `study/伴读/` keep using it), while appending the lecture's new knowledge to `study/记忆库/` so the next lecture can pick up the thread correctly. At the end of term it summarizes the whole course from that memory bank.

**Why it's good** —
- **Follows the teacher's order**: one section per 1–3 slides, page range in the heading, every content page gets its own explanation paragraph; section and page order are never rearranged.
- **Written for someone seeing the slide for the first time who skipped the lecture (4.2)**: each section first says in plain words what the slide is solving, then unpacks every symbol, connects every "why", and — wherever there is a formula or procedure — walks one small example through with concrete numbers to the final value. Longer is fine; restating the slides or padding is not. No word-count gate.
- **A few diagrams where they help (4.2)**: state machines, step-by-step algorithm states and data flows may get a small mermaid or ASCII sketch, captioned as drawn by the skill (not the lecture's own figure) and containing only what the slide says; in PDF export mermaid stays a code block.
- **Worked problems carry the original problem text (4.2)**: before explaining any problem (slide example, homework, past paper) the full statement is copied verbatim — data tables, options, marks; image-only tables are read visually and labelled — so you never have to open the problem PDF.
- **The header says what the document is; evidence moves to the end (4.2)**: five header lines (course / lecture and part / what it covers and what you can do after reading / previous–next / memory entries it builds on); the "exam evidence" file list now lives in a closing `## 来源与证据` section.
- **Clickable appendix (4.2)**: every "见附录 An" is a same-file link and every appendix section ends with a back-link; GitHub's rendered output and Typora's source both support the anchor syntax, but an actual click was not tested on either; Obsidian and pandoc export are untested — so the link text is written to read fine even if it does not jump. Appendices may also hold prerequisite refreshers, a symbol table, one more worked example, and common-mistake contrasts.
- **Respects the course folder's own rules (4.2)**: if the course root has `SPEC.md` / `AGENTS.md` they are read first and obeyed on exactly four things — where files go, what they are called, how relative links are written, what to run afterwards; clauses that would restrict content are not executed and are reported. Since 4.2.1 the file-triage rule names these two files as an explicit exception: read before any PDF, never listed as "未读" (unread); every other markdown at the course root is still not read.
- **Unverified diagrams are flagged on their own line (4.2.1)**: when a structural diagram or a full-page bitmap cannot be rendered, that section says so and the reply adds one line 「图形未核对：<file> p.N（reason）」; the closing exam-evidence line is unaffected.
- **The teacher's own words are the anchor**: verbatim `> **p.N** quote` blockquotes with the explanation underneath; anything the slides didn't say goes into a clearly marked "**补充**" (supplement).
- **Three questions per concept**: what it is / why it is so / how it gets examined. Questions the slides raise but never answer get finished; derivations given only as results get completed — the full derivation and the full worked calculation go into an **appendix**, so the main body stays readable.
- **Strict math conventions**: only `$…$` and `$$` on its own line, ASCII-only inside formulas, no `|` or `*` in math, no formulas in headings or the file header, and every formula must parse under KaTeX — so the same `.md` renders in Typora, GitHub and Obsidian alike (enable Inline Math in Typora preferences: Preferences → Markdown → Inline Math).
- **Exam angle with graded evidence**: A (it actually appeared in a past paper / homework — file name and question number given) · B (syllabus or the slides saying so) · C (general knowledge, phrased only as "a common way this is tested is…"). No grade ever claims "this will be on the exam".
- **A course memory bank that survives a cold restart**: one line per concept in the index (source page, one-sentence gloss, status), append-only, never rewritten; a fresh session reading only the index plus this lecture's PDF can still cite earlier lectures correctly — when a later lecture corrects an earlier one, the corrected conclusion is **written back as a new correction row in the index**, so the index stays self-sufficient.
- **Four entries**: follow-the-lecture (default) · follow-up questions on stored concepts · end-of-term summary · cross-lecture reorganization.
- Chinese explanation with English technical terms kept as-is (exams are in English); markdown first, optional PDF export via a fixed template that only guarantees all text is visible.

**Known limitations (4.2)** — A very long lecture may be delivered one Part at a time: unwritten Parts are marked "（未写）" in the navigation, the reply says where it stopped, and the next run on the same lecture continues from there. Past homework / exam questions of the same type get a full worked drill (including the result) in the appendix — just never in a submittable answer-sheet form. Appendix link clicks were not GUI-tested on GitHub / Typora; mermaid is untested on GitHub / Obsidian / pandoc. A few rules rely on the model's own discipline and are occasionally missed (【延伸】 tags vs. memory write-backs, English source terms in entries, the "（未核）" mark), with no mechanical gate behind them. The dev-time scanner checks shape only; whether a section really teaches is judged by blind review.

**When to use** — "here's lecture 9, write the companion and file it" · "write a companion doc for this PPT" · "so why is lw's critical path 1ns longer?" (a follow-up on a stored concept) · "finals are coming, summarize the whole course"; or call `$course-study`.

**Not for** — writing the graded homework you have to hand in (same-type questions are only worked through in the appendix, with the source file and question number stated); Feynman-style explanation of physics problems (→ feynman-physics-distiller); quizzing, spaced repetition, Anki export, interactive tests; unofficial third-party notes (official slides only).

**Deliberately dropped from v3** — whole-course batch mode with its coverage checklist and reconciliation; the Phase-0 intake questionnaire; page-count tiers; the "PDFs may only go through the `/pdf` skill" rule.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/course-study ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
