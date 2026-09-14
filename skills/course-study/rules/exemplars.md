何时读：首次处理某门课程（索引不存在）、写长文前对形状/密度不确定、或需要判例（附录多完整、补充放哪、间接证据算不算 A 级）时选读对应段；不照抄句子。常规跟课不读；总结/追问从不读。

# 正例库

三段：黄金样张（原样收入）；ESTR3108 L03 一节（推导课形状）；索引示例。判例在 rules/precedents.md。样张与规则冲突以规则为准；产物只校准形状与密度，不复制句子。

---

## 一、黄金样张：`docs/prototype-L09-一节.md`（原样收入）

# 样张 R3：L09 Pipeline（Lecture09-Pipeline.pdf，p.1–10）

> 手写样张，不是 skill 产物。R3 版按「每 1–3 页一节」重写，并套用 §3.5 排版约定（引用 / 表 / 图 / 字体标记 / 文字标签）。
> 承接：L08 单周期数据通路（#L08-03）、L08 数据通路图上的三个加法器（#L08-05）。本讲 p.7 首次出现 CPU time 公式，L11 才正式讲。
> 教材：Chapter 4.6–4.7
> 考试证据：读了 CENG3420_2025S_midterm.pdf、2025-Spring-Final.pdf、Standard Format of Course Outlines-CENG3420.pdf；未识别用途的 PDF：无

p.1 标题页、p.2「Motivation」分节页、p.8「Pipeline Basis」分节页：无内容，略。

## 一、为什么要流水线（p.3–7）

### 单周期的四个缺点（p.3）【延伸 L08 p.3】

> **p.3** Single cycle: the whole datapath is finished in one clock cycle.

这是老师对**单周期**（single cycle）的定义，也是整讲的靶子：一条指令从取指到写回，全部在一个时钟周期里完成。L08 讲的数据通路就是按这个假设设计的（#L08-03）。接着老师列了四条，我按因果重新排一下，因为四条其实是两个根源。

> **p.3** Uses the clock cycle inefficiently – must be timed to accommodate the slowest instruction.

第一个根源：**时钟周期长度只有一个**。所有指令共用同一个周期，周期就必须长到能装下最慢的那条指令。于是快指令在一个长周期里做完自己的事之后空等。老师说的 "wasteful" 就是这个空等。

> **p.3** Problematic for more complex instructions like floating point multiply.

同一个根源的极端情况：浮点乘法这类要走很多步的操作，如果也必须一个周期做完，周期会被它一个拉到离谱，所有别的指令陪着慢。这句是在说"单周期不可扩展"，不是在说浮点乘法本身有多难。

> **p.3** May be wasteful of area since some functional units (e.g., adders) must be duplicated since they can not be shared during a clock cycle.

第二个根源：**一个周期内一个部件只能用一次**。同一周期里要算 `PC+4`、要算分支目标地址、还要做主 ALU 运算，三件事同时发生，就得放三个加法器。你在 L08 的数据通路图上已经看到这三个加法器了（#L08-05），当时可能觉得理所当然，这页告诉你那是单周期付出的面积代价。

**补充**：老师这里没有提多周期（multicycle）设计。它是单周期和流水线之间的一种方案：一条指令分几个短周期做，每周期只做一个阶段，部件可以复用。这门课直接从单周期跳到流水线，多周期只当背景知道有这个选项即可；本课能读的两份试卷里没有出现多周期的题（C 级 通识）。

**考试角度**：（A 级：Final 2025 Q1.4）这题问"不用流水线时 load 是最长指令，R-type 比 load 少哪个阶段"。答案是 MEM。这题考的正是"最慢指令决定周期"这条，只是把它反过来问。

### 最慢的指令是 load（p.4）

> **p.4** Clock cycle must have the same length for every instruction.

> **p.4** What is the longest path (slowest instruction)? Load instruction!

p.4 把 p.3 的第一个根源说成一句可以考的话：**所有指令的时钟周期一样长，长度由最慢的指令决定**。然后直接点名最慢的是 load。

为什么是 load：它是唯一一条五个阶段全走的指令。取指、译码读寄存器、算地址、访存、写回，一个不少。store 不写回，R-type 不访存，branch 既不访存也不写回。p.6 会用数字把这句话量化。

> **p.4** It is too long for the store so the last part of the cycle here is wasted.

老师顺手用 store 举例说明浪费：store 走四个阶段，在一个按 load 定长的周期里，最后那段（本该做写回的时间）是空的。

**考试角度**：（A 级：Final 2025 Q4.1）"非流水线处理器的时钟周期是多少"，解法就是这页：找出走阶段最多的指令，把它的阶段延迟加起来。

### 把数据通路切成五段（p.5）【新】

图（p.5）：Partition Datapath into Stages
元素：五个阶段框，从左到右 Stage 1 IF（instruction fetch）、Stage 2 ID（instruction decode / register file read）、Stage 3 EX（execute / address calculation）、Stage 4 MEM（access memory）、Stage 5 WB（write back to register file）。
看什么：五个阶段就是 L08 数据通路从左到右的五个区域，老师只是画了四条竖线把它切开；每一段的名字要背，后面所有时序图、冒险讨论都用这五个缩写。

这页是本讲的骨架。五个阶段对应 L08 数据通路上的五块硬件：指令存储器与 PC（IF）、寄存器堆读端口与控制单元（ID）、ALU（EX）、数据存储器（MEM）、寄存器堆写端口（WB）。**切分的原则**是每段用不同的硬件，这样五条指令可以各占一段同时进行——这是 p.9 要说的事，但你在这页就该看出来：切分只有在"各段硬件不共用"时才有意义。

**补充**：为什么恰好是五段而不是三段或八段。段数越多每段越短、时钟越快，但级间寄存器（p.12 会加）的开销和冒险（p.16 起）的机会也越多。五段是教材的教学模型，p.15 会提到现代处理器超过十段。

**考试角度**：（C 级 通识）写出五个阶段的名称、顺序和各自的硬件是这类课程最基础的填空题型；本课两份试卷没有单独考这一条，但 Final Q4 的表格直接以这五个缩写为列名，不认识缩写就做不了题。

### 关键路径表（p.6）【新】

> **p.6** Calculate cycle time assuming negligible delays (for muxes, control unit, sign extend, PC access, shift left 2, wires) except:

老师先声明简化：多路选择器、控制单元、符号扩展、PC 访问、移位、连线都按零延迟，只算五个阶段。这句要看清，因为考试题会用同样的简化，你不需要（也不应该）去猜连线延迟。

表（p.6）：五个阶段的延迟

| 阶段 | IF | ID | EX | MEM | WB |
|---|---|---|---|---|---|
| 延迟 | 4 ns | 1 ns | 2 ns | 4 ns | 1 ns |

表（p.6）：四类指令各走哪些阶段与总路径

| 指令 | IF | ID | EXE | MEM | WB | Total |
|---|---|---|---|---|---|---|
| R-type | 4 | 1 | 2 | | 1 | 8 |
| `lw` | 4 | 1 | 2 | 4 | 1 | 12 |
| `sw` | 4 | 1 | 2 | 4 | | 11 |
| `beq` | 4 | 1 | 2 | | | 7 |

读表的方法：一行一条指令，空格表示这条指令不走该阶段，Total 是走过的阶段延迟之和。**单周期的时钟周期 = 最大的 Total = 12 ns**（`lw`）。这张表你要会自己重算，不是背结果；逐行计算在附录 A1。

为什么这张表重要：它同时是流水线的对照组。同一张表，流水线下时钟周期不再取"最慢指令的总和"，而取"最慢单个阶段"= 4 ns（IF 或 MEM）。12 对 4，这两个数就是流水线的全部动机；p.7 的加速比、p.9 的延迟结论，都从这张表来。

**算一遍**：单周期 12 ns / 流水线 4 ns = 3，不是 5。原因是五个阶段不等长：IF 和 MEM 各 4 ns 拖住了周期，ID 和 WB 各 1 ns 的阶段有四分之三的时间在等。完整计算与"阶段平衡"的讨论见附录 A1。

**考试角度**：（A 级：Final 2025 Q4.1–Q4.2，20 分大题）阶段延迟换成 250/250/150/350/200 ps，同样四类指令、同样的勾选表，问流水线与非流水线的时钟周期，以及 `lw` 在两种处理器下的总延迟。解法与附录 A1 完全同型：非流水线周期 = 最长指令的阶段之和；流水线周期 = 最长单阶段；流水线下 `lw` 延迟 = 5 × 流水线周期。

### 怎么变快（p.7）【新】

> **p.7** CPU time = CPI × CC × IC

老师在这页第一次写出性能公式（L11 Performance 才正式讲，这里先用）。三个因子：CPI 每条指令平均周期数，CC 时钟周期长度，IC 指令条数。**流水线动的是 CC**：把周期从"最慢指令"缩到"最慢阶段"。理想情况下 CPI 仍是 1（每周期完成一条），IC 不变。

> **p.7** Start fetching and executing the next instruction before the current one has completed.

这句是流水线的操作定义：**上一条还没做完，下一条已经开始**。注意它没说"同时做完"，说的是"重叠"。

> **p.7** Under ideal conditions and with many instructions, the speedup from pipelining is approximately equal to the number of pipe stages.

这句有两个前提，老师用 "ideal conditions" 和 "many instructions" 各盖了一个：其一，五段延迟相等，否则周期被最长段拖住（p.6 的数字算出来是 3 倍不是 5 倍）；其二，指令足够多，否则流水线"灌满"的头几个周期占比太大（附录 A2 会算一百万条的情况）。老师紧接着那句 "nearly five times faster because the CC is nearly five times faster" 里的两个 *nearly* 就是在提醒这两个前提。

> **p.7** Fetch (and execute) more than one instruction at a time. Superscalar processing – stay tuned.

*stay tuned* 是 L15 ILP 的预告，超标量在本讲只点到名字；本课能读的两份试卷里没有出现超标量的题（C 级 通识）。

**补充**：这里的加速比是按吞吐量（单位时间完成的指令数）算的，不是按单条指令的延迟。p.9 会专门区分这两个词，Midterm 就考过这个区分。

**考试角度**：（A 级：Midterm 2025 Q1.8）"流水线的主要优势"，正确项是提高吞吐量（throughput），干扰项是"降低单条指令延迟"和"消除控制冒险"。（C 级 通识）给阶段延迟表求"理想加速比与实际加速比"是这类课的常见计算题，本课两份试卷没有直接出现。

## 二、流水线基础（p.9–10）

### 吞吐量提高，延迟不减（p.9）【新】

> **p.9** Improves throughput - total amount of work done in a given time.

> **p.9** instruction latency (execution time, delay time, response time - time from the start of an instruction to its completion) is not reduced

这是本讲最容易考、也最容易答反的一页。两个术语要分清：**吞吐量**（throughput）是单位时间完成的指令数；**延迟**（latency）是一条指令从开始到完成的时间。老师在括号里给了延迟的三个别名 execution time、delay time、response time，考题里出现任何一个都是指延迟。

流水线提高吞吐量，**不缩短延迟，反而略微加长**。原因：一条指令在流水线里仍要走完五段，每段占一整个周期，哪怕它本来只需 1 ns（WB）。用 p.6 的数字，`lw` 在流水线里的延迟是 5 × 4 = 20 ns，比单周期的 12 ns 还长。快的不是每条指令，是"每 4 ns 就有一条完成"。

> **p.9** Clock cycle (pipeline stage time) is limited by the slowest stage.

> **p.9** For some instructions, some stages are wasted cycles

这两句是 p.6 那张表在流水线下的两个后果：周期由最慢段决定（4 ns），以及 `beq` 这种只用三段的指令在 MEM、WB 两个周期里什么都不做——它仍然占着流水线的槽位，因为所有指令步调一致地往前走。

**考试角度**：（A 级：Midterm 2025 Q1.8）见上。（A 级：Final 2025 Q4.2）问 `lw` 在流水线与非流水线下的总延迟，就是这页的结论拿数字算一遍：流水线下延迟 = 5 × 周期，比非流水线长。

### 单周期 vs 流水线的两个数（p.10）

> **p.10** To complete an entire instruction in the pipelined case takes 1000 ps (as compared to 800 ps for the single cycle case). Why ?

> **p.10** How long does each take to complete 1,000,000 adds ?

图（p.10）：Single Cycle vs. Pipelined Design
元素：上方单周期时序，一条指令占 800 ps；下方流水线时序，五段各 200 ps，一条指令跨 1000 ps，相邻指令错开 200 ps。
看什么：流水线里单条指令反而更长（1000 > 800），但相邻指令的间隔只有 200 ps。

老师抛了两个问题没有在页上作答，这里算完。第一问：为什么流水线里一条指令是 1000 ps 而不是 800 ps。因为周期被最慢段统一成 200 ps，五段各占一个周期，5 × 200 = 1000；单周期则是五段延迟直接相加得 800。差的 200 ps 就是短阶段在等长阶段。

**算一遍**：一百万条 `add`，单周期约 800 μs，流水线约 200 μs，加速比接近 4（不到 5 的原因仍是阶段不平衡）。完整过程见附录 A2。

**考试角度**：（A 级：Final 2025 Q4.2）同型。（C 级 通识）"N 条指令在 k 段流水线上共需多少周期"的公式 k + N − 1 是这类课的常见考法，本课试卷没直接考公式本身，但 Final Q4.3 数周期时要用到。

## 本讲核心考点（p.3–10 部分）

- 单周期时钟周期 = 最长指令的阶段延迟之和（p.4、p.6）——A 级，Final Q4.1
- 流水线时钟周期 = 最长单阶段；单条指令延迟 = 段数 × 周期（p.9–10）——A 级，Final Q4.2
- 吞吐量提高、延迟不减（p.9）——A 级，Midterm Q1.8
- R-type 比 load 少 MEM 段（p.4、p.6）——A 级，Final Q1.4
- 加速比 ≈ 段数的两个前提：段平衡、指令多（p.7）——C 级 通识

---

## 附录

### A1 关键路径表逐行计算与加速比（p.6）

阶段延迟：IF 4、ID 1、EX 2、MEM 4、WB 1（ns）。

| 指令 | 走过的阶段 | 计算 | 路径长度 |
|---|---|---|---|
| R-type | IF, ID, EX, WB | 4 + 1 + 2 + 1 | 8 ns |
| `lw` | IF, ID, EX, MEM, WB | 4 + 1 + 2 + 4 + 1 | 12 ns |
| `sw` | IF, ID, EX, MEM | 4 + 1 + 2 + 4 | 11 ns |
| `beq` | IF, ID, EX | 4 + 1 + 2 | 7 ns |

单周期时钟周期 = max(8, 12, 11, 7) = **12 ns**。
流水线时钟周期 = max(4, 1, 2, 4, 1) = **4 ns**。
流水线下任一指令的延迟 = 5 × 4 = 20 ns；`beq` 也是 20 ns，因为它虽然只用三段，仍要占满五个周期的槽位。
按周期比的加速比 = 12 / 4 = 3。

阶段平衡时的对照：若五段各 12 / 5 = 2.4 ns，流水线周期 2.4 ns，加速比 12 / 2.4 = 5。差距全部来自 IF、MEM 的 4 ns 与 ID、WB 的 1 ns 之间的不平衡。这就是 p.7 "approximately equal to the number of pipe stages" 里 *approximately* 的含义。

### A2 一百万条 add（p.10）

p.10 只给了两个总数：单周期 800 ps，流水线 1000 ps。要算一百万条，先求流水线周期：1000 ps 是五段各占一个周期，所以周期 = 1000 / 5 = 200 ps。

**补充**（通识）：教材同一例子的段延迟是 IF 200、ID 100、EX 200、MEM 200、WB 100 ps，相加恰为 800，最长段 200，与图上两个数吻合。讲义没印这组数字，此处只用于核对，不入记忆库。

单周期：1,000,000 × 800 ps = 800,000,000 ps = **800 μs**。
流水线：第一条指令 5 个周期完成，之后每周期完成一条，共 (1,000,000 + 4) × 200 ps = 200,000,800 ps ≈ **200 μs**。
加速比 ≈ 800 / 200 ≈ 4。不到 5 的原因同 A1：100 ps 的段在等 200 ps 的段。

通式：N 条指令在 k 段流水线上需 k + N − 1 个周期；N 很大时 ≈ N 个周期，这就是 p.7 "with many instructions" 这个前提的来源。

---

## 二、ESTR3108 L03 一节（推导课形状；动画分页 + 公式重排）

`study/伴读/L03-P2-Logistic-Regression.md` 的文件头与两节：

```markdown
# L03 Logistic Regression — Part 2（CSCI3230_Lecture3_Logstic regression.pdf，p.35–52）

> 承接：L02 线性回归模型（#L02-01）、本讲 P1 的 cut-off 规则（p.32）
> 考试证据：读了 ESTR3108_course outline_2526T1.pdf、FinalExam_question_example.pdf、2023.pdf（扫描件，视觉读取）、2024.pdf（扫描件，视觉读取）；未识别用途的 PDF：ESTR 3108_Reading.pdf（文件名推不出用途）
```

### 概率与 odds（p.35–40，动画分页）【新】

> **p.37** The cut-off rule is a transformation which maps linear functions’ range (−∞, +∞) to the range of probability (0, 1).

p.35–37 三张是同一页逐步展开，p.38–40 三张是下一页逐步展开，以 p.37、p.40 两张完整版为准。老师先把 P1 结尾的 cut-off 规则定性为一个**变换**（transformation）：把线性函数的值域 $(-\infty,+\infty)$ 压到概率的值域 $(0,1)$；p.33 已说明它对离群点敏感，所以问题是「有没有更好的变换」。答案分三个台阶：odds（本节）→ logit（下一节）→ logit 的反函数。

> **p.37** The odds of event A is defined as $\mathrm{odds}(p)=\frac{p}{1-p}$

公式按讲义重排（pdftotext 把分式拆成三行）。**odds**（几率）是事件发生概率与不发生概率之比。学生常卡在「为什么从概率换成 odds」：概率值域 $(0,1)$ 两头封死；odds 值域 $(0,+\infty)$ 右边打开——第一步「打开值域」，下一节的对数再打开左边。

**算一遍**：按讲义数字 $p=0.5,0.75,0.25 \Rightarrow \mathrm{odds}=1,3,1/3$。规律：$p>0.5$ 时 odds $>1$，$p=0.5$ 恰是 1——下一节取对数后 $p=0.5$ 对应 0 的来源。

**考试角度**：（B 级：大纲）期末 35%，含推导题。（C 级 通识）给概率求 odds、反求概率是这类课的常见热身题；本课能读的样题没有单独考它。

### logit 变换（p.41–43，动画分页）【新】

> **p.42** We define logit (a.k.a. log-odds) of an event A as $\mathrm{logit}(p)=\ln \mathrm{odds}(p)=\ln\left(\frac{p}{1-p}\right)$ whose range is (−∞, +∞).

公式按讲义重排。**logit**（对数几率）= odds 取自然对数；$\ln$ 把 $(0,1)$ 映到 $(-\infty,0)$、$(1,+\infty)$ 映到 $(0,+\infty)$，值域变成整条实数轴，与线性函数一致。讲义只给结论「whose range is (−∞, +∞)」，完整值域推导见附录 A1（只推到此为止，不推广到广义线性模型）。

**考试角度**：（B 级：大纲）期末含推导题。（C 级 通识）「写出 logit 的定义并说明其值域」是这类课的常见考法；本课能读的样题没有直接出现。

要点校准：推导课的「为什么」重心在每步理由与值域/单调性条件；动画分页组只写一节、以完整版为引用基准；扫描件往年卷先用 Read 逐页视觉读取、取到的证据标「（扫描件，视觉读取）」，读不清的才写「无法抽取文本」并退 B/C 级——两种情况都不凭记忆编 A 级。

---

## 三、索引示例（`study/记忆库/索引.md` 片段）

```markdown
# 记忆库索引
已处理讲次：L08、L09
- L08：单周期数据通路——五段硬件、控制信号、关键路径
- L09：流水线——五段切分、吞吐量 vs 延迟、结构冒险

#L08-03 | 单周期数据通路 single-cycle datapath | L08 p.3 | 一条指令在一个时钟周期内走完取指到写回 | 被 L09 延伸 |
#L09-04 | 结构冒险 structural hazard | L09 p.17–20 | 两条指令同周期争同一资源；解法：分离 I/D 存储器、寄存器堆半周期读写 | 新 |
#L09-05 | CPU time = CPI × CC × IC | L09 p.7 | 流水线动的是 CC；L11 才正式讲 | 新 |
```

不入库判例：样张 p.3「多周期设计」与 p.5「为什么恰好五段」是补充，真实有用仍不入库；「本课试卷没单独考五段名称」是 C 级考法。
