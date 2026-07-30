# Changelog — neat-freak

All notable changes to this skill.

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
  adversarial boundary edges + contract + metamorphic/idempotency.
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
