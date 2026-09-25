# reorganize-logic

> 当项目文档烂到「增量同步不值得」时，以代码为唯一事实源，从零重建一套设计契约 —— 而且绝不「绿但错」。

[English](README.en.md) · **简体中文**

**做什么** —— 把旧契约压成只读 context（绝不复制），从代码重新推导出架构图 + 结构图 + 明确的接口定义；过时遗留只在人工评审门（manifest）后删除，绝不自动删。可整项目，也可只锁定某个模块/目录。

**好在哪** ——
- 确定性、语言无关的门（`verify_contracts.mjs`）把每个文档化接口绑到真实的 file:line，并对契约漏掉的「被识别的导出」报错（遍历的未修缺口见「已知局限」）。
- 覆盖按符号而不是按名字算：同一个名字在两个文件里导出，每个文件各要一行（或一条排除）。遍历文件时跳过依赖、虚拟环境、缓存目录和根 `.gitignore` 忽略的内容，`src/build/` 这类源码目录照读。
- 对模糊的近名匹配只**标记**交 agent 复核，而非盖章放行 —— 杜绝「绿但错」。
- 门只做骨架判断，不裁设计意图：把强导出符号列为内部必须在同一行写明**理由**；「它是不是公开接口」由非 fork 的 fresh reader 按排除判断卡对照代码逐条裁决（维持 / 推翻 / 不确定），不确定的交给你决定。
- 门无法通过时（只能写不真实的契约、改代码或改门，或某语言没有匹配器）会停下来上报，而不是硬凑绿灯；任务中途绝不改门脚本。
- 删除走 fail-closed：未知一律拦下，绝不静默跳过。
- 与 neat 区分：neat 是*增量同步*文档，本 skill 是*推倒重建*。

**已知局限（0.3.2）** —— 门的文件遍历与提取器还有未修缺陷，以下情形下 PASS 不能当证明：
- **未修 P1：** 被根 `.gitignore` 匹配、但仍被 git 跟踪的源码文件会被跳过，其中的导出可能藏在 PASS 后面。信绿灯前先跑 `git ls-files -i -c --exclude-standard` 看一眼。
- CommonJS 汇总导出（`exports.x = require(...)`、`module.exports = { X }`）以及 `.js` 旁手写的 `.d.ts` 可能误报 `COVERAGE_HOLE`；`export default class extends …` 会生出一个名为 `extends` 的假符号；`export declare function` 与 Go 分组 `type ( … )` 块读不到。
- 嵌套的 `.gitignore` 不读；名为 `venv`/缓存的目录在任意深度被跳过且不报告。
- 完整清单与复现见 [CHANGELOG.md](CHANGELOG.md) 0.3.2 节。与裸模型对比（3 个用例）：本 skill 从未更不准确、从未改动遗留文档，但裸模型在三个用例里都更完整。

**什么时候用** —— 「reorganize/重写 logic」·「从代码重新推导一套契约」·「重写架构/结构/接口文档」；也可用 `/reorganize-logic` 显式调用。
**不适用** —— 增量同步 / 会话收尾（→ neat，最锐的边界：本 skill 会*删*遗留，不是保留并同步）；设计 agent loop（→ loop-constructor）；改实现代码（重建的是契约/文档层，不是逻辑）；没有既有契约的全新项目（无可清理）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/reorganize-logic ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
