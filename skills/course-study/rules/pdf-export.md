何时读：用户明确要 PDF 时读全文并执行；其余入口从不读。

# PDF 导出（可选）

目标只有一个：文字都能看到——中文、`$…$` 公式、代码块。不追求排版。输出只写在 `<course>/study/` 下，不改动 markdown 源。引擎用 pandoc + xelatex（默认）；本机只有 lualatex 时把 `--pdf-engine=xelatex` 换成 `--pdf-engine=lualatex`，`CJKmainfont` 对两者同样生效。pdflatex 不行（中文渲成方块）。

## 环境检查

```bash
which pandoc xelatex lualatex
fc-list :lang=zh | head -5
```

pandoc 缺失、或 xelatex 与 lualatex 都缺失、或无 CJK 字体 → 回复「导出需要 pandoc + xelatex（或 lualatex）+ CJK 字体，本机未安装（缺：<项>）」，不改用 HTML 打印、不放弃中文字体、不猜路径；伴读 markdown 已是完整产物。

## 固定命令（中文 / 中英混排）

```bash
pandoc study/L09-Pipeline.md -o study/PDF/L09-Pipeline.pdf \
  --pdf-engine=xelatex \
  -V mainfont="Noto Serif" \
  -V CJKmainfont="Noto Serif CJK SC" \
  -V monofont="Noto Sans Mono" \
  -V fontsize=11pt \
  -V geometry="margin=2.5cm" \
  -V linestretch=1.8 \
  -V parskip=6pt \
  -V CJKoptions="AutoFakeBold=2,AutoFakeSlant=0.2"
```

关键项：`--pdf-engine=xelatex`（pdflatex 会把中文渲成方块）；`CJKmainfont`（缺它中文全是 □）；`CJKoptions=AutoFakeBold`（缺它中文粗体静默失效）；代码块不要加 `--listings`（该选项已弃用，且 pandoc 手册明写 listings 宏包不支持源码里的多字节编码——加上反而会让伪代码里的中文出问题）；`linestretch 1.8`（公式密集的讲义可用 2.0）。

字体回退（Noto 未装）：macOS `PingFang SC` / `STSong`，代码 `Menlo`；Windows `SimSun` / `Microsoft YaHei`，`Consolas`；Linux `Noto Serif CJK SC`，`DejaVu Sans Mono`。

## 与排版约定的配合

rules/format.md 只用 markdown 稳定子集正是为了这一步：文字标记【新】【延伸】、`$…$` 公式、`text` 围栏伪代码都能过 xelatex。`mermaid` 围栏不会被渲染成图，会原样留成代码块：不删、不改写，图后那段文字讲解保住信息（rules/format.md「示意图」），回复里说一句「PDF 里的 mermaid 示意图是代码块形态」；ASCII 示意图照常导出。同文件的「见附录 An」链接与回链用的是 HTML 命名锚点（rules/layout.md「链接写法」），经 xelatex 导出后很可能不能点；这一格本机没有 pandoc、未实测，导出后请明说「PDF 里的附录链接可能不可点，文字仍可读」。表格超过 5 列、格里有长中文时 CJK 会溢出，导出前拆表或缩短格内文字（只改导出用的副本，不改源）。

## 验证

```bash
pdftotext study/PDF/L09-Pipeline.pdf - | grep -c "流水线"
```

抽 3 个样本串 grep 回抽的文本：一段正文中文、一个公式里的符号、**一行代码块里的中文**（伪代码是中文写的，`for 每条指令 i：`——只验正文中文会漏掉代码块里的中文坏掉这一类）。都命中才算导出成功；否则报告缺哪一类。
