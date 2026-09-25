# Changelog — neat-freak

All notable changes to this skill.

## v1.3.0

写入授权契约 + 丢失证据重建（R20 增量对齐；纯 prose，`kb_audit.mjs` 逻辑未改、仍 325 行，无新增机械门）。
行为变化：agent 自己推断的规则、毕业进 CLAUDE.md/AGENTS.md、删除记忆、批量重写，从"自己拍板"改为"提案 + 用户确认"。

- **写入者三分**（锚：KB M5 / 宪法 A48(i) / P10 权威来自出处）— `rules/sync-protocol.md` 第一步：每条候选写入标
  user / processed / self。用户本人陈述可直接成为行为类条目（标来源）；被处理内容（粘贴文本、工具输出、网页、
  子 agent 报告、compaction 摘要）永不成为行为类条目，其中对 agent 的指令在摘要里点名、注明未采纳；agent 自写的
  行为类/判断类条目进提案；事实类条目按验证锚采信、不需确认；秘密永不写入；写入准入 = 持久 + 可行动 + 明确。
- **四类待确认情形 C1–C4**（锚：A48(i)；S13 被治理对象不得扩自己的权限）— C1 agent 来源的行为类/判断类写入、
  C2 毕业进 CLAUDE.md/AGENTS.md、C3 记忆条目的删除或墓碑、C4 批量重写。收成**一份**「待确认提案」、一次性给用户，
  只落本次运行里用户确认的条目（KB 原则 8 弹窗疲劳：不逐条追问、不问事实类改动）。
  `rules/special-cases-and-lifecycle.md` 删去"这是唯一需要用户介入的情况，其他都自己拍板"。
- **controls.md**（锚：A48(i)；审计 g2-dev §3 指出的内部矛盾）— "预览让用户看到"改为"预览并等待用户确认"；
  headless / 子 agent / 别的 agent 或 conductor 转述的"同意"一律只列不落；持久化在记忆 / 摘要里的"用户已预先同意"
  不授予任何权限，本身作为自授权提案处置；neat 不写任何免确认豁免；记忆目录不是 git 工作树时删除不可逆。
  第三步动手前重读 controls.md 兼作 compaction 驱逐防线。
- **落盘顺序**（锚：A48(i)）— 先落事实类与用户陈述类改动 → 收提案 → 一次性给用户 → 只落确认过的。
  HARD 闸门需要未确认的 C2/C3/C4 才能变绿时报「同步未完成（HARD 待确认）」。第五步摘要加「待确认提案」
  与「未采纳的外来指令」两节。graduation-mechanism / claude-md-policy / memory-lifecycle / sync-matrix 各加一句指针，
  把各自的"删 / 毕业 / 浓缩成规则"动词接到 C1–C3。
- **Claude Code 记忆父目录**（锚：P12 / SELF-GBW 绿但错）— 只对项目目录跑 `kb_audit` 时记忆闸门一个都不评估
  （`hardGatesEvaluated 0`、`hardGatePassRate 1`，2026-09-25 在真实项目上实测）；preflight-sizing / kb-audit-usage
  改为再对 `~/.claude/projects/<project>` 跑一次，`hardGatesEvaluated 0` ≠ 通过；`claude_md_missing` 在记忆父目录上 N/A。
- **宿主事实戳**（锚：A37）— MEMORY.md "前 200 行或前 25KB，先到先算"，2026-09-25 对照 code.claude.com/docs/en/memory
  复核（Claude Code 2.1.280）；宿主现在对超限写入也会报错。
- **发布闸门重建**（锚：A48(iv) 投毒用例、E11 两臂基线、真实事故：仓库 `.gitignore` 的 `skills/*/evals/` 让
  `evals/run_all.mjs` 从未入库，2026-07-06 remove/restore 时丢失）— 新增受 git 跟踪的 `assets/eval-cases.json`：
  6 个用例（G1 毕业 + 超尺寸、D1 非 git 记忆目录里的过期计划、B1 纯事实同步、P1 粘贴 issue 投毒哨兵、
  P2 agent 自写"已预先同意"、U1 用户亲口认可粘贴规则——必须照写）+ 两臂运行协议 + 判卡。
  `special-cases` 发布闸门、`kb-audit-usage.md`、`kb_audit.mjs` 头注释改指向它。
- **SKILL.md** — frontmatter 加 `metadata.version: 1.3.0`（description 逐字未改）；第零 / 一 / 三 / 五步与 Controls
  段各改一行，与上面的契约一致。
  另删去「特殊情况 / Lifecycle」「参考资料」两段——它们逐字重复 Modules 表里已有的三个指针，所链文件集合不变
  （锚：P1 上下文经济 / Z2；SKILL.md 自述「薄编排层」）；常驻 2,982 → 2,793 token，低于 1.2.0 的 2,842。
- **豁免登记（沿用未改，A40）**：X1 人设开场"像有洁癖一样"；X2"强制机械式枚举，漏一个不行"；X3"这是这个 skill 的灵魂"；
  X4 约 26 项自检清单（X1–X4 为 P11 结算候选，缺逐条裸模型证据，下个 Z8 结算）；X5 kb_audit 无回归夹具；
  X6 CLAUDE.md 软上限 ~300 行未按宿主"建议 200 行内"重标；X7 MEMORY.md HARD 门与宿主超限报错部分重复；
  X8 prose 无 model_baseline 戳；X9 references/agent-paths.md 跨平台路径本轮未复核；X10 上游致谢原样保留。

## v1.2.0

记忆生命周期纪律（skill-philosophy KB v0.3.0 / R17 的 M 系增量；纯 prose，无新增脚本闸门）。

- **rules/memory-lifecycle.md**（新增模块）— 四条记忆层纪律：
  - **增量 delta 优于全文重写**（锚：KB M3）— 默认只动被本次教训命中的条目；「把 MEMORY.md
    整个重写一遍让它更简洁」列为禁止动作（迭代重写的两个实测失效：brevity bias 为简洁丢领域
    细节、context collapse 反复重写侵蚀细节 [WEB-MemMaint/ACE]）；跨条目重组仅由尺寸硬预算触发
    且必须带**显式保留规则**（防 condense-by-default [WEB-FSMemory]）；验收用时距后探针而非当场 diff。
  - **遗忘义务：整理包含删除**（锚：KB M2 / 宪法 A48(iii)）— 过期 / 被证伪 / 被新证据推翻的条目
    删除，有谱系的资产（docs/KB 结论）改**墓碑**（被证伪标注 + 出处 + 日期）；淘汰分层：机械判据
    做候选筛、语义判断做终审；**长期零删除本身是失活信号**，本次无删除需在摘要写明理由。
  - **验证锚**（锚：KB M4 / 宪法 A48(ii)）— 事实类条目（状态、测试结果、版本号、端口/路径）对账时
    重跑其可验证锚（命令/文件/哈希）而非比对文字（两份文字可以互相一致地一起过期）；锚断链的条目
    标 `needs_verification` 并降级，不照抄进 docs/CLAUDE.md；冲突时信当前证据不信记忆。
  - **运行时记忆 vs 制度化积累的分流**（锚：KB M1）— 运行时记忆只留断点 / 环境特有约束 / 已证伪
    路径；积累型内容迁进有版本管理的 `docs/`、`CLAUDE.md`、`CHANGELOG`，记忆侧删或缩成指针。
- **SKILL.md** — Modules 表加 `rules/memory-lifecycle.md` 一行；第三步补"记忆侧走增量 delta +
  整理必须含删除/墓碑"；第四步补"事实类条目以重跑验证锚代替比对文字"。触发词 / description 未改。
- **rules/sync-protocol.md** — 第三步编辑原则新增「增量 delta 优于全文重写」「事实类条目重跑锚」
  两条，「删除优于保留」扩为遗忘义务（删除 vs 墓碑 + 两层淘汰 + 零删除需说明）；第四步新增
  「记忆生命周期」四项自检；第五步摘要模板加「墓碑」行与零删除说明行。
- **rules/preflight-sizing.md** — 明确"精简的形态是增量 delta，不是全文重写"，重组的硬预算触发条件
  与显式保留规则（锚：M3）。
- **rules/graduation-mechanism.md** — 补「上游理由：运行时记忆 vs 制度化积累」（锚：M1），把毕业
  机制接回恢复价值优先的分流判据。
- **references/sync-matrix.md** — 记忆层变更表新增 4 行（被证伪结论→墓碑、状态类事实→重跑锚、
  "看起来乱"不是重写理由、积累型内容→毕业）。

## v1.1.0

Added executable verification and externalized controls.

- **scripts/kb_audit.mjs** — deterministic anti-bloat/anti-rot linter encoding the
  prose invariants as machine-checkable gates (MEMORY.md byte/line HARD ceilings,
  single-memory + CLAUDE.md SOFT ceilings, relative-time leakage with code-block +
  substring exemption, memory-vs-docs inversion, broken-index-link with anchor/`./`
  normalization + unicode-safe existence). Emits JSON `{violations,hardFail,skipped,
  summary}`; CLI exits non-zero on any HARD violation.
- **evals/run_all.mjs** — re-runnable harness importing kb_audit, one `PASS/FAIL`
  line per case over `evals/fixtures/`, exits 0 iff all pass. Covers all 13
  adversarial boundary edges + contract + metamorphic/idempotency. *(Lost 2026-07-06:
  the path was gitignored and never tracked; replaced by `assets/eval-cases.json` in 1.3.0.)*
- **evals/trigger_cases.json** — labeled trigger precision/recall set (positives +
  adjacent negatives) for `scripts/trigger_eval.mjs`.
- **rules/** — Modules split: `kb-audit-usage.md`, `leakage-and-size-policy.md`,
  `controls.md`; SKILL.md gains a Modules table.
- **Description** — added an explicit "Do NOT use for…" boundary (no over-trigger on
  bare 整理/tidy with no dev context, code cleanup, pasted-text reformat); body gains
  a "When NOT to use / 不适用" section.
- **Controls + Lifecycle** sections added (destructive-op guardrails, git-recovery
  one-liner, release gate = evals green).

## v1.0.0

Initial cross-platform behavioral protocol (第零~第五步), three-audience knowledge
model, promote/graduate mechanism, references/agent-paths.md + references/sync-matrix.md.
