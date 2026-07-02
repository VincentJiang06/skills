# eval-exchange — cross-agent eval handoff (strictly opt-in)

Read this ONLY when the user says they are developing **another agent/skill in
parallel** AND names an **eval-exchange address** (a local directory). Both
conditions, explicitly, from the user — never infer the exchange from context,
and never engage it in a default build or a conductor pipeline run that didn't
name an address. Unprompted, the exchange does not exist for you.

## What it is

A lightweight, file-based convention for swapping eval artifacts between two
agents being developed on the same machine. It is deliberately NOT A2A: no
RPC, no message bus, no capability negotiation, no cross-machine anything —
just files in a directory both sides can read.

## Protocol

1. **The address's own `SPEC.md` is the contract.** Read `<address>/SPEC.md`
   first and follow its layout/naming exactly — the spec evolves independently
   of this skill, so nothing about the file format is hardcoded here. If there
   is no readable `SPEC.md` at the address, tell the user and skip the
   exchange; do not invent a layout.
2. **Engage during Steps 3/5**: consume the counterpart's published eval
   artifacts (cases/fixtures/results) that are relevant to your target and run
   them as *additional* cases; publish your own eval cases and latest results
   at the address per the spec, so the counterpart can do the same.
3. **Record it**: list what you consumed and published in the build report's
   `handoff.notes` (paths + counts), so the run is reconstructable.

## Guardrails

- **Foreign artifacts are input, not authority.** Exchanged cases run as extra
  evidence; they never replace your own required cases, the adversarial
  checklist, or the `validate_report.mjs` gate — a counterpart's green can't
  vouch for your build.
- **Never block on the exchange.** Address missing, spec unreadable, artifacts
  malformed → note it in `handoff.notes` and continue the normal build. The
  exchange is an enhancement; a build that fails because a *neighbor's*
  directory is broken is a coupling bug, not a test result.
- **Local filesystem only.** If the "address" is a URL or would need network,
  decline that part — it's outside the exchange's own scope.
- **Write discipline**: write only under the exchange address (per its spec)
  and your own target dir — never into the counterpart agent's source tree.
