---
name: mp-cli-sup
description: >-
  Debug a WeChat Mini Program's LIVE runtime via the system `vince-mp` JSON CLI —
  one persistent session, then instant reused commands (pageData, query/tap, scan,
  console, doctor, log correlation). Use for "debug WeChat DevTools", "连上小程序",
  "$mp-cli-sup". NOT for browser automation, source-only edits, or non-WeChat
  work.
metadata:
  version: 0.2.1
---

# Vince Mini Program CLI Support

Debug a WeChat Mini Program's live runtime through the **system `vince-mp` JSON CLI** (an
installed npm package, not a vendored binary). The defining workflow is **session-first**:
connect once, then every later command reuses that one connection — repeat commands are
near-instant and element `uid`s persist across separate CLI calls.

## Trigger boundary

Use this skill to: connect to / start a session against WeChat DevTools; inspect runtime state
(route, pageStack, pageData, storage, systemInfo, console); query/snapshot elements and then
tap/input them by uid (long-press via `step`); take a single-element or full screenshot; drive a camera-less
`scan`; run a real project `doctor` (tsc + `.ts/.js` freshness + selected backend domain + LAN IP);
diagnose "won't connect / 模拟器启动失败"; switch backend env and pull server error logs by
`requestId`; probe Skyline Canvas/Camera or mock media.

Do **not** use it for ordinary web-browser automation, generic frontend source edits, Mini
Program code review with no DevTools/runtime execution, or a Skyline→WebView renderer migration
(that is `mp-groundline`).

## The session-first workflow (do this)

```bash
vince-mp session start          # connect ONCE: auto-resolves miniprogramRoot + ensures the
                                #   automation port (spawns `cli auto` only if it isn't live),
                                #   then attaches. May open/focus DevTools if it isn't running.
vince-mp doctor                 # optional health check (project + tsc + .js freshness + domain)
vince-mp data                   # read pageData — instant (reuses the session)
vince-mp query .submit-btn      # mint a uid (e.g. "button_0")
vince-mp tap button_0           # act by uid — the uid is STILL valid in this separate call
vince-mp data                   # confirm the effect
vince-mp scan PKG-2026-0605     # camera-less: onScanCode with a {type:"scancode",detail:{result,scanType,type}} event
vince-mp console                # console buffered since session start
vince-mp session stop           # when done (or it idle-reaps itself)
```

**Any trigger whose handler does async work** (`tap`/`input`/`scan`/`step`) resolves when DevTools
DISPATCHES the call, NOT when the async work (`wx.request`→`setData`) finishes — `wait` or re-poll
before reading the effect, whether the read is `data`, `networkList`, or `mediaList`.

Every command returns JSON and accepts `--workspace-root <dir>` and `--port <n>` (default 9420;
`--port` only selects the automation port when a NEW session is first spawned for a workspace).
The session is keyed per **workspace-root**, NOT per port — to debug two projects at once give each
its own `--workspace-root`; `--port` alone will reuse the live session and not switch targets.

## Command map (load `references/cli-contract.md` for exact schema)

The full command surface — session lifecycle, the read/act/diagnose/one-shot
shorthands, the at-a-glance grouped map, plus the exact step list and error codes —
lives in `references/cli-contract.md`. **Load it before building or running any
`vince-mp` command** (its "At-a-glance command map" section is the grouped
index; the sections below it are the exact schema).

## Core rules

- Use the system `vince-mp` command as the only backend.
- Prefer the **session**; reach for `--no-session`/`run --connect` only when a one-shot or an
  explicit connection is required. Opening/focusing DevTools via `launch` (beyond `session start`
  ensuring the port) is a **human-gated** side effect — do it only with explicit user authorization.
- Keep paths under `cwd`/`--workspace-root`; file outputs need an explicit `--output`/path arg.
- Do **not** navigate, reLaunch, instrument media/network, or mock APIs unless that side effect
  is explicit in the request. `session start` ensuring the automation port (and possibly opening
  DevTools) is the one expected connect-time side effect.
- Verify every action with the CLI's JSON evidence; report failing error codes verbatim
  (e.g. `APP_NOT_RUNNING`, `AUTOMATION_PORT_TIMEOUT`, `STALE_OR_UNKNOWN_UID`).

## Load protocol

1. Read this file first.
2. Before running `vince-mp` or building workflow JSON, load `rules/runtime-protocol.md`.
3. For exact command/step/error schema, load `references/cli-contract.md`.
4. For uid interaction or single-element screenshots, load `rules/ui-element-workflow.md`.
5. For Skyline Canvas/Camera/media, load `references/skyline-media.md`.
6. For connect/session/snapshot/console/network edge cases + failures, load `references/evidence-and-failures.md`.

## Modules

- `rules/runtime-protocol.md` — session-first execution protocol + hard safety rules; read before running the CLI.
- `rules/ui-element-workflow.md` — uid + `elementScreenshot` workflow; uids persist in a session, stale only after navigation/mutation.
- `references/cli-contract.md` — exact command surface, session ops, shorthands, connection/workflow JSON, step list, error codes.
- `references/skyline-media.md` — Skyline snapshot protocol + Canvas/Camera/media instrumentation & mocks.
- `references/evidence-and-failures.md` — connect/session edge cases, uid lifetime, console/network caveats, failure codes.

## Verifying the skill

- `node scripts/validate-skill.mjs` — structural validation (files, frontmatter, `vince-mp help --json`).
- `node scripts/run_all.mjs` — deterministic contract check: every documented command / shorthand / workflow step / error code / version pin is verified against the live `vince-mp capabilities --json`, so the docs can't silently drift from the CLI. `--self-test` proves each check discriminates.
- `node scripts/check_release_gate.mjs` — closes the release gate only on real evidence (executes each cited command by exit code; requires the harness self-test to still pass).
- `node scripts/check_battery_clean.mjs` — the stage-3 adversarial-hardening gate: reads the defect ledger (`.loop/mp-cli-sup-battery.json`) and asserts a trailing run of consecutive clean rounds with the required round shape and green regressions (`--consecutive N`). RED when the ledger is absent or has too few clean rounds.
