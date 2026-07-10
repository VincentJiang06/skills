# Changelog

## 0.1.0 — 2026-07-10

Initial merge of `mp-cli-sup` (live-runtime debug) and `miniprogram-dev-skill` (official DevTools skill)
into a single WeChat Mini Program developer & debugger skill.

- **Official DevTools-2.0 backend as the single live transport.** Vendored the official `miniprogram-dev-skill`
  **v0.2.5** (7 scenes + 41-tool `tools.yaml` + references + SECURITY), driven via `wechatide` (Door A).
- **Dropped the `vince-mp` wrapper CLI.** It was only a wrapper over `miniprogram-automator` (frozen at 0.12.1);
  its automation core is covered by the official `automation_*` tools, and its session/uid daemon is moot under
  Door A (the IDE holds the connection). The automator path survives as a minimal, optional hardcoded-npm escape
  hatch (`scripts/automator-escape-hatch.mjs`) for standalone/CI scripts only.
- **Verified real-device automation is covered by Door A** (`automation_viewport_action --action remote`), so no
  bespoke real-device lane was needed.
- **Ported the live-debug value as supplements** (no CLI): cross-stack `scripts/doctor.mjs` (project resolve +
  tsc + `.ts/.js` freshness + LAN IPv4, with a non-vacuous `--self-test`), `references/renderer-awareness.md`
  (Skyline vs WebView gotchas), `rules/supplements.md` (camera-less scan + canvas capture recipes),
  `references/debug-discipline.md` (evidence-first / safe-defaults / failure-code vocabulary), and
  `references/two-transports.md`.
- **Removed 草料-specific `env`/`logs`** — they stay in the private `mp-cli-sup`.
- **Version reconciliation** for the vendored copy: `skill.yaml` pinned to `0.2.5`, `scripts/check_skill_version.mjs`
  reconciles against the installed IDE (verified in-sync with DevTools `2.02.2607092`).
- Verification: `validate-skill.mjs` 31/31, `doctor --self-test` 6/6, `check_skill_version` in-sync, `doctor`
  smoked against real projects.
