# reorganize-logic

> 当项目文档烂到「增量同步不值得」时，以代码为唯一事实源，从零重建一套设计契约 —— 而且绝不「绿但错」。

[English](README.en.md) · **简体中文**

**做什么** —— 把旧契约压成只读 context（绝不复制），从代码重新推导出架构图 + 结构图 + 明确的接口定义；过时遗留只在人工评审门（manifest）后删除，绝不自动删。可整项目，也可只锁定某个模块/目录。

**好在哪** ——
- 确定性、语言无关的门（`verify_contracts.mjs`）把每个文档化接口绑到真实的 file:line，并证明没有「被识别的导出」被悄悄漏掉。
- 对模糊的近名匹配只**标记**交 agent 复核，而非盖章放行 —— 杜绝「绿但错」。
- 删除走 fail-closed：未知一律拦下，绝不静默跳过。
- 与 neat 区分：neat 是*增量同步*文档，本 skill 是*推倒重建*。

**什么时候用** —— 「reorganize/重写 logic」·「从代码重新推导一套契约」·「重写架构/结构/接口文档」；也可用 `/reorganize-logic` 显式调用。
**不适用** —— 增量同步 / 会话收尾（→ neat，最锐的边界：本 skill 会*删*遗留，不是保留并同步）；设计 agent loop（→ loop-constructor）；改实现代码（重建的是契约/文档层，不是逻辑）；没有既有契约的全新项目（无可清理）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/reorganize-logic ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
