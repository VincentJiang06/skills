# ui-element-workflow — uid and element screenshot protocol

Read this when the user asks to repair Mini Program UI, interact with a specific element, crop a single element screenshot, or debug visual layout through runtime evidence.

## Principle

For UI work, query or snapshot first, act by returned `uid`, then refresh query/snapshot after navigation or mutation. For a single element screenshot, use `elementScreenshot` with an explicit `output` path under `--workspace-root`.

Element-level work is valid only when the CLI has a fresh uid from the same `run` workflow. A uid is stale after navigation, reLaunch, switchTab, page mutation that replaces nodes, or a new CLI invocation.

## Workflow

1. Read route/pageStack/pageData first when the runtime state is unknown.
2. In one `vince-mp run` workflow, call `query` or `snapshot` with bounded `timeoutMs`.
3. For screenshot crops, prefer `query` with a narrow selector and `includePosition:true`; then call `elementScreenshot` using the returned uid and an explicit output path.
4. For interaction, call `tap`, `input`, `longpress`, or `elementTrigger` only after the uid is present in the current workflow result.
5. After any action that may mutate the page, run `query` or `snapshot` again before the next uid-based action.

Example step shape:

```json
[
  {"type":"query","selector":".target","includePosition":true,"timeoutMs":3000},
  {"type":"elementScreenshot","uid":"view_0","output":"captures/target.png","padding":4}
]
```

## Skyline Blockers

If `query` or `snapshot` returns `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`, `QUERY_TIMEOUT`, or element geometry errors, treat uid actions and elementScreenshot as blocked for that page state. Continue with route/pageData/full screenshot evidence instead of guessing coordinates.

If `elementScreenshot` fails with `ELEMENT_GEOMETRY_UNAVAILABLE`, report that the runtime could not provide `offset()`/`size()` for the target element. If it fails with `ELEMENT_SCREENSHOT_BOUNDS_INVALID`, report the computed crop details from CLI JSON.

## Anti-patterns

- Do not guess a rectangle and crop manually when no uid geometry exists.
- Do not reuse a uid from a previous CLI invocation.
- Do not write captures outside `--workspace-root`.
- Do not auto-launch or relaunch DevTools to obtain a screenshot unless the user explicitly allowed that side effect.

## Verification

After applying this file:
1. The workflow contains a `query` or `snapshot` step before each uid action.
2. `elementScreenshot` has an explicit `output` path under `--workspace-root`.
3. Skyline timeouts are reported as blockers, with pageData or full screenshot evidence preserved when available.
