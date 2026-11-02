# 声音仪表盘：直接生成图片

用于耳机/IEM/TWS 评价的简明视觉摘要；不用于 DAC/amp。先完成证据整理和原有 self-verify，再生成图。工具不会按型号自动猜测听感，也不会联网调用模型。

## 输入

在当前工作目录写 `dashboard.json`，`name` 与 evaluation 的 `device` 完全一致：

```json
{
  "name": "示例耳机（演示数据）",
  "signature": "Vince",
  "theme": "mint",
  "bands": ["突出", "均衡", "均衡", "突出", "均衡"],
  "steps": [3, 4, 3, 4, 4]
}
```

这是格式示例，不代表任何真实耳机。日期省略时按 Asia/Shanghai 当天生成；补录历史评价可传 `date: YYYY-MM-DD`。网页日期只读。

- bands 顺序：低频、中低频、中频、中高频、高频；每项为突出/均衡/收敛（或0/1/2）。
- steps 顺序：动态、瞬态、声场、分离度、解析度/信息量；每项1–5。
- 两端语义分别为温和→强劲、缓慢→迅速、紧凑→宏大、融合→分明、低→高；**这些是描述坐标，不是品质总分**。原 skill 的 above-average 不能机械映射成“迅速”或“宏大”。
- theme: mint / blue / purple / pink / amber / cyan。

## 证据映射

五个宽泛频段不是现有八频段 taxonomy 的简单一一对应。依据归一化后的曲线与文字结论，明确写出每个宽频段的合并判断；来源冲突须保留，不取机械均值。动态/瞬态/声场/分离度/解析依据 review consensus，不能从FR直接推断，不能把 imaging 自动当 separation。每个档位的来源和判断保留在评价正文或旁边的 trace 文件中，仪表盘只是摘要。

缺失任何一个频段/技术项时，不要把3档/均衡当“未知”来补齐；先补足证据或向用户说明无法出完整图。用户提供的主观评分可以直接制图，但应标为用户听感，不改称测量结论。

## 一条命令输出图片

```bash
python3 scripts/sound_dashboard.py --input dashboard.json --evaluation evaluation.json --jpeg sound-dashboard.jpg --output dashboard-result.json
```

直接写出 JPEG 和结果 JSON（包含中英文声音介绍及 `https://vincejiang.com/sound_dashboard/#review=...` 分享链接），无需手动打开 HTML。将 JPEG 展示给用户，附分享链接和有来源的正文说明。`--evaluation` 运行原 `validate_output.py`，只证明结构与溯源引用格式通过，不证明各档位含义正确；仍需 self-verify。

也可直接：

```bash
sound-dashboard --input dashboard.json --jpeg sound-dashboard.jpg --format markdown --output dashboard.md
```

默认生成 `sound-dashboard.jpg`；`--no-image` 仅生成文字/链接；已有文件默认不覆盖，明确更新时加 `--force`。图片渲染在后台通过本机 loopback 完成，不打开用户浏览器、不上传评价数据。首次缺 Chromium 时运行 `sound-dashboard --install-browser`。

## 可选依赖与安装边界

声音仪表盘依赖外部 `sound-dashboard` CLI（NFsounddashboard 项目），需要 Node.js 22+；首次 JPEG 渲染还需要 Chromium。此 skills 仓库只分发 Python 调用脚本，不分发该 CLI。目前没有随本版本提供可公开安装的源码地址或 npm 包，不应把本机已配置写成通用安装保证。

已经获得 NFsounddashboard 项目源码的用户，可在该项目目录执行 `npm install && npm run build && npm link`，再执行 `sound-dashboard --install-browser` 安装渲染浏览器。若 PATH 不含命令，可设 `SOUND_DASHBOARD_CLI` 为可执行脚本绝对路径。依赖安装需处于用户授权范围。

没有该 CLI 时，说明“未生成声音仪表盘：缺少可选 sound-dashboard CLI”，继续交付有来源的文字评价；不伪造图片、链接或安装地址。`--no-image` 也需要 CLI，它不是绕开依赖的后备方式。
