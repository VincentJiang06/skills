# mp-cli-sup

> 调试*实时*运行的微信小程序 —— 一次连接、命令秒回，元素 uid 跨调用稳定。

[English](README.en.md) · **简体中文**

**做什么** —— 通过系统的 `vince-mp` JSON CLI 调试*实时*运行的微信小程序：启动一次持久会话（自动解析 miniprogramRoot + DevTools 自动化端口），之后以复用连接的瞬时命令读取与操作运行时。

**好在哪** ——
- **一次连接、命令秒回**：连一次，后续命令复用同一连接，重复命令近乎瞬时。
- **元素 uid 跨调用稳定**：`query` 出 uid，下一条命令仍可对它 `tap` —— 无需重新查询。
- **免相机 `scan` 冒烟** + 单元素截图，无需真机摄像头即可走通扫码路径。
- 真正的 `doctor`（tsc + `.js` 新鲜度检查）；并按 `requestId` 关联前端与后端错误日志。

**什么时候用** —— 「debug WeChat DevTools / 连上小程序」·「inspect pageData」·「query 一个元素再 tap」·「免相机 scan 冒烟」·「模拟器为什么连不上」·「查 tsc/.js 新鲜度」·「切后端环境」·「按 requestId 拉服务端错误日志」；也可用 `/mp-cli-sup` 显式调用。
**不适用** —— 通用浏览器自动化；不连运行时、只改源码的小程序编辑；非微信的 connector 工作。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/mp-cli-sup ~/.claude/skills/`）。需先具备 `vince-mp` CLI（位于 tools/vince-mp-cli）。

完整说明见 [SKILL.md](SKILL.md)。
