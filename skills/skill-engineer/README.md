# skill-engineer

从 handoff spec 构建并测试一个 skill：把文件写出来、让 eval 用例通过（流水线 stage 2）。
Builds and tests a skill from a handoff spec — writes the files and makes its eval cases pass (pipeline stage 2).

- **触发 Triggers** — “按这个 handoff spec 把 skill 实现出来” · “make the eval cases pass” · `/skill-engineer`
- **用法 Use** — 指向 guidance 产出的 `.skill-guidance/handoff-spec.json`。Point at the handoff spec from guidance.
- **不适用 Not for** — 规划 / 审计（→ guidance）、压缩（→ zipper）、无 spec 的空白脚手架。Planning/auditing, compression, or scaffolding with no spec.

完整说明 / Full spec: [SKILL.md](SKILL.md)
