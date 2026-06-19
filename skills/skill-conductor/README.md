# skill-conductor

> 把一个想法或一个现有 skill，端到端推到「工业级」—— 而且过不了线就诚实停下，绝不假装通过。

[English](README.en.md) · **简体中文**

**做什么** —— 驱动一个 Claude Code skill 走完整条 skill 流水线：guidance → engineer → zipper，端到端，带质量门循环。一个薄编排器，串起 skill-guidance、skill-engineer、skill-zipper 三个阶段 skill，最后回到 skill-guidance 做复审。

**好在哪** ——
- **防注水的最终验收** —— 取分用 `min(复审, 独立测试组)`，绝不自评打高分；分数永远不超过那组独立行为测试。
- 过不了线就**回退到出问题的那一阶段**重做（设计错回 G、实现错回 E、压缩有损回 Z），失败的产物绝不往下游传。
- 触到循环上限还过不了，就**诚实停下**（stopped_unmet），绝不为了「通过」而放松质量门。
- 全程自动运行，并落一份可机读的运行轨迹 `<target>/.skill-conductor/conductor-log.json`。

**什么时候用** —— 「把这个 skill 从头建好/测好/压好」·「跑一遍 guidance → engineer → zipper」·「把这个想法或现有 skill 推过所有阶段」；也可用 `/skill-conductor` 显式调用。
**不适用** —— 只跑某一个阶段（直接调那个阶段 skill）；只做规划（→ skill-guidance）；只做压缩（→ skill-zipper）；没有流水线的空白脚手架（→ skill-creator）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/skill-conductor ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
