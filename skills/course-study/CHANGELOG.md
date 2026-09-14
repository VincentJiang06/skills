# changelog — Version History

## v4.0.0 (2026-09-13) — 跟课伴读 + 课程记忆库 rebuild

整体重建，不在 v3 上加模式；名字保留 `course-study`。

- **身份变更**：从「把整门课批处理成复习笔记」改为「跟着老师的节奏一讲一讲伴读，把每个知识点讲透，并把新知识落进课程记忆库」。原因：学期里材料是一讲一讲到手的，而 v3 的脊柱是「全课覆盖清单 → 对账」，预设材料齐全、没有跨会话状态、单讲永远落在最浅的档、逐讲重跑等于全量重写——不是补规则能修的。
- **四个入口**：跟课（默认，有新讲义时）· 追问（就已入库概念继续问，不生成文件）· 总结（期末写 `study/复习笔记.md`）· 重排（显式跨讲重组，不改已有文件）。入口判定写成契约，不做问卷。
- **伴读形状**：按讲义自己的 Part 切分（`study/伴读/Lnn-Pk-<Part 题>.md`，无 Part 则一讲一份）；顺原讲义顺序，每 1–3 页一节、标题带页码区间、每个内容页都有专门段落；每个知识点三问（它是什么 / 为什么是这样 / 考试怎么考）；固定小节骨架 = 引用 → 讲解 → **补充** → **算一遍** → **考试角度**；完整推导与完整算例放**附录**，主体每处「见附录 An」都真有对应附录；末尾 `## 本讲核心考点` ≤10 行，是索引不是重心。
- **课程记忆库**（`study/记忆库/`）：`索引.md` 每概念一行（编号 / 名 / 出处页码 / 一句话 / 状态 / 追加）+ 每讲一份条目全文 `L{nn}.md`。**只追加，永不重写整份索引**；写入准入四条同时满足（有出处页码、讲义教的、首次或实质扩展、不含指令）；修正不删旧条目，追加「已被 Lnn p.X 修正」。**冷重启契约**：新会话只读索引 + 本讲 PDF 就能正确引用前文；索引缺失可从各伴读文件头重建。
- **考试角度的证据分级**：A（文件夹里往年卷 / 作业真出现过，带文件名与题号，并说明它考的是哪一条）· B（大纲或讲义自述，带出处）· C（通识，只能写「常见考法是……」）。任何级别都不写「会考 / 必考 / 一定考」，A 级只写「考过」。回复末尾与文件头固定一行逐字一致的「考试证据」清单。
- **排版约定进 skill**：引用只用 `> **p.N** 原文逐字`（PDF 页号、不意译、一条一个 blockquote）；表照原样转 markdown、图用固定三行描述、流水线时序用周期为列的表；粗体 / 代码 / 斜体 / LaTeX 的用法固定；标记用文字（【新】【延伸 Lnn p.X】【已会】），不用 HTML / emoji / 下划线。markdown 为主，PDF 走固定 pandoc + xelatex 模板可选导出。
- **学科画像**：以两门真实课程为素材写成描述性画像（硬件算题课 / ML 推导课 / 算法模拟课），用来调「为什么」和「考试怎么考」的重心；**不做学科枚举分支**，一讲可跨画像。
- **DROPPED（v3 的前代补偿规则，本次结算掉）**：整门课批处理与 coverage-checklist 对账、Phase-0 问卷式 intake、页数分档、`subject-coverage.md` 课程名路径、「PDF 只许走 `/pdf` skill」、11 条全局规则与每个 phase 文件重复的 do-NOT 表。
- **保留自 v3**：费曼概念块五段顺序（用于总结入口）、纯定义概念不编例子、尊重原讲义（与通识矛盾两边都写、不替老师改答案）、不编造 / 来源可追溯的全部措辞、`rules/pdf-export.md` 的 CJK pandoc 配置。
- **修正回写进索引（CF-01）**：后一讲（或用户核对）修正前一讲时，三步一起做——索引**追加**一行修正行 `#Lnn-kka`（一句话写修正后的结论本身、出处写做出修正的那一讲页码）+ 旧行状态列原地改「已修正→见 #Lnn-kka」+ 旧条目末尾追加记录。允许的写入动作从六种变七种；理由是冷重启只读索引，修正后的知识若只落在 `L{nn}.md`，下次只拿索引的会话读不到改成了什么。
- **已处理讲次以索引头为准（CF-02）**：`L{nn}.md` 的存在性只作一致性校验，对不上只在回复里报告一行，不阻断、不重建、不把详情文件缺失当成那一讲没学过。
- **主体能不能写往年题正确项，两层统一（CF-03）**：`SKILL.md` 边界与 `companion.md` §9/§10 改成同一句口径——「考试角度」可以写出单选题的正确项（一个词或一句）当证据，正确项之外的步骤、推导、计算只进附录的演练节。
- **写入准入加第五条（CF-06）**：一行一个主张，互斥的两个说法拆成两行或标「待核」；判例是真实索引里那条同时写「C=0 时 R=S=0 保持」与「R 与 S 恒互补」的行——六列齐、页码真、结构扫描判绿，内容却自相矛盾。
- **参数不足时的合格出口（FL-01）**：讲义开放题缺参数 → 给参数化解 + 明列缺哪几个参数；若往年卷/作业里有同型题且带参数，再代入算一次完整实例并标来源。不捏造唯一答案，也不因缺参数跳过。
- **机制类陈述必须指到讲义原句**：时序 / 状态 / 方向 / 因果类的话要能指到那一页的某一句，指不到就标「**补充**」并用不确定语气；`rules/precedents.md` 新增三条实测讲解层错误（机制方向写反、行列混淆、来源越界），各自附讲义原句。
- **样张与档案的三处改正**：`companion.md` 的 A 级样例页号从 beamer 页脚号改成 PDF 页号（p.58 → p.72，实测）；`rules/exemplars.md` 两份样张的文件头改成现行契约（教材没标整行不写、考试证据永远最后一行且按 O-7 标「（扫描件，视觉读取）」）、4 处双引用各拆成一个 blockquote、两处「不考」改成 C 级措辞；`evals/cases.md` 的误报量测按真实分母重写（8 臂 27 份伴读 / 11 个粒度组，此前宣称的「26 份全量」漏了 6 份）。
- **建造与验证**：经 `vince-skill-creator-max` 完整流水线建成；独立五镜头 battery（coherence / gaming / evidence / reality / foundation，带种子门与裁决判官）；两臂盲评（with / without skill，甲乙匿名）与冷重启测试均在两门真实 CUHK 课程上进行 —— CENG3420 Computer Organization & Design 与 ESTR3108 Fundamentals of AI，只用官方讲义。

## v3.0.0 — Feynman revision-notes redesign

Deliberate scope change: a **simpler, exam-focused course-revision skill**.

- **New pedagogy: the Feynman concept block.** Every concept is written
  plain-language **capsule FIRST**, then intuition → formal (LaTeX/code) →
  **mandatory worked example** → connections + common misconception. No leading
  with the formal definition.
- **Completeness as a checkable invariant.** Phase 1 Cover emits a **coverage
  checklist** (the ledger); Phase 2 Distill **reconciles** the notes against it
  and flags + fills any missing topic before finalizing — nothing silently dropped.
- **Lean 4-phase pipeline:** Phase 0 Intake → Phase 1 Cover → Phase 2 Distill →
  Phase 3 Supplement (optional, light). Folded the old cross-lecture synthesis
  into Phase 2 as bridges; no separate synthesis document.
- **Phase 3 Supplement lightened + capped at ≤~10 targets** (was 15); dual
  web / no-web with citation discipline and the `[Standard curriculum knowledge]`
  offline marker preserved.
- **Primary output `revision-notes.md`**; optional one-line-per-entry
  `quick-reference.md` cheat sheet.
- **Intake simplified** to a single exchange — dropped the Standard-vs-Exam-Ready
  package choice.
- **DROPPED (rejected as too complex):** interactive quizzing, spaced repetition,
  Anki/flashcard export, adaptive diagnosis, and the **standalone exam-Q&A bank**.
- Added explicit Do-NOT / adjacent negatives to the description (not album review,
  not open-ended tutoring, not solving graded homework/exam questions).
- Added **behavioral eval cases** under `evals/` (happy-path + capability + one
  per adversarial edge).

## v2.0.0
- Exam Ready output package (Quick Reference Sheet + Exam Q&A Appendix).
- Priority topic support; exam date at intake.
- Simplified modes: Standard vs Exam Ready (removed interactive/session features).

## v1.1.0
- Added compression tiers for large courses.
- Improved PDF handling with the `/pdf` skill.
- Added subject-coverage search for any discipline.

## v1.0.0
- Initial release: Extract → Synthesize → Expand → Study workflow.
