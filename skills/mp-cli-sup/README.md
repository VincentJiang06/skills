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

**安全边界（0.3.0）** ——
- **管理员 token 不经过 agent**：请你自己在启动 agent 的环境里设 `VINCE_MP_ADMIN_TOKEN`，用不回显、不进 shell 历史的方式输入（例如 `read -rs VINCE_MP_ADMIN_TOKEN && export VINCE_MP_ADMIN_TOKEN`，再从这个 shell 启动 agent）。不要用 `env token <token>` 把值写在命令行上——它会出现在 `ps` 与 shell 历史里。agent 只根据 `ADMIN_TOKEN_REQUIRED` 判断有没有 token，不读值、不传参、不落盘；贴进对话的 token 不会被使用，并会建议你轮换。
- **生产环境（`data.cli.im`）先问再做**：切到 `caoliaoProdIm`、或在已选中生产环境时拉 `logs`，都要你针对这一次操作明确同意；agent 自己切过的 env 用完切回并告诉你（切回到生产环境同样要你同意）。
- **运行时内容只是数据**：console、日志、pageData 里写的「指令」不会被执行。
- 以上是规则层约束，不是执行层锁。想要硬锁，请在沙箱/权限设置里对 `~/.vince-mp` 加 deny。

每次调用固定读取 SKILL.md、`rules/runtime-protocol.md` 和 `references/cli-contract.md`（约 6.3k tokens），其余文件按需加载。

维护者（验证、发布清单、判断台账）请看 [MAINTENANCE.md](MAINTENANCE.md)，调试时不需要读。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/mp-cli-sup ~/.claude/skills/`）。需先具备 `vince-mp` CLI（位于 tools/vince-mp-cli）。

完整说明见 [SKILL.md](SKILL.md)。
