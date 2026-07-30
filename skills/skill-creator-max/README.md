# skill-creator-max

> 一个 skill 装下整条造 skill 流水线 —— 薄指挥官逐角色派出**全新子代理**，只看回传的类型化工件、逐门把关、逐门路由；每条规则都引 `skill-philosophy` KB 锚点。

[English](README.en.md) · **简体中文**

**做什么** —— 把造 skill 的五个职能 —— composer（决策规格）/ guidance（结构契约）/ engineer（红绿构建）/ zipper（无损压缩）/ conductor（指挥）—— 收进**一个** skill。SKILL.md 本体是一个**薄指挥官**：它自己不做任何一项职能，只**为每个角色派出一个全新子代理、监视其回传的类型化工件、拿确定性门校验、再决定下一步路由**。指挥官的全部权力来自工件，从不来自读子代理的过程。**它就是本仓库现行的造 skill 流水线**：取代并已下线旧的四 skill 架构（skill-guidance / skill-engineer / skill-zipper / skill-conductor，已从仓库移除）。

**架构** ——

- **薄常驻体 + 五个按需 role-pack**：`roles/{composer,guidance,engineer,zipper,battery}.md` 只加载进被派出子代理的上下文，永不进指挥官本体（反臃肿）。
- **五份工件 JSON schema**：SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord —— 全部走六厂交集写法，可移植。
- **确定性 L0 门脚本**（`scripts/validate_*`）：**只查结构** —— 过门永远不是「内容对了」的证据（schema-valid ≠ true）。实质由电池买单。
- **O5 独立对抗电池**：`roles/battery.md` 自含（从 vince-attacker 五镜头蒸馏而来），无需外部 skill；高风险时改派**不同厂商的攻击者**换取模型级独立性。
- **完全独立运行（standalone）**：`skill-philosophy` KB 只是设计期出处（design-time provenance），保存在**仓库外**——不随仓库分发、运行时也不读取。role-pack 已把 KB 规则操作化、锚点作为引用标签内联，跑整条流水线不需要任何 KB 在场。

**好在哪（它关掉的六个坑）** ——

1. **green-but-wrong 验证器** —— 门被刻意降级为 L0 纯结构；实质证据只能来自独立电池 + 二阶抽查。
2. **渐近电池被错编成「N 轮干净」** —— 停止条件是预注册的 E9 预算/边际门，永远不是干净轮数。
3. **单操作员自报 / 可伪造的门** —— 门控在带外（out-of-band），每个门裁决存成完整决策对象（Decision Record：证据·被拒选项·不确定性·裁决人）。
4. **臃肿** —— 指挥官本体薄，重规则全在 role-pack 里按需进子代理上下文。
5. **编排摩擦 + 同作者相关性** —— 一个 skill 免去跨 skill 交接；每角色**全新上下文派发**从构造上就把构建者和评判者去相关。
6. **description / 可移植性** —— 六厂交集 schema + description 长度纪律 + 硬 anti-trigger。

**v1.2.0 新增（对齐 philosophy KB v0.3.0 / R17）** ——

- **composer 多一步「规格能买到什么、买不到什么」（C10）**：核心条款要挂**对抗判例**（专门试图证伪它的输入）才算 load-bearing —— 每条主观 success 维度至少一条，每条不可接受失败要点名产生它的输入类；**拒收「让 agent 读 codebase 反写规格」**作为决策字段的作者（仓库级可执行规格生成最强只有 20.2%，它只能当 baseline/materials 的输入）；**遵从率天花板 ~89% 且跨版本非单调** —— 规格写得完整不换取验证预算削减。
- **engineer 多三条验证器工程纪律（E12）+ 一个循环分支（A45）**：0% 全灭先怀疑靶子（先证明已知好输入判绿、退化输出判红，再动 skill）；judge **逐条判**，批量打分有实测准确率代价；rubric **条目互不重叠**是误报治理第一原则，一致率高不等于抗操纵。若被造的 skill 本身是 **>1 轮自治循环**，Evidence Dossier 要带 **loop-charter 附件**（可运行检查+开跑前红灯 / 裁决权与生成者分离 / 盘上状态过冷恢复 / 结构化停止条件含上限与双侧闸）。
- **guidance 多三条按需分支（S12/S13/A48）**：**工具面** —— 接口是要标定的超参数（3–8pp、非单调），工具数 >30 评估按需装载、每工具 ≥3–4 句+输入示例、相关操作合并成带 `action` 的单工具；**行动面** —— 规则层与执行层分开声明（命令白名单只是规则层），确认门要少而真（弹窗批准率 ~93%，逐次确认是疲劳不是治理），被治理者不得给自己扩权；**记忆面** —— 写入准入三合取（Durable∧Actionable∧Explicit）、事实条目挂验证锚（采信前重跑）、遗忘义务（删除或墓碑）、外部内容只可存「引用+出处」不可存行为指令。
- **指挥官只加了一段条件分支**：上述循环/工具/行动/记忆分支进入既有关口的检查清单 —— **关口顺序与 min() 裁决逻辑未动**，也没有把任何语义判断机械化。

**触发纪律（重要）** —— 这个 skill **很贵**（大 token 开销）。它只在用户**明确要求编写/构建/创建一个 agent skill**时触发（"build me a skill"、"create a new skill"、"$skill-creator-max"）；对「总结/记录今天的记忆」、日记、泛泛的「创建/做个 X」有硬 anti-trigger。trigger holdout 评测 **0/12 误触发**。意图不明先问一句，不拿整条流水线去赌。

**什么时候用** —— 「帮我造一个 skill」·「create a new skill for X」·「把这个重复流程打包成能自动触发的 skill」·「$skill-creator-max」。

**不适用** —— 总结/写每日记忆、日记（硬 anti-trigger）；只做单一阶段（审计一个现有 skill、只压缩、只跑一轮攻击 → 各自的独立 skill）；任何不是「编写 agent skill」的泛创建请求。

**全模型可用** —— role-pack 是纯 Markdown、可移植；所有工件 schema 走六厂交集 JSON；任何模型都能跑整条流水线。高风险验收时用不同厂商的攻击者，买到更强的电池独立性。

**装什么** —— 1 个 `SKILL.md`（薄指挥官）+ 5 个 role-pack（`roles/`）+ 5 份工件 schema（`schemas/`）+ 7 个确定性门脚本（`scripts/`，各自带 `--selftest` 判别力证明）+ 1 份编排锚点（`references/orchestration-anchors.md`）。

**安装** —— `cp -R skills/skill-creator-max ~/.claude/skills/skill-creator-max`（或经 `npx skills add VincentJiang06/skills`）。

**实测记录（v1.0.0）** —— 这条流水线已在真实构建中跑通两次：(1) 从零端到端造出一个新 skill（`paper-writer`）；(2) 把 `humanizer-academic` 经流水线重建到 v4.0.0。两次都是**真·逐角色新鲜上下文独立**（每个角色一个单独派出的子代理，不是一个 agent 分饰全角色）——这补上了 0.1.0-draft 时期最大的覆盖缺口。独立电池也证明了自己的价值：它抓到了构建者自家全绿测试套件漏掉的真缺陷（paper-writer 的一处 P1 完整性缺口、humanizer 的血红蛋白事实编造）。

**诚实的残留缺口** —— **跨厂商（模型级）电池仍未跑过**：迄今所有电池轮都是同族模型的实例级独立。这是剩下的唯一独立性缺口。自评 strong-candidate / 1.0，但带着这条注记。

完整机制见 [SKILL.md](SKILL.md)。
