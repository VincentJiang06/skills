# logic-pacer

把已经写好、你也喜欢的中文（或英文）说理文，改写得**逻辑推进慢一点、每一步都跟得上**——
缩小推理的**步长**，让每一步都落在读者刚刚站稳的地方（given-new），但**不动文风、不降词汇
（绝不对齐词汇）、不改事实/论点/立场，且保持干练**（净长度 <= ~1.3 倍）。

一句话方法：**找出 >=2 步的跳跃 → 展开成最小中间链 → 减掉赘饰**。
口号：清楚 = 不仅跳得快，也要跳得稳。

## 触发（何时用）
- 「这段逻辑太快/跳太快，放慢一点，但文风和词汇都别动」
- 「把这个 reactor-study 节点的说理改得每一步都跟得上，专业干练不要注水」
- 「reduce the inferential step size in this paragraph without dumbing down the vocabulary」
- `$logic-pacer`

## 反触发（不要用 → 请去别处）
- 文字**读起来像 AI**、要去 AI 味 → `humanizer-academic`（相反的默认：它在已经像人写时 abstain）
- 想要**更简单的词 / 对齐词汇 / 大白话 / 摘要 / 翻译** → 本 skill 明确拒绝做
- **重排论点顺序 / 改论证结构** → 本 skill 保持原有顺序，只展开点与点之间的跳跃
- **从资料生成新内容** → `course-study` 等生成式写作
- 泛泛的「润色/改写」而没有具体的「步长太大」抱怨 → 不触发

## 怎么工作（骨架）
TRIAGE（常常 abstain）→ 展开跳跃（A–F 六步）→ 减赘保持精简 → 全程守住硬约束 →
用脚本 + 一个**独立盲审子代理**验证，把所有 flag 大声报出来。细节在 `references/`，按需加载。

- `references/mechanisms.md` — 六个机制的「为什么」，只在某处跳跃展不开时读
- `references/anti-patterns.md` — 禁止动作清单（对齐词汇、如你所知式注水、装饰性首先/其次）
- `references/worked-example-quetelet.md` — 经典 Quetelet 段落完整 before/after（~1.27x）
- `references/step-followability-probe.md` — 盲审「冷读者」评审表，由**全新子代理**运行，改写者绝不加载
- `scripts/pace_checks.py` — 确定性客观闸门（长度比、词汇差、实体保真代理）；**执行、不读入上下文**

## 边界（关键，坦诚）
- 客观脚本是**测量、不是裁决**：它给 flag，真正的成功信号是盲审探针。
- **保真（立场/论点不被悄悄改动）是模型级不变量**：脚本看不见「构成性→描述性」这类
  实体数不变的立场反转（Foucault 那种）——本 skill 特意**不**把它降级成可脚本化的检查。
- **逐段/逐节使用，作者每次人读**；不做整本 200k 字的无人批量。

装机在 reactor.vincejiang.com / UniWild 集群的说理节点上最常用。失败成本 = MEDIUM（可恢复，但
若成习惯会在 70 个节点上侵蚀你珍视的文风）。
