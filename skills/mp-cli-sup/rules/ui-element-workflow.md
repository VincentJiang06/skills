# ui-element-workflow — uid and element-screenshot protocol

Read this when repairing Mini Program UI, interacting with a specific element, cropping a single
element, or debugging layout through runtime evidence.

## Principle

`query`/`snapshot` first to mint a `uid`, then act by that uid (`tap`/`input`/`longpress`/
`elementTrigger`/`elementScreenshot`). **In a session, a uid stays valid across separate CLI
calls** — you can `vince-mp query .btn` in one call and `vince-mp tap button_0` in the next. A uid
goes stale only after navigation (`nav`/`reLaunch`/`switchTab`) or a page mutation that replaces
nodes; refresh by re-querying then. (Without a session — `--no-session` / a one-shot `run` — a uid
lives only inside that single process, the old model.)

## Workflow

```bash
vince-mp session start
vince-mp data                                   # read route/pageData when state is unknown
vince-mp query .target --position               # mint a uid (e.g. view_0)
vince-mp tap view_0                             # act by uid (separate call — still valid)
vince-mp data                                   # confirm the mutation
# after navigation OR node-replacing mutation, re-query before the next uid action:
vince-mp nav ../detail/detail
vince-mp query .target                          # fresh uid for the new page
```

Single-element image:

```bash
vince-mp query .target --position               # fresh uid + geometry
vince-mp step '{"type":"elementScreenshot","uid":"view_0","output":"captures/target.png","padding":4}'
```

`elementScreenshot` writes only to the explicit `output` under `--workspace-root`; it needs a fresh
uid, then takes a full screenshot and crops by `offset()`/`size()`. On Skyline pages where
enumeration or geometry hangs, report the bounded error instead of guessing a rectangle.

## Skyline blockers

If `query`/`snapshot` returns `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`, `QUERY_TIMEOUT`, or geometry
errors, treat uid actions and `elementScreenshot` as blocked for that page state — continue with
route/pageData/full-screenshot evidence instead of guessing coordinates. `elementScreenshot`
failing with `ELEMENT_GEOMETRY_UNAVAILABLE` or `ELEMENT_SCREENSHOT_BOUNDS_INVALID` is reported from
the CLI JSON, not worked around.

Prefer a **concrete selector** (`view`, `.item`) over the universal `*` for `snapshot`; `*` is not
supported by every renderer and yields `SNAPSHOT_ELEMENT_ENUMERATION_FAILED`.

## Anti-patterns

- Do not guess a rectangle and crop manually when no uid geometry exists.
- Do not reuse a uid after navigation/mutation without re-querying (the CLI flags it, e.g. `STALE_OR_UNKNOWN_UID`).
- Do not write captures outside `--workspace-root`.
- Do not auto-launch/relaunch DevTools to get a screenshot unless the user allowed that side effect.

## Verification

After applying this file: (1) a `query`/`snapshot` preceded each uid action (in the same session, or
the same one-shot `run`); (2) `elementScreenshot` had an explicit `output` under `--workspace-root`;
(3) Skyline timeouts were reported as blockers with pageData/full-screenshot evidence preserved.
