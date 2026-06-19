# mp-groundline

> 把小程序从 Skyline 落回 WebView —— 一致性优先：翻转渲染器，但绝不撤掉既有兼容代码。

[English](README.en.md) · **简体中文**

**做什么** —— 把微信小程序从 Skyline 渲染器迁移到 WebView，一致性优先：翻转渲染器、保留页面表现一致，配一个只读扫描器 + 一份生成的迁移地图（MIGRATION-MAP）文档。

**好在哪** ——
- 翻转渲染器的同时**保留** workaround —— 绝不回退、绝不撤掉既有兼容代码，最小 diff 而非重写。
- 只读扫描器，只盘点不改动目标；硬 Skyline-only 特性一律「标记，绝不静默丢弃」。
- 用系统 `vince-mp` CLI 抓迁移前后截图 + `pageData` 对比，只修真正出现的差异。
- 经 5 轮工程师 × 4 组新鲜测试硬化，抓出 11 个潜伏 bug（含 markdown 注入、CSS url 注释吞噬、worklet 弱 token 过度匹配）。

**什么时候用** —— 「把小程序从 skyline 迁移到 webview 保持页面一致」·「生成 skyline→webview 迁移对照 doc」；也可用 `/mp-groundline` 显式调用。
**不适用** —— 实时运行时调试（→ mp-cli-sup）；开发 Skyline 组件 / worklet 动画 / 自定义路由（→ skyline-* skills，方向相反）；webview→skyline 反向迁移；不换渲染器的纯性能优化；除非明确要求，否则不现代化 / 回退 workaround；非微信工作。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/mp-groundline ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
