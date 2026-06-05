# mp-cli-sup

通过 `vince-mp` CLI 调试微信小程序的实时运行时：pageData、查询 / 点击、免相机 scan、doctor、错误日志关联。
Debug a WeChat Mini Program's live runtime via the `vince-mp` CLI — pageData, query/tap, camera-less scan, doctor, error-log correlation.

- **触发 Triggers** — “连上小程序 / debug WeChat DevTools” · “inspect pageData” · “为什么模拟器连不上”
- **依赖 Needs** — [`tools/vince-mp-cli`](../../tools/vince-mp-cli/)（`npm install`）+ 微信开发者工具自动化端口。
- **用法 Use** — 先起一个持久会话，再用复用连接的命令读取 / 操作。Start a persistent session, then read/act with reused-connection commands.
- **不适用 Not for** — 通用浏览器自动化、无运行时的纯源码改动。Generic browser automation, or source-only edits with no runtime.

完整说明 / Full spec: [SKILL.md](SKILL.md)
