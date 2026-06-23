# attacker

> 在一个全新、与 TDD 解耦的 subagent 里攻击产品的*真实可观测行为* —— 或对一个想法/论点/方案做红队（辩论反方）—— 在声明的攻击范围内，只记录已证明、可复现的破坏。

[English](README.en.md) · **简体中文**

**做什么** —— 针对一个功能/产品的*可观测行为*（而非源码），或一个*想法/论点/方案*，发起对抗式攻击，把成功的攻击（已证明、可复现、`observed != expected`）写成机器可校验的「攻击记录」交给下一轮去修。输出是一份**交接文档集**，**绝不修改目标本身**。与 [loop-constructor](../loop-constructor/) 配对成 攻击→修复→再攻击 的循环。

**好在哪** ——
- **新鲜上下文的独立性（可审计）** —— 每轮作为全新 subagent 运行，只拿到「需求 + 目标的可观测行为」，不碰实现源码 / TDD 套件 / 作者表述；每条记录带 `independence_attestation`，校验器**拒绝**缺少屏蔽证明的已确认记录。要打的正是「假阳性测试套件」——绿色 TDD 坐在坏产品上的共模盲点。
- **PROVE-OR-FLAG（证明，否则标记）** —— 只在能从最小用例复现、且经命名 oracle 证明 `observed != expected` 时才记为发现；否则落成显式 `needs_judgment`，绝不编造默认值、绝不静默丢弃。
- **确定性校验器 + 非空自检** —— `scripts/validate_attack_records.mjs` 强制结构与可复现形状；`evals/run_all.mjs` 跑一个**植入 bug**（必须抓到）+ 一个**干净对照**（必须零误报）的反作弊门。
- **product | idea 两种模式 + 攻击范围契约** —— 循环 / 裁决 / 预算 / 结转完全一致，只有 oracle 与证明形态不同；`--scope` / `--out-of-scope` 声明攻击哪个领域，范围外的发现保留但不计入发现数。

**什么时候用** —— 「attack this feature / try to break it」·「red-team this product」·「red-team this idea/argument/plan（辩论反方）」·「find what the tests miss」；也可用 `/attacker` 显式调用，或作为 loop-constructor 设计的循环里的「攻击轮」节点。
**不适用** —— 写/维护项目自己的单元测试、「先写一个失败测试」→ **vince-tdd**（attacker *不信任*那套测试，它攻击运行中的产品）；修复它找到的 bug → 单独的修复轮（attacker 只记录、从不改目标）；设计整个循环 → **loop-constructor**（attacker 只是一个节点）；无「破坏它」语境地调试小程序实时运行时 → **mp-cli-sup**。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/attacker ~/.claude/skills/`）。攻击记录与对抗战役台账存放在**目标项目**的 `.loop/` 下（项目本地）。

完整说明见 [SKILL.md](SKILL.md)。
