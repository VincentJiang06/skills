# skill-developer

> 给 Claude Code 用的工业级 Agent Skills —— 以及打造它们的流水线。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.md) · **中文**

一组开箱即用的 [Agent Skills](https://github.com/anthropics/skills)（用于
[Claude Code](https://github.com/anthropics/claude-code)），外加打磨出它们的 **`vince-skill-*` 流水线**。
中英双语；其中数个为中文优先（乐评、HiFi 评测、学术润色）。

## 优势

- **打磨而非随写** —— 每个 skill 都经流水线打磨：eval 用例 + 验证门。
- **结论可追溯** —— 评测与核查类 skill 的每个结论都落到来源。
- **真中文深度** —— 真正的中文功底，而非机翻。
- **自我构建** —— 仓库自带「造 skill 的 skill」流水线。

## 固定限制

- **面向 Claude Code** —— 依赖 Skill 机制，并非通用、不能直接搬到别的 agent。
- **带主观取向** —— 编码了个人的标准与工作流，按需自行调整。
- **部分需配置** —— 检索类要联网；`vince-mp-cli-sup` 需 Node CLI + 微信开发者工具。
- **范围明确** —— 每个 skill 只做一件事，越界场景见各自 README 的「不适用」。

## 快速开始

```bash
cp -R skills/vince-fact-check ~/.claude/skills/    # 单个 skill（全部则用 skills/*）
```

之后直接用自然语言提问，Claude Code 会按描述自动触发；也可用 `/<skill-name>` 显式调用：

```
> 查一下：埃菲尔铁塔夏天会变高吗？               # → vince-fact-check
```

## Skills 一览

| Skill | 做什么 | 示例提问 |
|---|---|---|
| [vince-album-review](skills/vince-album-review/) | 深度、来源可追溯的长篇中文乐评（10k–15k 字）。 | “给 周杰伦 的《范特西》写一篇深度乐评” |
| [vince-hifi-review](skills/vince-hifi-review/) | 基于测量 + 评测共识的客观 HiFi 器材评价。 | “这个 DAC 推得动吗” |
| [course-study](skills/course-study/) | 课程材料 → 全覆盖、费曼式、可应试的复习笔记。 | “帮我把这些讲义整理成期末复习笔记” |
| [vince-fact-check](skills/vince-fact-check/) | 快速、有出处、限时的事实核查。 | “帮我核查一下：……是真的吗？” |
| [humanizer-academic](skills/humanizer-academic/) | 学术文本去 AI 味（中/英/混合），保留学术腔。 | “把这章论文改得像人写的、但仍学术” |
| [vince-low-visibility-fix](skills/vince-low-visibility-fix/) | 审计移动 UI 在眩光/手套/低光下的可读可点性，产出修复方案。 | “审计这个界面在眩光下是否可点，给修改建议” |
| [vince-mp-cli-sup](skills/vince-mp-cli-sup/) | 通过 `vince-mp` CLI 调试微信小程序实时运行时。 | “连上小程序，看一下 pageData” |

**流水线 —— 造 skill 的 skill：**[conductor](skills/vince-skill-conductor/) 串起整条循环；
[guidance](skills/vince-skill-guidance/) 评估 → [engineer](skills/vince-skill-engineer/) 构建 →
[zipper](skills/vince-skill-zipper/) 压缩。方法论见 [`develop-principle/`](develop-principle/)。

## 目录结构

```
skills/             # 开箱即用的 skill（各一个文件夹，含各自 README）
develop-principle/  # 驱动流水线的 agent-first 知识库
tools/vince-mp-cli/ # vince-mp-cli-sup 驱动的 Node CLI
experiments/        # 研究 / A-B 对照材料，非成品 skill
docs/               # 内部设计文档与 skill 分析
```

## 许可证

[MIT](LICENSE) © 2026 Vince Jiang。可自由使用、修改、再分发。
