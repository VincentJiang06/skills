// RED stub — imports cleanly, returns a fixed WRONG sentinel so the harness reaches assertions
// and fails there (proves the cases were authored before the real lint_request.mjs).
export function analyzeRequest() {
  return { scope: 'in', lane: '__stub', redirect_to: null, backend: 'wechatide', tool_check: { name: 'x', valid: true, suggestion: null, guardrail: null }, discipline_flags: [] }
}
// wrong sentinel: no guardrails → C23/C24 fail in red before the real guardrail layer exists
export function guardrailFor() { return null }
