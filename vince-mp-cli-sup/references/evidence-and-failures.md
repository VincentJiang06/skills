# Evidence and Known Failures

These rules describe known CLI automation edge cases and should remain backend-independent.

## Connection

- `attach` means `automator.connect({ wsEndpoint })`; it must not fall back to launch.
- `launch` means `automator.launch({ projectPath })`; it may open or focus DevTools.
- A DevTools page URL `autoPort` parameter is not automatically the automation WebSocket. Verify the endpoint before using it.
- If startup logs are needed, connect first, then explicitly `reLaunch` only when the user allows that side effect.

## Snapshot and UID

- Snapshot/query returns uid state owned by that single CLI `run` process.
- Navigation and page mutation make old uid values stale.
- Skyline snapshot timeout does not invalidate route/pageData evidence.

## Console and Network

This CLI intentionally does not auto-inject network monitoring. If a future command adds network capture, it must start before the observed action and state that earlier requests are unavailable.

Console/network evidence from earlier non-CLI runs must not be claimed as current CLI evidence.
