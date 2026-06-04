# runtime-protocol — safe vince-mp execution rules

Read this before executing `vince-mp`, constructing workflow JSON, or reporting CLI failure evidence.

## Backend Contract

Use the system-installed CLI package as the backend:

```bash
vince-mp
```

This skill intentionally uses the system-installed `vince-mp-cli` npm package. Apply CLI discipline: structured JSON input, JSON output, standard error codes, explicit side effects, explicit path boundaries, and narrow commands.

Load `references/cli-contract.md` only when exact command schema, workflow step names, or error codes are needed. Otherwise keep the high-level protocol here in context.

## Execution Protocol

1. Classify intent: `capabilities`, `doctor`, `smoke-existing`, `run`, `screenshot`, or `media`.
2. Classify connection safety:
   - current client must not be disturbed: use `attach` only via `smoke-existing` or `run.connect.mode:"attach"`;
   - opening/focusing a project is allowed: use `launch` with explicit `projectPath`.
3. Keep paths under `cwd` or `--workspace-root`; output files require explicit `--output`.
4. For UI work, query or snapshot first, act by returned `uid`, then refresh query/snapshot after navigation or mutation. For a single element screenshot, use `elementScreenshot` with an explicit `output` path under `--workspace-root`.
5. For page diagnostics, read route/pageStack/pageData before snapshot. Treat Skyline snapshot timeout as a partial evidence blocker, not a full smoke failure.
6. For Canvas/Camera, load `references/skyline-media.md`; instrumentation and mocks must be explicit and reversible.
7. Verify every action with CLI JSON evidence. On failure, report the CLI command, error code, connection mode, side effects attempted, and next deterministic recovery command.

## Hard Rules

- Do not use any non-CLI automation backend or connector for new workflows.
- Do not use `launch`, `reLaunch`, navigation, media instrumentation, or mocks when the user asked for non-invasive live smoke.
- Do not infer the automation WebSocket from an unrelated DevTools URL parameter; verify the actual endpoint.
- Do not write outside `--workspace-root`.
- Do not call unsafe `wx` methods unless the workflow step explicitly sets `allowUnsafe:true`.
- Do not collect Camera photos/frames by default; Camera work is metadata-only unless the user explicitly requests mock/take-photo behavior.

## Output Discipline

Final responses should be at most 2 short paragraphs or 6 bullets unless the user asks for full JSON evidence.

Keep responses concise:

- summarize observed route/page data/log/media evidence;
- name failing error codes such as `PATH_OUTSIDE_WORKSPACE` or `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`;
- separate confirmed runtime evidence from planned next steps;
- include exact command shape when recovery requires a rerun.

## Anti-patterns

- Do not run `launch` to recover from an attach failure unless the user explicitly allowed opening/focusing DevTools.
- Do not hide side effects behind helper scripts; the CLI JSON must show the action and output path.
- Do not retry Skyline element enumeration indefinitely. Use bounded timeouts and report partial evidence.

## Verification

After applying this file:
1. Confirm the command used the system `vince-mp` binary.
2. Confirm any file write stayed inside `--workspace-root`.
3. Confirm failures are reported with CLI error code, command shape, connection mode, and attempted side effects.
