# skill-developer

> Production-grade Agent Skills for Claude Code — and the pipeline that builds them.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · **English** · [中文](README.zh.md)

Install-ready [Agent Skills](https://github.com/anthropics/skills) for
[Claude Code](https://github.com/anthropics/claude-code), plus the **`vince-skill-*` pipeline** that built
each one. Bilingual (EN / 中文); several are Chinese-first (乐评, HiFi, 学术润色).

## Highlights

- **Built, not vibed** — every skill is hardened through the pipeline: eval cases + verification gates.
- **Evidence-traceable** — review and fact-check skills cite every claim to a source.
- **Chinese-first depth** — real 中文 craft, not machine translation.
- **Self-building** — the repo ships the very pipeline that builds the skills.

## Good to know

- **For Claude Code** — they use the Skill mechanism; not a drop-in for other agents.
- **Opinionated** — they encode one person's standards and workflow; tune to taste.
- **Some need setup** — research skills need web access; `vince-mp-cli-sup` needs the Node CLI + WeChat DevTools.
- **Scope-bounded** — each skill does one thing; see its README's "Not for" line.

## Quickstart

```bash
cp -R skills/vince-fact-check ~/.claude/skills/    # one skill (or skills/* for all)
```

Then just ask — Claude Code auto-triggers from your request — or call `/<skill-name>` explicitly:

```
> is it true that the Eiffel Tower gets taller in summer?     # → vince-fact-check
```

## Skills

| Skill | What it does | Example ask |
|---|---|---|
| [vince-album-review](skills/vince-album-review/) | Deep, source-traceable long-form Chinese album review (乐评, 10k–15k 字). | “给 周杰伦 的《范特西》写一篇深度乐评” |
| [vince-hifi-review](skills/vince-hifi-review/) | Objective HiFi gear evaluation from measurements + review consensus. | “这个 DAC 推得动吗” |
| [course-study](skills/course-study/) | Course materials → complete-coverage, Feynman-style, exam-ready notes. | “revise these lecture slides for my final” |
| [vince-fact-check](skills/vince-fact-check/) | Fast, citation-backed fact-check with a hard time budget. | “is it true that …?” |
| [humanizer-academic](skills/humanizer-academic/) | De-AI academic prose (EN/ZH/mixed), keeping scholarly register. | “make this thesis chapter read human” |
| [vince-low-visibility-fix](skills/vince-low-visibility-fix/) | Audit mobile UI for glare / gloves / low light; emit a fix-plan doc. | “audit this UI under glare, give a fix plan” |
| [vince-mp-cli-sup](skills/vince-mp-cli-sup/) | Debug a live WeChat Mini Program via the `vince-mp` CLI. | “连上小程序，inspect pageData” |

**Pipeline — skills that build skills:** [conductor](skills/vince-skill-conductor/) runs the whole loop;
[guidance](skills/vince-skill-guidance/) audits → [engineer](skills/vince-skill-engineer/) builds →
[zipper](skills/vince-skill-zipper/) compresses. Methodology: [`develop-principle/`](develop-principle/).

## Layout

```
skills/             # install-ready skills (one folder each, with its own README)
develop-principle/  # agent-first KB powering the pipeline
tools/vince-mp-cli/ # Node CLI that vince-mp-cli-sup drives
experiments/        # research / A-B material, not install-ready
docs/               # internal design notes & skill analysis
```

## License

[MIT](LICENSE) © 2026 Vince Jiang. Use, adapt, and redistribute freely.
