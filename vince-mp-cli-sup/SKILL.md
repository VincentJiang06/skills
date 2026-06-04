---
name: vince-mp-cli-sup
description: >
  Debug WeChat Mini Program runtime state through the system `vince-mp` JSON CLI.
  Use when the user says "debug WeChat DevTools", "live smoke Mini Program",
  "inspect pageData", "query uid", "single element screenshot", or
  "Skyline canvas/camera probe". Do NOT use for generic browser automation,
  source-only Mini Program edits, or connector/server workflows.
---

# Vince Mini Program CLI Support

Use this skill for WeChat Mini Program runtime automation through the system-installed `vince-mp` CLI. The system `vince-mp` command is the only allowed backend, and it is not a vendored skill-local binary.

## Trigger Boundary

Use this skill when the user asks to connect to WeChat DevTools, inspect a Mini Program runtime, run non-invasive live smoke, read route/pageStack/pageData/storage/system info/screenshots, interact through uid-based query results, debug Skyline snapshot hangs, probe Canvas/Camera, or mock Camera/media APIs.

Do not use this skill for normal web browser automation, generic frontend source edits, or Mini Program code review without DevTools/runtime execution.

## Load Protocol

1. Read this file first.
2. Before executing `vince-mp` or constructing workflow JSON, load `rules/runtime-protocol.md`.
3. For exact command schema, workflow step names, or error codes, load `references/cli-contract.md`.
4. For UI repair, uid interaction, or single element screenshots, load `rules/ui-element-workflow.md`.
5. For Skyline, canvas, camera preview, or media mock work, load `references/skyline-media.md`.
6. For attach, autoPort, snapshot, console, or network edge cases, load `references/evidence-and-failures.md`.

## Core Rules

- Use the system `vince-mp` command as the backend.
- Keep paths under `cwd` or `--workspace-root`; output files require explicit `--output`.
- Do not launch, relaunch, navigate, instrument media/network, or mock APIs unless that side effect is explicit in the user request or selected workflow.
- Verify runtime work with CLI JSON evidence, and report failing CLI error codes directly.

## Modules

- `rules/runtime-protocol.md` — read before executing CLI commands, constructing workflow JSON, or reporting failure evidence.
- `rules/ui-element-workflow.md` — read for UI repair, uid interaction, or `elementScreenshot` workflows.
- `references/cli-contract.md` — read when exact command syntax, workflow JSON, step names, or error codes are needed.
- `references/skyline-media.md` — read for Skyline, Canvas, Camera preview, camera mock, or media instrumentation work.
- `references/evidence-and-failures.md` — read when diagnosing attach, autoPort, snapshot, console, or network edge cases.
