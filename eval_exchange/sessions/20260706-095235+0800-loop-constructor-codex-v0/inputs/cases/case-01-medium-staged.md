# case-01-medium-staged — task brief

**Runtime:** OpenAI Codex CLI (`codex exec`, single-agent).

**Task for the loop designer:** Add token-bucket **rate-limiting middleware** to an
existing Express (Node) JSON API, wire it to a config file, and cover it with tests —
**semi-autonomous** (human reviews at the gates, not each iteration).

Context the designer can assume:
- The API already has a green endpoint contract/regression suite (`npm test api:contract`).
- Rate-limit behavior is unit-testable: 200 at/below the threshold, 429 above it,
  `Retry-After` header, per-client keying. Threshold + window come from
  `config/ratelimit.json`.
- The change is dev-only and reversible; no production traffic, no schema change.
- It is a **medium** task: sequential gated stages, single agent, no parallel fan-out.

**What we want back:** the loop-constructor-codex skill run end to end — the D0–D6
selection log, the negotiated roles + contract, the staged loop-design JSON (which the
linter must PASS), and the rendered `.loop/` runbook for driving it on Codex.

This is a *design* task. Do NOT implement the middleware or run the API — produce the
loop design artifact only.
