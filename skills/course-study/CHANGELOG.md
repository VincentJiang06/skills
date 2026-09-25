# changelog — Version History

## v4.2.1 (2026-09-25) — 三处规则互斥的修补 · 评委词表加 unsure · 开发期粒度门一处（冻结档，R20 升级波）

运行时只修 battery r2 连贯性镜头查出、两轮修复额度用完后一直挂着等裁决的三条 P2（F2–F4，全是 prose）；开发期另有两处：评委词表加 unsure，以及本轮 battery 确认的粒度门 F05（P2，见下，不随 skill 发布）。运行时没有新增、删除或改动任何检查；description 逐字未动。三条 P2 由 owner 于 2026-09-25 委托本流水线裁决（「判断都你来做」），三条都判**修**，理由各在条目里。版本取 patch：四处改动都是消解既有规则之间的互斥或门与运行时规则的不一致，没有新能力、没有推翻契约。

- **F2 课程根 SPEC.md / AGENTS.md 既「读 PDF 前必读」又落在「一律不读」清单里（`rules/companion.md` §1）**。裁决：修。理由：Vince 的四门真实课程根下都有这两份文件，矛盾在每一讲都会触发——照 §1 不读就丢掉 48 字符命名、`../课件/…` 相对链接与 catalog 收尾；照 layout 读了又得把它报成「未读」。修法：§1「不读」一条末尾开一个**按文件名点名的**例外，只有这两份，指向 `rules/layout.md`「课程根有 SPEC.md / AGENTS.md 时」、只在四件事上服从、不列进「未读」；并写明这是规则按位置点名的例外、不是文件名授予的权限，课程根其余 markdown（README.md 等）照旧不读、照列。不用「课程根的说明文件」这类泛称——那会把 README/INDEX 与任何指令形状的根文件一起放进可读面。指向：`rules/layout.md:1/:15` 契约 + KB P10（权威来自出处，不来自文件的自述）。`rules/layout.md` 一字未改。
- **F3 页级「图没核对上」被塞进文件级的「未识别」清单（`rules/format.md`「图」两处、`rules/precedents.md`【位图整页】、`rules/companion.md` §12）**。裁决：修，取「节内元素注 + 回复里单独一行」方案。理由：全 skill 唯一定义过的「未识别」是 SKILL.md:24 那行考试证据里的「未识别用途的 PDF」，文件级、且必须与伴读文末逐字一致；照旧规则执行，讲义本身会在同一节里既是「原件」又是「未识别用途的 PDF」，零证据课还会让这一行形状无解；而只留节内注、不在回复里说，又丢了这条规则本来要给的告警（Vince 读回复，不逐节读）。修法：四处统一成一行「图形未核对：<文件> p.N（原因）」，每页一行、只在回复里、不写进伴读、不入库；节内「元素」行末的说明照旧。SKILL.md:24 逐字未动。指向：SKILL.md:24 逐字证据行不变量 + A42(iv) 证据纪律（豁免区只许加固不许松动）。
- **F4 SKILL.md 按需读取表给 layout.md 的触发时机晚于 layout / companion 自己要求的时机（`SKILL.md` 表第 1 行）**。裁决：修。理由：运行时唯一常驻的是 SKILL.md，L3 文件自己的「何时读」要等被读到才生效；原触发只在「写文件前」，而表第 2 行、`layout.md:1`、`layout.md:15` 都要求它在分拣与读任何 PDF 之前已读——照表执行的 agent 会先分拣、先读 PDF，漏掉 SPEC 约束。修法：同一行前面补「跟课：分拣与读任何 PDF 之前」，原写时触发保留，别的行不动。指向：PHILOSOPHY 判断「结构编码的是动词——何时读什么」+ `layout.md:1`（S2 指针失效）。
- **评委词表加 unsure（开发期 `evals/cases.md`，不随 skill 发布）**：⑨ 学生视角改为「能 / 部分 / 不能 / unsure」，写明 unsure 何时用、不进分子也不进分母；新增 H 组登记本轮对裸 Opus 5.5 的 E11（手册与量规在流水线运行目录，不进仓库）。指向：顶层铁律 6⑥ + E11 有效性清单。
- **E11（v4.2.1 对裸 Opus 5.5，已跑）**：3 例（CENG3420 L13 Cache 全讲、CSCI3230 L04 Part 3 Kernel SVM、held-out CSCI3160 L13 Dijkstra）；WITH 臂用 4.2.1 的 git 快照，WITHOUT 臂显式禁用一切 skill，每臂独立目录副本，评委每例一个 fresh Opus 5.5、盲评、读全文、词表含 unsure。结果维（D1 可学性 / D2 正确性 / D8 注水）9 格：WITH 0 胜 · 3 负 · 6 平 · 0 unsure，net = −3。D1、D2 三例全平（三道冻结题两臂都答得出；两臂都无错误机制陈述、无硬失败；v4.0 期曾输掉 D1 的那类讲，本轮 WITH 一例都没输 D1），三格负全在 D8 且同一成因：WITH 每行先逐字引 PPT 再用中文复述一遍，几乎每页都有「元素 / 看什么」块——这正是 companion §5「唯一不许的长法是复述 PPT」禁的，规则在、执行没到。逐例：Cache 裸模型窄胜（只因 D8）、Kernel SVM 裸模型窄胜（只因 D8；WITH 把同一道机器人题在三个附录里各解一遍）、Dijkstra 平（WITH 唯一查出讲义 p.7 图把 a→d、d→e 画反，经渲染页核实）。忠实度维（不计入分支）三例全偏 WITH：五行文件头、逐字题面带文件·题号·页码、附录回链、记忆库条目带页码且只放讲义内容；裸模型两例把往年卷题意译成中文。成本：工具调用约 32/20、32/29、44/24（平均约 1.5×），正文长 2.3–3×；无 token 实数。分支（预注册）：按字面落 NEGATIVE（net ≤ −3），但噪声底 H0 未测、MDE 约 net ≥ 5，只算方向；判定不退役（忠实度 3/3 偏 WITH，与 owner 的读者偏好一致），本波不改设计，下一版应重新预注册为 encoded-preference 并用 prose 收紧「引后复述」。臂、量规、评判全文在流水线运行目录 `runs/course-study/arms/`。
- **字节**：`SKILL.md` 8192 → 8233 B（上限 10240）；`rules/companion.md` 24914 → 25565、`rules/format.md` 16484 → 16632、`rules/precedents.md` 10429 → 10658（上限 32768）；其余 rules 未动。
- **开发期粒度门收紧（battery F05，P2；`evals/run.sh --granularity`，不随 skill 发布）**：原动画豁免只看区间内各页 pdftotext 首行相同，把 `rules/precedents.md`「首行相同不等于动画分页」点名的错法（ESTR L09 p.12–18，首行相同、页脚 12–17）判绿，与 `rules/companion.md` §4「页脚逻辑页号相同」的运行时规则不一致。修法：豁免另要求每页能抽到页脚逻辑页号（抽不到则拒绝、交人眼；抽法只看每页最后一个非空行，见下方遗留）且区间最多跨 3 个逻辑页号（§4「粒度检查按逻辑页计」）；标题只认「动画分页」。取「最多 3 个」而非「只许 1 个」是误报实测定的：后者把按规则写的「两组动画分页」一节全判红，r1/with 的 L02、L03 两组由绿转红。第三条「内容逐张递增」是语义，门仍不判（顶层铁律 2）。指向：companion §4 + precedents「首行相同不等于动画分页」；A50 准入：纯结构（页脚号计数），正例反例各有夹具，误报已量。
- **铁律 7**：`evals/run.sh` 把 `metadata.version` 的钉值 4.2.0 → 4.2.1（数据跟随版本，这一处检查语义未变）；检查语义唯一变化的是上一条的粒度门。粒度门在 38 组真实粒度语料上改前改后退出码与漏页清单逐字相同，只有信息行的动画组计数变了，新增误报 0；四门真实课程里没有带「动画」的区间标题，不受影响（记录：R20 运行目录 `runs/course-study/battery/f05/`）。`--structure` 在全部现有真实语料上改前改后各跑一遍（skill 自身 + 31 个目录：21 个历史臂目录、4 门真实课程的只读扫描、6 个 v4.2 臂课程目录）：31 个目录的输出逐字节相同，差异只在 skill 自扫的版本行与字节数，新增误报 0。
- **沿用、未动（冻结档豁免登记）**：运行时 prose 体量与可能的过度规定（审计第 2 条，待 E11 结果供 K2 复审定向结算）；`管理/catalog.py` 执行档位未在 SKILL.md 登记；安装副本带着 ROOT/skill 布局的 evals/；校准资产无 model_baseline 戳；run.sh「rules 文件 ≥1000 B」的防掏空代理门；battery r2 的 P3（F5–F10）与六条 flag；description 与触发评测；历史条目里对不上磁盘的字节数（留作历史）。
- **battery（1 轮，五镜头，instance 档）**：种子 5/5 命中（S1 记忆库索引上限被评低一级，仍算命中）；非种子确认 5 条（F05 P2 开发期粒度门、F06/F07/F10/F11 P3）、驳回 2 条、flag 13 条无一升级；真实 skill 无 P0/P1。修复 1 轮只修 F05，修复审计 1 轮：F05 的修法自身又被找到一条 P2（见遗留），按铁律 3 不再加码（P0 才强停，这里是 P2，但修复额度已用完）。
- **独立性与模型偏离（如实登记）**：battery、E11 评委、builder 全是 Opus 5.5 high 的 fresh 实例，独立性只到 instance 档，不是 model 档。skill-creator-max 2026-09-13 模型策略要求 builder 用 Fable、评价者用 Opus；本波 owner 明令全部用 Opus 5.5 high——评价者与 builder 同模型，属偏离。
- **遗留、未修（修复额度已用完，交下一轮）**：① 修复审计 P2：粒度门的 `logical_no()` 只读每页最后一个非空行，不核它是不是页脚——CSCI3130 L10 p.89–93 每页末行是纸带符号「1」、真页脚「89 Ch 10」…在上一行，标「动画分页」的一节因此仍判绿（同 F05 一类的假绿，窗口变窄但没消失）；② P3：同一抽法在 CSCI3160 全部 22 讲都抽不到（页脚「N/21」在倒数第二行），拒绝理由写成「抽不到页脚」而实际是跨了 10 个逻辑页，且信息行的动画组计数与拒绝结论自相矛盾（None==None）；③ P3：「最多 3 个逻辑页」仍放过 ESTR L09 p.15–18（页脚 15,15,16,17）这种 precedents 点名的错法；④ battery P3：F06（`\bm` 禁用理由不实、check_math 误报）、F07（索引行不核六段）、F10（memory.md 示例行状态列与写入动作 5 不一致）、F11（样张主体考试角度写了步骤、format.md「好」例把页码放 `##`）；⑤ 规则自己的动画组范例 L03 p.35–40 实际跨页脚 20、21 两个逻辑页，按 §4 应是两组（候选 P3 prose 修）；⑥ E11 的 D8 注水（引后复述）。

## v4.2.0 (2026-09-17) — 讲透五条判据 · 例题带原题 · 文件头讲定位 · 平铺布局 · 附录可点

起因是真实使用现场（四门课的课程文件夹）：同一讲 L04-P2 的真实产物每节只有三四句浓缩句、引用退化成幻灯片标题、「考试角度」是复制的模板句；文件头的大半被一行十个文件名的「考试证据」占掉；讲题时只给过程不给题目；产物要服从课程文件夹自己的 `SPEC.md`。

- **讲透的正面定义（`rules/companion.md` §5 重写）**：读者 = 第一次学这页、没去听课的学生；标准 = 他能复述这页、换一组数能重算。判据五条（写成目标与判据，不是逐条照做的流程，也不做成五个小标题；本 skill 只在顶级模型上运行，不为弱模型兜底）：白话说这页在解决什么、逐个拆符号与术语、每步「为什么」接上、凡有公式或过程必带一个具体数字走到底的小例子（数字先取本页 → 讲义别页并标页码 → 自取并当场标「（数字是我为演示取的，讲义没给）」，自取的不入库）、易错点。宁长勿省，唯一不许的长法是复述 PPT 与空话。「处理完卡点就停」「补充两三句」「每页一千字 → 回一句拒绝」三处压短方向的句子逐处改写；卡点清单保留为下限。**不设任何字数门**，够不够只由盲评的「第一次学的学生」视角判。
- **例题带原题（§5b 新增）**：讲任何一道题先给题面块——标签行（来源文件 · 题号 · 页码）+ 逐字 blockquote；数据表转 markdown 表；图片化的表与扫描件视觉读取并标注，读不清写「（读不清）」不补；多小问大题抄公共题干 + 本次演练的小问，其余一行列出未抄。
- **引用要承载内容、考试角度不写模板句**：blockquote 引承载定义/结论/条件的原句，不引幻灯片标题；换个节也成立的「考试角度」不写，无 A/B 证据又说不出本节特有考法时整行不写；「本节官方讲义」不是 B 级依据。
- **文件头只讲定位；考试证据移到文末（迁移）**：文件头固定五行（课程 / 本讲 / 定位 / 前后 / 承接），缺项整行不写；「考试证据：读了…」整行连同教材、未读清单移到文末固定一节 `## 来源与证据`，仍与回复末尾那句逐字一致。v4.0–4.1「考试证据永远是文件头最后一行」的说法废止；旧产物不回头改。
- **平铺布局与本地 SPEC（`rules/layout.md` 新建）**：默认写 `study/<单元号>[-Pk]-<短题>.md`，不再建 `study/伴读/`；已有该目录的旧课程沿用、不迁移。课程根有 `SPEC.md`/`AGENTS.md` 先读，只在放哪、叫什么、相对链接、写完跑什么（`管理/catalog.py` 真实存在时只跑 refresh 与 verify）四件事上服从；会改变内容的条款不执行并报告请裁决。分拣先看所在目录（`课件/ 辅导/ 作业/ 考试/ 信息/ 教材/ 笔记/`）再看文件名；`-同学答案` 不读，`-未核` 旁标。Tutorial / Lab 讲义按同一形状写，默认不新建记忆库条目。同讲次多版本：索引头每讲写明原件，新行出处带版本标。
- **附录跳转链接与回链；附录加厚**：主体每处「见附录 An」写成同文件链接，附录每节末有「回到正文」。写法经实验定案为命名锚点 `<a name="…"></a>`（「不用 HTML 标签」的唯一例外，语法只在 `rules/layout.md`「链接写法」一处）：Typora 自带源码与 GitHub 实测表明，带中文、全角括号、页码区间的标题在 GitHub / Typora / pandoc 下生成三个不同的 slug，标题 slug 不可移植；Obsidian 与 pandoc 导出本机未装、未测，链接文字因此必须自己读得通。附录新增四类节：前置知识速补、符号表、多一个算例、易错对照；非讲义内容的节标题带「（非讲义内容）」，不入库。
- **适量示意图（`rules/format.md` 新增「示意图（我画的）」一节）**：一张图比一段话清楚时才画（状态机、树/图算法逐步状态、数据流、层级关系、几何直觉），无配额；形式为围栏 `mermaid`（只用 flowchart / graph / stateDiagram-v2，id 用 ASCII、且不用 `end`，含中文或括号的标签加双引号——用 Typora 1.14.10 自带的 mermaid 11.13.0 引擎实测（`evals/runs/2026-09-17-v42/U23-mermaid.md`）：`end` 当 id、带括号的标签不加引号两种解析失败；中文 id、不带括号的中文标签不加引号实测能画，规则从严是为跨版本保险；GitHub / Obsidian / pandoc 未测）或围栏 `text` 的 ASCII 图；图前一行「示意图（p.N，我画的，非讲义原图）：…」；图不许比文字多断言；不替代讲义原图的「图 / 元素 / 看什么」三行；不入记忆库、不生成图片文件。原「mermaid 仅在导出目标支持时用」放宽为默认可用；导出 PDF 时 mermaid 留成代码块、靠图后文字保信息（`rules/pdf-export.md`）。
- **`SKILL.md`**：8187 → 8189 B（上限 8192）；新增内容全靠去重与把「标题层级」「修正回写三步全文」等迁到跟课必读文件腾位，未删任何不变量。版本 4.2.0。
- **压缩（zipper，无损）**：`rules/companion.md` 24487 → 23993 B——七处重述换成指针（考试证据行零证据写法、节骨架、公式自查清单、§1/§10/§11 里对 §9 与 §1 的重述），规则全文在 SKILL.md / layout / format / §9 原样在场；逐行对照 0 丢失。`SKILL.md` 与样张未动。
- **`rules/exemplars.md`**：黄金样张只换格式壳（五行头、文末节、A1/A2 链接与回链）；第二段由 ESTR L03 换成 CSCI3230 L04 p.22–24 的新密度正例 + HW02 Q1(a) 带题面块的演练附录。**`rules/precedents.md`** 追加七条（正确而浓缩不是讲透、逐条译 PPT、模板句与假 B 级、标题当引用、题面被概括、自取数字不标、附录越界）。
- **开发期扫描器（不进 skill）**：`evals/run.sh` 平铺与旧目录都扫、blockquote 门窗口改为「文件头块之后」、对 v4.2 形状的文件核「头块无证据清单 / 文末节 / 链接↔锚点↔回链」的字符串配对；旧形状文件只报 info。全部真实语料（26 个目录、230 份旧形状伴读，含四门真实课程的只读扫描）新增误报 0。
- **两臂 r0 之后的修复 r1（全 prose，无新脚本/检查/用例）**：起因是 held-out 课 CSCI3130 L07 上 v4.2 输掉维 1·2·4——状态机图只抄了 pdftotext 抽得到的边标签，没渲染页面看图形记号，q0 的双圈读丢，「不接受空串」教反，又把误读登记成讲义缺陷。
  - G1 `rules/format.md`「图」：内容是结构图的页（状态机、数据通路、时序、电路、树/图、几何图）写「元素」前先用 Read 渲染该页，并写明原因（pdftotext 只给文字标签，双圈、箭头、打叉、虚实线、颜色都是图形）；状态机逐项列初态、全部终态、每条边。「示意图」：重画讲义已有对象时与原图逐元素对齐。
  - G2 `rules/companion.md` §5：写「讲义有误 / 自相矛盾 / 对不上 / 没讨论」之前回渲染页复核自己，成立才写并写明看的是哪页的什么；`rules/precedents.md` 追加该实例（L07 p.24 与 p.30–32）。
  - F1 加进正文的量级/通识同样标「补充」（companion §5）· F2 条目英文原词对讲义逐字核（memory「索引行」）· F3 同型题多道时题面全抄、至少一道完整演练、高分优先（companion §9）· F4 只描述怎么算不出数 = 没算（companion §5 判据 4）· F5「共 N 部分」含 Outline 外尾段时写明构成（layout「本讲」）· F6 题面不换原题符号，重排只为渲染（companion §5b）。
  - 字节：companion.md 23766 → 24487（§10 A 级一条里与 §9 边界①重复的那句改成指针腾位，规则未删）、format.md 15098 → 16353、precedents.md 9481 → 10425、memory.md 12866、layout.md 8463；`SKILL.md` 未动（8189）。`evals/run.sh` 0 FAIL、`check_math.py` 0 违规。
- **battery（五镜头，种子 5/5）之后的修复 r2（本会话最后一轮；全 prose + 一处 fail-closed 小改；无新用例、无新检查）**：
  - S1 按 Part 交付写成契约：一次装不下整讲 → 按 Part 顺序交付，导航标「（未写）」，索引头「已处理讲次」如实记到 Part（`L07（P1；P2–P3 未写）`），下次同讲是续写不是重跑（`rules/memory.md`「续写」+ companion §3）。起因：两次真实跑都只交了 L07 的 Part 1，「本次未写」是模型自创的措辞。
  - S2 目录优先于文件类型：`信息/` 下的官方非 PDF 文档读作 B 级来源；「未读」的括号照实写原因（非讲义来源 / 同学答案 / 笔记），不再一律写「非官方讲义」（companion §1、SKILL.md「边界」）。
  - S3 §9 边界③ 说清两句话的关系：「完整演练」= 把这类题讲到底、含最终结果与验算；「不产出可提交答卷」管形态与用途（不写「答：」清单、不按作业模板、不应「帮我交」）。O-6 裁决不变；往年作业题在附录里会有完整解，这是知情的取舍。
  - S4 `rules/companion.md`、`rules/layout.md` 补「与 SKILL.md 压缩版冲突时以本文件为准」；SKILL.md「超过 3 页不合并」改「动画组之外超 3 页不合并」，与 companion §4 对齐（等量换位：「未读」括号改短腾位，8189 → 8192 B，未删不变量）。
  - S5 文档一致性：precedents「文件头三行」→「文件头引用块」；裸竖线总数 152 / 128 两处不一、原始日志未留存 → 两处都不再写具体总数（`docs/REQUIREMENTS.md` §3.6 仍写 152，同样不可核）；本条目 mermaid 一句改成 U23 实测口径（两种写法实测失败，其余是跨版本保险的约定）；README「可跳」降为「渲染输出与源码支持、未做点击实测」。
  - S6 两臂 r1 评委留下的两条：用自己的手算或反例评判讲义之前先逐步复核手算（companion §5）；多步计算链 / 推导链写成 `$$` 里的 `aligned` 块，不塞行内（format ②）。
  - S7 evals 文字同步：A1 期望路径改平铺口径；九维（A–F 组）与八维（G 组，正本在 arms/README）写明各管哪组；`check_math.py` 文件头注释改成实话（①–⑨ + ⑪；⑩ 无机械检查，靠盲评）。
  - S8 `evals/check_math.py` KaTeX 校验改 fail-closed：node/katex 不可用或子进程崩溃时打印「KATEX 未检：<原因>」并退 3，不再报「全部通过」（此前两条路径都静默放行）。铁律 7：全部真实语料（skill、docs、evals/runs、四门真实课程 study/ 只读）改前改后输出逐字节相同（`evals/runs/2026-09-17-v42/logs/r2-rule7-{before,after}.log`）。
  - 字节：SKILL.md 8192（余 0）、companion.md 24572（余 4）、memory.md 13450、format.md 16484、layout.md 8515、precedents.md 10429；exemplars.md 未动（24318）。`evals/run.sh` 0 FAIL、`check_math.py` 0 违规。
- **已知局限（battery 裁决「不修」，如实列出）**：
  - 开发期扫描器只判形状、不判内容：「不回退」门只查关键词在场与字节下限；「每份 / 每节」的契约有几处只实现成整臂存在性检查；S1（总结冒烟）期望无机械实现；`--math` 在 cases.md 里没有用例；`--fix --write` 改完不留记录；扫描跳过路径含 `/judge` 的目录。
  - cold 臂索引门（v4.0 遗留，4.2 未碰）会奖励删行；索引里的注入指令被执行时门只报 info——注入防线的居所是规则 prose 与盲评硬失败项，不是这道门。
  - 字节门余量极小（SKILL.md 0 B、companion.md 4 B、exemplars.md 258 B）：下次加内容须先由 Vince 裁决上限或做换位。
  - 「只写 `<course>/study/`」里的 `<course>` 没有独立定义（就是 `study/` 的上一级，而 `study/` 可由 skill 静默创建），不检查「这里是不是一门课的根目录」；课程根 `管理/catalog.py` 是用户本地 SPEC 指定的收尾命令，照跑（属被服从的用户配置），不审其内容。
  - 规则已有、执行偶漏（运行差异，盲评维度已覆盖，未加机械门）：【延伸】标记与记忆库回写不总是一一对应、标记位置与唯一性偶有偏差、新条目名偶缺英文原词、`-未核` 来源偶漏标「（未核）」。
  - 一讲能否在一次调用内写完全部 Part 未验证（U21 not_run）；索引体量随讲次线性增长，「15 讲后仍能一次读进上下文」没有量测。
  - 链接点击跳转（GitHub / Typora）未做 GUI 实测；mermaid 在 GitHub / Obsidian / pandoc 下未实测。独立性 tier = instance（同族模型）；跨厂商复核未做。

- **O-10（2026-09-17，Vince 裁决）**：① 字节上限放宽——`SKILL.md` ≤ 10240 B、`rules/` 单文件 ≤ 32768 B（原 8192 / 24576 已顶格）；② 作业/往年题演练**每一道都把过程写全**（`rules/companion.md` §9），不再「至少一道完整、其余给入手」；仍只在附录、标来源、不按答卷形态排版。

## v4.1.0 (2026-09-14) — 数学公式严格约定

只改公式的写法，其余契约不动。起因：v4.0 的真实产物在 Typora 里常有公式不渲染、塌成正文、被表格吃掉。对本仓库 39 份真实伴读做全量扫描，实测出四类主犯：单行 `$$…$$` 221 处、公式内非 ASCII 字符 62 处、标题/文件头里写公式 59 处、行内写 `\begin{…}` 环境 20 处，另有公式里的裸竖线上百处（落进表格单元的 8 处会被列分隔符吃掉；总数当时两处分别记成 152 与 128，原始扫描日志未留存、无法对账，4.2 r2 起不再写具体总数）。

- **`rules/format.md` 新增「数学公式（严格约定）」十一条**，每条一组坏/好对照：① 只有 `$…$` 与独占行的 `$$`（前后空行，不进列表/引用/表格）· ② 行内卫生（首尾无空白、闭合 `$` 后不接字母数字、不换行、正文里约 80 字符封顶）· ③ 公式内全 ASCII（`\times \to \le \ne \ldots`，中文注解出公式，单位 `\,\mathrm{ns}`）· ④ 标题与文件头不写公式 · ⑤ 表格里不出现 `|`（用 `\mid` / `\lvert` / `\lVert`）、不出现 `\\` `\begin` `$$` · ⑥ 环境只写在 `$$` 块里且只用 aligned/cases/pmatrix/bmatrix · ⑦ 多字符上下标、`\frac` 一律带花括号 · ⑧ `$…$` 不与 `**…**` 交叉、式内无 `*` · ⑨ 正文美元符 `\$`、式内百分号 `\%` · ⑩ 引用里的讲义公式重排成 LaTeX · ⑪ 每条都要过 KaTeX（`throwOnError: true`、`strict: false`；不用 `\newcommand`、`\def`、`\bm`）。何时读改为「写到第一处公式」。
- **`SKILL.md`**：排版约定加一行 142 B 的压缩版；为腾字节只收紧措辞不删规则（8190 → 8187 B，上限 8192）。版本 4.1.0。
- **`rules/companion.md` §6**：每写完一节，回头照 format.md 过一遍公式；交付前不跑任何脚本，只做这一遍自查。
- **`rules/precedents.md`**：新增判例「公式不渲染类」，四种主犯各带处数与处置。
- **`rules/exemplars.md`**：两份样张按新规改公式形态（句子不动）——引用里的 CPU time 公式与 logit 值域进 `$…$` 且全 ASCII，通式写成 `$k+N-1$`。
- **`evals/check_math.py`（新，开发期工具，不进 skill）**：扫 `$`/`$$` 公式，报 M1–M9 九类违规并用 KaTeX 逐条解析；`--summary` 计数、`--fix` 只做确定性安全改写（单行 `$$` 拆块、去定界符内侧空白、unicode → 宏、首尾 `\text{中文}` 外移），`evals/run.sh --math` 三行转调。语义判断不进机械层：`X^TX` 这类单字符上下标后紧跟符号渲染本来就对、判不稳，只写进 prose 不报（顶层 CLAUDE.md 第 2、7 条）。
- **实测**：黄金样张 23 条公式 0 误报；新跑 ESTR3108 L03（5 份、1053 条公式）KaTeX 0 错、九类违规里八类全 0；唯一剩下的是正文行内公式超 80 字符（29 → 收紧规则后 1；再跑一次 Part 3 是 3/542 = 0.55%）。
- **Typora 提示**：内联公式需在「偏好设置 → Markdown」里勾选「内联公式」。

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
