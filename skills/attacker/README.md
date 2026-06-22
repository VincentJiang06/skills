# attacker

> 在一个全新的、与 TDD 解耦的 subagent 中攻击产品的*真实可观测行为*——或对一个想法/论点/方案做红队（辩论反方）——在一个声明的攻击范围内，只记录被证明、可复现的破坏。

[English](README.en.md) · **简体中文**

**做什么** —— 针对一个功能/产品的*可观测行为*（而非源码），或一个*想法/论点/设计/方案*，发起对抗式攻击，把成功的攻击（已证明、可复现、`observed != expected`）写成机器可校验的「攻击记录」，交给下一轮去修。输出是一份**交接文档集**，**绝不修改目标本身**。

**v0.3.0 —— 三个相互呼应的特性：**
- **攻击范围契约** —— 声明*攻击哪个领域/层*。`--scope` → `summary.in_scope`（≥1 条丰富的自由描述符，如「UI 渲染错误」「页面导航/逻辑跳转」）；`--out-of-scope` → `summary.out_of_scope`。每条已确认记录都标注它的 `attack_scope`（须 ∈ `in_scope`）；范围之外的发现进入顶层 `out_of_scope[]`（**保留**，但**不计入发现数**）。于是「攻击 UI」命中 UI 渲染 + 页面导航，而**不**碰后端逻辑。
- **product | idea 两种模式**（`target.type`）—— 循环 / 轮裁决 / 预算 / 结转**完全一致**，只有 oracle 与证明形态不同：

  | | **product** | **idea**（辩论反方） |
  |---|---|---|
  | 目标 | 运行中的功能/函数/接口 | 论点/设计/方案/命题（`target.statement`） |
  | Oracle | implicit / differential / metamorphic / control_vs_experiment / specified | counterexample / contradiction / unmet_assumption / scope_violation / infeasibility / missing_case |
  | 证明 | repro + minimized_input + replayed_ok；相对基线 `observed != expected` | `claim` + 推理链 + 最小情景 + replayed_ok；`observed`（反例结果）!= `expected`（论点的预测） |
  | 独立性防火墙 | 屏蔽实现源码 / TDD 套件 / 作者表述；真实接缝（无 mock） | 拿到论点 + 其论证，但**独立**推导批判（`derived_independently`）+ 攻击 steelman 后的论点（`not_strawman`） |
  | `broke` / `clean` / `inconclusive` | 已证明破坏 / 预算内未破（≠ 已证明正确）/ 预算耗尽未发现 | 已证明缺陷 / 预算内未破（≠ 已证明为真）/ 预算耗尽未发现 |

- **丰富上下文摄入（鼓励多给）** —— Preflight 先收一份上下文包（目标+类型、主张/需求、约束、成功标准、何谓真正的破坏、范围内/外、历史轮次），并在上下文薄弱时**主动追问缺失的细节：上下文越精确，攻击越锋利、范围越准——问，而不是猜。** 见 `references/context-intake.md`。可选的单行 `summary.context_digest` 记录本轮攻击所依据的上下文。

**为什么** —— 它要打击的缺陷是**假阳性测试套件**：一套绿色的 TDD 测试坐在一个坏掉的产品之上。根因是**相关性错误**——测试、mock、「期望值」夹具，乃至作者对「应该怎样」的表述，都出自与实现*同一个心智模型*，于是继承了同一处误解（Knight–Leveson：规格本身是最主要的共模通道）。唯一的解法是**工程化的独立性**：攻击者运行在一个从未见过实现、测试、作者表述的上下文里。**独立性就是全部价值所在。**

**好在哪** ——
- **新鲜上下文的独立性（可审计）**：每轮攻击作为一个全新 subagent 运行，只拿到「需求 + 目标的可观测行为」，不拿实现源码 / TDD 套件 / 作者表述；每条记录带 `independence_attestation`，校验器会**拒绝** `withheld` 缺少 `implementation_source` 或 `tdd_suite` 的已确认记录。
- **PROVE-OR-FLAG（证明，否则标记）**：只有可从最小用例复现、且经命名 oracle 证明 `observed != expected` 时才记为发现；否则进入显式的 `needs_judgment[]`，绝不编造默认值，也绝不静默丢弃。
- **确定性校验器 + 非空自检**：`scripts/validate_attack_records.mjs` 强制结构与可复现性形状；`evals/run_all.mjs` 跑一个**植入 bug**（必须被抓到）和一个**干净对照**（必须零误报）的反作弊门。
- **可枚举的攻击面**：`assets/payload-library.json` 把边界值（AFL interesting values）、Unicode/中文、业务逻辑滥用目录等列为数据，覆盖可见、缺口可见。

**什么时候用** —— 「attack this feature / try to break it」·「red-team this product」·「red-team this idea/argument/plan（辩论反方）」·「find what the tests miss」·「$attacker」；或作为 loop-constructor 设计的循环里的「攻击轮」节点。

**不适用（须路由走）** ——
1. 写/维护项目自己的单元测试、「先写一个失败测试」→ **vince-tdd**（attacker *不信任*那套测试，它攻击运行中的产品）；
2. 修复它找到的 bug → 单独的修复轮/技能（attacker 只记录，从不改目标）；
3. 设计整个循环 → **loop-constructor**（attacker 只是一个节点）；
4. 无「破坏它」语境地调试小程序实时运行时 / 看 pageData → **mp-cli-sup**。

最尖锐的边界是对 **vince-tdd**：同一个词（test/break），相反的姿态——TDD *生长*构建者的规格套件；attacker 从一个去相关的上下文*攻击*运行中的产品。

**它所在的循环（attacker 是循环的「停机条件」）** —— 循环跑 `A→B→C→attack`，每轮攻击发出机器可读的 `round_verdict`，循环据此分支：
```
A→B→C→attack ─┬─ round_verdict:clean        → 停机（已收敛 / done）—— clean ≠ 已证明正确，只是「预算 B 内未证伪」
              ├─ round_verdict:broke        → 修复轮 → 重新攻击
              └─ round_verdict:inconclusive → 由循环负责人裁决（预算耗尽但未发现，受限停机）

第 N 轮    attacker  → 读/设计/执行/证明/记录 → attack-records.jsonl（已证明的破坏）
第 N+1 轮  fixer     → 修复这些破坏（单独的技能/agent）
第 N+2 轮  attacker  → 按 regression_key 回归 + 攻击新表面
```
- **硬性双预算（绝不无尽攻击）**：`--budget N`（尝试次数）+ `--max-tokens T`（token 消耗，**非**墙钟时间），**先到先停**；穷尽预算模式——一轮报告**全部**已证明破坏供批量修复，而非首破即停。
- **结转攻击台账（省 token）**：第 >1 轮**继承自己上一轮的攻击台账**（攻击面图 + 攻击树 + 已尝试攻击 + 按 `regression_key` 的已确认/已修复记录），只对**新表面**重新推导，绝不从零重排整套攻击计划（那是 token 浪费）；以 `carried_from_round` 记录所继承的轮次。**永不继承**实现源码 / TDD 套件 / 作者表述（独立性照旧保持）。

**安装** —— `cp -R skills/attacker ~/.claude/skills/`（部署后按 SKILL.md 的 `name` 生效）。攻击记录与对抗战役台账存放在**目标项目**的 `.loop/` 下（项目本地）。

完整说明见 [SKILL.md](SKILL.md)。
