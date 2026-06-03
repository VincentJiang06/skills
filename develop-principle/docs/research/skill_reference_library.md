# 公共 Skill 仓库参考库 / Public Skill Reference Library

machine_summary_zh: develop-principle 维护一个最著名、用户量最多的公共 skill 仓库注册表，需要时按需下载某个具体 skill 作为学习参考——学它的内容组织和重点，但工业级 skill 在结构上要考虑得更多。

machine_summary_en: develop-principle keeps a registry of the most popular public skill repositories and fetches a specific skill on demand as a learning reference — learn its content and emphasis, but an industrial skill must consider more structure.

reference_ids: `ref.sok.agentic_skills`, `ref.tool_registry_design`, `ref.skillsbench`

node_ids: `pillar.research`

## 1. 用途

当你设计一个新 skill 时，先看看别人怎么做的是高效的资料搜集起点。`references/skill_repos.registry.json` 用 JSON 记录了少数最著名、star 最多的公共 skill 仓库（Anthropic 官方、各大厂和高 star 社区合集），每条带 star 数、license、默认分支、值得学习的点和代表性 skill 路径。

注意定位：**学习这些 skill 的内容组织和重点**（frontmatter 怎么写触发、目录怎么分、references/scripts 怎么放），而**不是照抄**。工业级 skill 在结构上要考虑得更多——触发的正/反/邻近例、控制边界、测试资产、量化指标、生命周期、以及本库强调的证据基础。公共仓库里的 skill 大多只覆盖其中一部分（`ref.skillsbench` 显示精心策划的小而聚焦的 skill 才有效，`ref.sok.agentic_skills` 给出更完整的生命周期视角）。

## 2. 按需下载

不要把这些仓库整体克隆进知识库。用 `tools/fetch_skill_reference.mjs` 按需把某个具体 skill 拉到知识库**之外**的缓存目录学习：

```bash
# 列出注册表里的仓库
node tools/fetch_skill_reference.mjs --list

# 下载某个仓库里的某个 skill 到缓存（默认 <cwd>/.skill-reference-cache，在 KB 之外）
node tools/fetch_skill_reference.mjs repo.anthropics_skills skills/skill-creator
node tools/fetch_skill_reference.mjs repo.addyosmani_agent-skills skills/test-driven-development --out /tmp/ref
```

工具通过 GitHub raw / `gh api` 拉取指定路径，不写入 `develop-principle/` 内部（否则会破坏 KB 的文件清单校验）。缓存是临时的、可删的学习材料，不是 KB 的一部分。

## 3. 注册表维护

注册表里的 star 数是抓取时的近似值，会过期。需要刷新时用 `gh api repos/<owner>/<name>` 重新取 `stargazers_count` / `default_branch` / `license`，并更新 `references/skill_repos.registry.json`。注册表结构由 `schemas/skill_repo_registry.schema.json` 约束。挑选写法和工具说明文案的规范见 `ref.tool_registry_design`。
