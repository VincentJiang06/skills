# 证据驱动的 Skill 资料搜集 / Evidence-Driven Skill Research

machine_summary_zh: 依赖外部事实的 skill 必须先做可控广度和深度的资料搜集：建立来源花名册、多角度 fan-out、迭代深化、可靠性分级、三角验证，最后让每条结论可溯源到证据 id。

machine_summary_en: A fact-dependent skill must first run breadth- and depth-controlled research: build a source roster, fan out across angles, iteratively deepen, grade reliability, triangulate, and make every conclusion trace to an evidence id.

reference_ids: `ref.prisma.2020`, `ref.cochrane.handbook`, `ref.grade.working_group`, `ref.nato.admiralty_code`, `ref.caulfield.sift`, `ref.unaids.triangulation`, `ref.w3c.prov_overview`, `ref.arxiv.self_rag`, `ref.arxiv.deeprag`, `ref.arxiv.agentic_rag_survey`, `ref.arxiv.question_decomp_rag`, `ref.arxiv.deepwidesearch`, `ref.arxiv.claimaudit`, `ref.pirolli.information_foraging`

node_ids: `pillar.research`, `procedure.source_roster`, `procedure.search_fan_out`, `procedure.iterative_deepening`, `procedure.source_reliability_grading`, `procedure.triangulation`, `principle.claim_evidence_traceability`, `metric.source_coverage`, `metric.claim_traceability_rate`

## 1. 为什么资料搜集是一等公民

很多 skill 的真正价值不在于执行步骤，而在于它建立在多少、多可靠的外部证据上。一个"客观评价"类 skill 如果只搜到一两个来源，结论再流畅也是空中楼阁。因此资料搜集不是可选的前置动作，而是和触发、协议、测试、指标并列的设计单元（见 `doc.architecture.industrial_skill_design` 第 2 节的 Evidence base 单元）。

资料搜集有两个可独立调节的维度：

- 广度（breadth）：覆盖了多少来源类别和角度。由 `procedure.search_fan_out` 负责，用 `metric.source_coverage` 衡量。
- 深度（depth）：在每个高价值来源上挖得多深。由 `procedure.iterative_deepening` 负责。

skill 设计时应显式声明这两个旋钮的目标值，而不是让模型即兴决定。检索工具 `query_kb.mjs` 的 `--broad` / `--exhaustive` / `--hops` / `--routes` 正是把这两个旋钮交给 agent。

## 2. 来源花名册

`procedure.source_roster`：进入搜索前先列出应覆盖的来源类别（官方文档、测量数据、媒体评测、论文、代码、issue、专家意见……），并为每个来源记录类型、取向、可靠性和用途。花名册的作用是把"我搜过了"变成"我覆盖了哪些类别、还差哪些"，让 `metric.source_coverage` 可计算。

系统评价的报告规范（`ref.prisma.2020`、`ref.cochrane.handbook`）提供了成熟的检索-筛选-记录模板；OSINT 工具目录（`ref.osintframework.com`）提供了多渠道来源的分类参考。对缺乏文献覆盖的领域，可用结构化专家征询（`ref.rand.delphi`）作为来源补充。

## 3. 广度：多角度 fan-out

`procedure.search_fan_out`：同一个问题从多个角度并行搜索，每个角度命中不同来源，再合并去重。关键技术：

- 查询分解：把复合问题拆成子问题分别检索（`ref.arxiv.question_decomp_rag`、`ref.arxiv.deeprag`）。
- 同义扩展和受控词表，避免因措辞单一而漏检（`ref.niso.z3919`）。
- 假设文档嵌入（`ref.arxiv.hyde`）等扩展检索召回。

广度不足的典型失败是"单角度搜索"——只用一种查询方式，`metric.source_coverage` 偏低。深广兼顾本身是公认难题（`ref.arxiv.deepwidesearch` 显示顶级 agent 在深广双要求下成功率极低），因此广度要显式规划而不是默认。

## 4. 深度：迭代深化

`procedure.iterative_deepening`：对高价值来源按"信息气味"（`ref.pirolli.information_foraging`）逐步深入，每轮自我评估是否已饱和，循环检索-评估-再检索直到边际收益变小（`ref.arxiv.self_rag`、`ref.arxiv.agentic_rag_survey`）。终止条件要明确：连续 K 轮无新增有效来源即停，避免无限深挖或过早收手。

## 5. 可靠性分级

`procedure.source_reliability_grading`：不是所有来源等价。用双轴评级（来源可靠性 × 信息可信度，`ref.nato.admiralty_code`）和证据质量分级（`ref.grade.working_group`）给每条来源和情报打分，对低可靠、版本相关、时间敏感的来源打上明确标记。快速核实可用横向阅读法（`ref.caulfield.sift`）。

## 6. 三角验证与冲突处理

`procedure.triangulation`：关键结论必须多源交叉印证（`ref.unaids.triangulation`、`ref.betterevaluation.triangulation`）。冲突的来源不要悄悄合并——显式记录冲突、各自的证据和置信度。这一步把"看起来一致"和"真的被多源支持"区分开。

## 7. 声明可溯源

`principle.claim_evidence_traceability`：输出里每条事实性声明都要能追溯到具体证据 id，来源观察和自身推断分开记录（`ref.w3c.prov_overview`、`ref.arxiv.claimaudit`）。用 `metric.claim_traceability_rate` 衡量：依赖外部事实的 skill 目标值是 1.0，没有证据支撑的事实声明只能算草稿。

## 8. 产物与验收

资料搜集的产物是一份 `research_doc`（见 `templates/research_doc.template.md`）：research question、source roster、findings（每条绑 evidence id）、inferences、decisions、required asset updates、validation plan。设计审查清单 `checklist.skill_design_review` 的 `design.evidence` 项要求：依赖外部事实的 skill 必须有可溯源证据基础，或明确标注 N/A 及原因。

## 9. 把广度和深度交给 agent

不要把搜索深广写死在提示里。用 `query_kb.mjs` 的参数让 agent 按任务自决：调研型任务用 `--broad`/`--exhaustive` 起步，`--hops` 控制图谱深度，`--routes` 控制覆盖路由数，`--max-tier` 控制来源质量门槛，再按 `metric.source_coverage` 和边际收益收窄。学习已有 skill 的资料组织方式见 `doc.research.skill_reference_library`。
