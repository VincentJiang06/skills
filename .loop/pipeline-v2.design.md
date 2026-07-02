# pipeline-v2 — 四技能 skill-creator pipeline 大重构设计

日期: 2026-07-02 · 作者: Fable 5（设计+实现）· 执行者目标模型: **Opus 4.8**（skills 日常由 Opus 调用/运行/测试）
范围: `skills/skill-guidance` `skills/skill-engineer` `skills/skill-zipper` `skills/skill-conductor` + 两个内嵌 KB 的 UPDATE runbook

## 0. 目标与不变量

目标（用户原话）：**最强（严格意义上）+ 最兼容** 的 skill-creator pipeline；修掉旧文本的不清晰/逻辑病；融入近两月生态新知；eval 仍以 Opus 为执行者与评审。

不变量（不许破坏的东西）：
- 三份 JSON 契约（handoff-spec / build-report / conductor-log）的**既有必填字段**保持向后兼容（只做 additive/optional 变更）
- 全部既有机械 gate 的**陷阱用例**（round6 的 trap fixtures、G/E/Z evals、KB run_all_checks、gaps selftest）语义保留
- 反通胀机制：min(re_audit, battery)、attacker 独立战役、fail-closed、诚实 stopped_unmet
- 每技能 description ≤320 chars（硬上限 1024）；always-loaded 预算不涨（目标反降）

## 1. 指导原则

1. **Enforcement 从 prose 挪进可执行脚本**（KB 自己的 `anti_pattern.prompted_architecture`；conductor 现在让 Opus 从 markdown 里复制 2000 字符 node -e 单行命令 = 自违原则，也是 round6 用正则从文档里抠命令再执行这种脆弱结构的根源）。
2. **Delete the harness, keep the gates**（LOOPS.md §VIII）：为弱模型写的保姆式重复叮嘱删掉；会「咬人」的硬 gate 全留并脚本化。
3. **单一事实源**：消灭 "X supersedes Y" 式的文件间打架（engineer 的 run-evals vs verification-harness）、消灭同一规则的双份拷贝（G 的 cap 表、C 的 MAX 界）。
4. **兼容 = 前缀容忍 + 标准字段**：安装名带 `vince-` 前缀、repo 内不带；所有 sibling 引用与脚本解析必须两者皆通。frontmatter 按 Agent Skills 开放标准补齐（等研究确认字段集）。
5. Opus 4.8 是执行者：程序步骤显式、判断处有 rubric 锚点、gate 全是 exit-code；不写只有 Fable 才能自行补全的暗示性文字。

## 2. 阅读发现的问题清单（独立于研究）

### 跨技能
- [X1] G/E gate 逻辑以巨型 `node -e` 单行内嵌在 `pipeline-loop.md`，round6 甚至用正则从 md 抠命令来测试 —— 脆弱、难复制、Opus 易抄错。
- [X2] `final-acceptance.md` 硬编码 `../vince-attacker/...`：repo 内该路径不存在（是 `../attacker`），只在安装态成立；反过来 `../skill-guidance/skill-principle` 在安装态靠 name-fixer 改写。需要显式的前缀容忍解析规则。
- [X3] round6 断言 `../develop-principle` 存在 —— KB 已内嵌（8bf320b），**当前就是 RED**。
- [X4] KB `run_all_checks.mjs` 只能从 KB 目录内运行（相对路径），从 repo 根跑 MODULE_NOT_FOUND。
- [X5] 术语漂移：“8 design units” vs schema 里 9 个 key（8 units + adversarial_checklist）；两处 description 评分尺度打架（diagnosis-rubric 用 7 项 0-3/4-5/6-7，description-quality/evals 用 8 项 0-4/5-6/7-8）。
- [X6] 四个技能自身无 version/CHANGELOG —— 自家 lifecycle 支柱不吃自家狗粮。
- [X7] 预算：guidance 1655/1700、engineer 1702/1820 逼近上限；重构应把四个 SKILL.md 全部压回 ≤1500 健康带。

### skill-guidance
- [G1] SKILL.md 开头段落绕（elicitation 的 #1 failure 叙述混在介绍里）；Modules 表把 `spec-format.md` 标成 Step 6（正文是 Step 7）。
- [G2] 无显式「post-build audit」模式：conductor 终验时 re-run guidance 会**覆写** handoff-spec.json，还得让 conductor 自己 copy aside；audit 时 elicitation 问题也不该再问。应设三种 disposition：standalone-plan / pipeline-plan / audit，audit 写 `post-build-audit.json`。
- [G3] cap 规则分居 scorecard.md 与 altitude.md，靠交叉引用粘合。
- [G4] comparables.md 的 `<kb>` 说明句混乱（把 KB 目录默认值写成了一个 JSON 文件路径）。
- [G5] kb-grounding.md 与 SKILL.md 正文重复。
- [G6] spec 一致性校验只有 `node -e "JSON.parse(...)"` —— 升级为 shipped `validate_spec.mjs`（schema+一致性：恰 7 pillars、cap 规则 vs verdict、checklist 含 →、gap→action 映射、altitude 字段齐）。

### skill-engineer
- [E1] trigger_eval（#1 审计缺口的补丁）没接进协议主干：Steps 不提，Modules 表也没有 `rules/trigger-eval.md`，只挂在 Scripts 表脚注里。应并入 Step 5（full altitude 或 trigger 为主要驱动时必跑）+ Retrigger 联动。
- [E2] run-evals.md 与 verification-harness.md 靠 “supersedes” 解决打架 —— 重写为分工明确：run-evals 讲怎么写/怎么跑，硬门槛只在 verification-harness，一处定义。
- [E3] ingest-spec.md “gating vs touching” 是一整段 run-on，重排为决策清单。
- [E4] 无 shipped `validate_report.mjs`（红日志 FAIL 行校验、checklist_coverage↔spec join、P0-done join、harness 重跑）—— 这些逻辑现散在 conductor 的 md 单行命令与 round6 里。
- [E5] SKILL.md 1702 tokens 逼近预算。

### skill-zipper
- [Z1] 评分尺度不一致（见 X5）：统一为 8 项 rubric（0-4 重写 / 5-6 定点 / 7-8 不动），修 diagnosis-rubric.md、plan-template.md（`[N]/7`→`/8`）。
- [Z2] plan-template.md 无 pipeline-mode 说明：Stage Z 下新读者会按模板死等 “go” —— 自治性 bug。补 pipeline 分支（保守 op、不等待确认）。
- [Z3] Step 1 “Ask for the skill directory path” 在 pipeline 模式下不成立，改为条件句。
- [Z4] description-quality.md 待融入研究结论（跨 runtime 的 description 约定、官方 authoring 建议更新）。

### skill-conductor
- [C1] gate 命令脚本化（X1）后，pipeline-loop.md 保留语义（gate 含义、fail 路由表、界）+ 调 sibling 脚本；round6 改为直接测 shipped 脚本（陷阱 fixtures 全保留）。
- [C2] MAX 界数值在 pipeline-loop 与 final-acceptance 双份 —— 单源化（pipeline-loop 定义，final-acceptance 引用）。
- [C3] attacker 路径解析前缀容忍（X2）；audit 工件路径改用 G2 的 post-build-audit.json（删除 “copy aside” 补丁）。
- [C4] round6 修 X3 + 预算行重校 + 新增对 shipped gate 脚本的陷阱测试。

## 3. 重构方案（每技能）

### 共同
- 新增 frontmatter 补充字段（以研究确认为准，倾向：`license`, `metadata.version`）；每技能加 `CHANGELOG.md`（v2.0.0 起）。
- 每 SKILL.md 增加一行**Sibling resolution**约定：sibling 名可能带安装前缀（如 `vince-`），路径解析规则 = 同级目录下「名字 == `<name>` 或以 `-<name>` 结尾」的目录。
- 文字总则：verb-first、每个 gate 写明 fail 时动作、不重复 KB 内容而是指路。

### skill-guidance v2
1. SKILL.md 重写：三段式开头（做什么/产出什么/何时问人），Step 0 = disposition（plan-interactive / plan-pipeline / audit），Steps 1-7 保持既有骨架，Modules 表修正。
2. 新 `scripts/validate_spec.mjs`（G6）：guidance 自跑 + conductor G gate 复用。`--selftest` 含好/坏 fixture。
3. rules 六文件对应修（G3/G4/G5 + elicitation 微调 + spec-format 重排）。
4. audit disposition 写入 elicitation.md（audit 不提问，缺口进 scorecard.gaps）与 spec-format.md（audit 输出路径）。

### skill-engineer v2
1. SKILL.md：trigger-eval 并入 Step 5；Modules 表补 trigger-eval.md；瘦身回 ≤1500。
2. 新 `scripts/validate_report.mjs`（E4，导出函数 + CLI，含红日志校验、coverage/P0 join、harness 重跑 via spawn）。
3. run-evals / verification-harness 重构（E2）；ingest-spec 重排（E3）。
4. red.log、checklist_coverage、value-pinned assertion、macOS realpath 守卫等既有硬规则全保留。

### skill-zipper v2
1. Z1-Z3 修复；SKILL.md 微调（保持已是最干净的骨架）。
2. description-quality.md 融入研究更新（保持 320/1024 数字与 measure_tokens 一致）。
3. 五操作/两层加载模型内容不动（是全 repo 最强的文本），只做尺度统一与 pipeline-mode 补丁。

### skill-conductor v2
1. SKILL.md：Steps 里 gate 全部改为「跑 sibling validator 脚本 + 读 exit code」，保留路由/界/反通胀语义。
2. pipeline-loop.md：删两个巨型 node -e，换 `node <sibling skill-engineer>/scripts/validate_report.mjs <target>` 等调用式；fail 路由表保留；MAX 界唯一定义点。
3. final-acceptance.md：attacker 前缀容忍解析；读 post-build-audit.json；min-verdict、green-but-wrong 判读、stop 条件保留。
4. round6_pipeline_checks.mjs：修 X3；把「从 md 抠命令」改为「直接测 shipped 脚本」；trap fixtures 全保留 + 增补（validate_spec/validate_report 的好/坏样例）；预算行更新。

## 4. Update docs（交付物 2）

`skills/skill-guidance/skill-principle/UPDATE.md`（+ `skills/loop-constructor/loop-principle/UPDATE.md` 薄引用版）：
给 Opus 的常驻 runbook——研究→ 折入 → 传播 → gate 全绿 → 记录。含：
- 触发与节奏（何时值得跑一轮更新；用户一句 “按 UPDATE.md 更新 principle” 即启动）
- 研究规程（信息源清单+查询模板+新鲜度窗口+一手来源规则+confidence 标注）
- 折入规程（哪类更新动哪类文件：references/nodes/edges/docs/metrics；用 KB schema/templates；小步 diff）
- 质量杆（Fable 准则：URL+日期缺一不进 KB；区分 spec 变更 vs 风尚；禁 slop；数字类事实——如 desc 1024 截断——必须复核后同步到列出的全部引用点）
- 传播规程（KB 变更 → 哪些 skill rules/预算/round6 断言要联动；zipper 无损 pass 执行）
- 硬 gate（cd KB && run_all_checks 11/11；四技能 evals；measure_tokens 无 BAD；trigger 尺度一致性 grep）
- 记录（KB reports/decisions + 根 README 提示 + memory 建议行）

## 5. 验证方案（任务 9/10）

机械（任务 9）：四 evals + round6 + KB run_all_checks（两个 KB）+ gaps/validate selftests + measure_tokens flags/预算 + 部署前 reverse-diff。
Opus-xhigh 实测（任务 10，executor=judge=opus）：
1. **触发混淆战役**：四技能新 description + 12-16 条标注 prompt（正/邻负/跨兄弟）交给不知道标签的 opus agent 做「选哪个技能」判定 → 我算 precision/recall（≥0.9 gate，对齐 trigger_eval 语义）。
2. **分阶段实跑**：复用 `evals/skill-pipeline-debug`：opus xhigh agent 按新 SKILL.md 跑 guidance/engineer 各 fixtures → `run_all.mjs --stage guidance|engineer` 确定性打分；held-out fixture 纪律保留。
3. **fresh-reader 理解测验**：opus agent 只读新文本回答 gate/步骤语义问题（专打「文字不清晰」）。
4.（预算允许）conductor 微型端到端 1 例（complete-uuid-validator）。

## 6. 研究结论合并（opus48-model-guidance 报告已回，14 条 confirmed）

已确认并落入方案的新知（全部有官方来源+日期）：

- [R1] **官方 authoring 最佳实践（2026-06 版）**：SKILL.md <500 行；“assume Claude is smart”（只写非显然的上下文）；**degrees-of-freedom 匹配**（开放任务给高自由度 prose，脆弱步骤给低自由度精确脚本）；references 从 SKILL.md **一层深**；>100 行的文件加 ToC；scripts 执行不加载；**先写 3+ evals 再写文档**；**在 Haiku+Sonnet+Opus 三档上测**。→ 落点：zipper 诊断新增 degrees-of-freedom / one-level-deep / ToC 检查；guidance 的 tests 单元强调 evals-before-docs（与我们 TDD 支柱一致）；engineer build-design-units 增补多模型测试注记（full altitude）。
- [R2] **ALWAYS/NEVER/MUST 裸命令是官方反模式**：规则后面必须跟 why（rule THEN reason），让理由成为新情况下的 rubric。→ 落点：hardening-patterns 新增 H11（bare-imperative → rule+rationale）；四技能自身文本按此风格重写（保留 gate，附上理由）。
- [R3] **April postmortem（2026-04-23）**：硬性字数上限（≤25/≤100 words）实测让 Opus 4.6/4.7 降 ~3%。数字化的 brevity 约束压缩推理。→ 落点：zipper diagnosis-rubric 把「对推理/过程文本的硬字数帽」列为可靠性反模式（区别于对*输出工件格式*的合同性规定，后者合法）。
- [R4] **4.8 字面主义**：不会自行推断未写明的要求、不会把规则自动泛化到未列举项。→ 落点：spec-format 强化「逐项列全，勿靠引申」；elicitation 的 slot-substance 判断保留（正合此性质）。
- [R5] **effort 是首要杠杆**（xhigh 为 agentic/coding 推荐地板；推理浅→升 effort 而非加提示词脚手架；manual thinking budget 已死）。→ 落点：conductor 加一行执行注记；不在 skill 文本里塞 reasoning-forcing prose。
- [R6] **compaction 生存**：长跑设计 = 状态落盘（我们的 artifacts/run-log 正是），compaction 后重读工件。→ 落点：conductor 明示「run-log 与 stage 工件即 compaction 生存状态；恢复时从盘上工件重建」。
- [R7] **4.8 spawn subagent 偏保守**，要 subagent 并行就要写明。→ 落点：engineer run-evals 的「每 case 一个 subagent、并行」措辞保持显式。
- [R8] **系统卡**：4.8 诚实性↑（自报缺陷率大降）但注入鲁棒性有回退 → 独立 attacker battery 依旧必要。→ 落点：final-acceptance 里为 battery 存在性补一句为什么（R2 风格）。
- [R9] Claude 5 家族已发（Sonnet 5 06-30、Fable/Mythos 5 06-09）；官方要求跨档测试。→ 落点：同 R1；pipeline 本身仍以 Opus 4.8 为执行者（用户界定）。
- 参考事实（进 KB update runbook，不动 skill 文本）：task budgets beta、mid-conversation system messages（4.8-only）、server-side compaction 参数。

### 第二轮研究（official/community/eval-compat 纯文本重试，全部到位；原始件在 docs/skill-analysis/2026-07-02-research-round*.json）

- [R10] **spec 已冻结为开放标准**（agentskills.io，2025-12-18 起）：6 个 portable 字段 name/description/license/compatibility(≤500)/metadata/allowed-tools(实验)；name ≤64、小写连字符、不得连字符连用、必须等于目录名、禁含 "anthropic"/"claude"/XML；description ≤1024。~32 个 runtime 读 SKILL.md（Codex/Gemini CLI/opencode/goose/cursor/amp/Copilot…）。→ 兼容策略：**portable core only + CC 扩展视为渐进增强**；zipper 新增 portability checklist。
- [R11] **Claude Code 是标准超集**（when_to_use/disable-model-invocation/user-invocable/disallowed-tools/model/effort/context:fork/agent/paths/hooks/arguments/shell…）：validator 不得误杀；CC-only 字段要标注非可移植。CC 列表把 description+when_to_use 截在 **1536**；可移植上限仍 1024；**全部 skill 描述共享 ~1% 上下文预算**（超了静默缩短/丢弃低频 skill）→ 320 目标继续成立且更重要。
- [R12] **skill 内容常驻 + compaction 回挂前 5k tokens/skill（合计 25k）** → SKILL.md 前 5k tokens 必须承载全部承重指令（我们 ≤1500 tok 天然满足，写进 progressive-disclosure-model）。
- [R13] **官方 skill-creator（plugin 版）的 eval loop**：evals.json({skills,query,files,expected_behavior[]}) + 与 baseline 的成对 subagent 对比 + grading.json（字段恰为 text/passed/evidence）+ benchmark.json（pass率/时长/token，模型更新后重跑）+ 盲 A/B comparator + analyzer（专查“断言不判别/嗨变 flaky”）+ **description tuning loop（~20 条 query 一半正一半负、60/40 train/held-out、每条 3 次、≤5 轮、按 held-out 选优）** → trigger_eval.mjs 升级（--runs、holdout 支持）、trigger-eval.md 按官方数字重写流程、run-evals 增 baseline-delta 选项。
- [R14] **判官加固**（arxiv 2604.23178）：强制 CoT 最稳；position-swap 对对抗性输出可能 −3~−13pp；**markdown 偏好 73–97%** → 盲评先去格式化。→ run-evals 评分注记 + conductor 判读注记 + 本次验证战役遵守。
- [R15] **安全**（Snyk ToxicSkills 2026-02：36.8% 有缺陷/13.4% 致命/10.9% 硬编码秘钥；绿勾 ≠ 安全）→ engineer verification-harness 增 security lint（秘钥/未转义 shell 输入/未声明外呼/交互式脚本）；guidance 的 controls 单元引用。
- [R16] **行为类 skill 的 RED = 无 skill 基线运行记录失败**（superpowers testing-skills-with-subagents；3+ 组合压力场景）→ 填补行为类红阶段模糊洞（verification-harness/run-evals）。
- [R17] 便携性 gotchas：脚本必须非交互、相对路径、self-declared deps（PEP 723/npx@ver）、stdout 结构化、工具输出 10–30k chars 截断要分页；目录约定 ~/.agents/skills 是中立赢家（我们已用）；Windows→WSL2。→ zipper portability-checklist + engineer 脚本规则。
- [R18] 社区共识补强：Description Trap（描述里带流程 → 模型跳过 body）已是命名反模式；“cut what Claude already knows” 应成为 Compress 的显式类；superpowers 实测“每任务 subagent review 加倍耗时无质量收益 → inline 自检”（我们的 battery 是终验级、非每任务级，方向一致）；供应商中立措辞（"the agent" 而非 "Claude"）是走出 CC 的前提，新写文本采用。
- [R19] ClawHub/marketplace 规范（version semver 必填、metadata.openclaw、50MB）与我们实践一致；官方 plugin marketplace 打包（plugin.json + version 门）留作发布期工作，不进本次。

### 研究事故记录（本身就是 pipeline 教材）
首轮 4 个 opus-xhigh researcher 里 2 个在做完 90-140k tokens 的真实检索后**返回了 schema 合法的占位符** `{"summary":"test",...}`，1 个卡死在 StructuredOutput 重试上限。教训：**schema 校验 ≠ 内容校验**（minLength/实质性断言必须进 schema 或后置 content-gate）——正是我们 E gate「value-pinned assertions」规则防的那类洞；已把该教训写进 update-runbook 的质量杆一节。
