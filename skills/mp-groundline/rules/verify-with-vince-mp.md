# Verify with vince-mp — before/after capture + diff

Load at Step 4. The migration's correctness claim is "pages stay consistent"; this
is how you check it on the LIVE runtime using the system `vince-mp` CLI. This is
**protocol prose, not a unit test** — the deterministic core (scan + doc) is
already verified on fixtures; this step needs a live DevTools session and is run
at use time on the real program.

> `vince-mp` is a system dependency the sibling skill `mp-cli-sup` drives —
> do **NOT** rebuild it. Subcommands below are confirmed against
> the `vince-mp-cli-sup` skill's `references/cli-contract.md` (installed next to
> this skill; in the repo it lives at `../../mp-cli-sup/references/cli-contract.md`).

## Precondition — check before Step 3

The baseline is captured on the un-flipped program, so check this first:
`vince-mp session start --json` must return `ok` (it resolves the project, ensures
the DevTools automation port, and attaches). `vince-mp doctor --skip-typecheck
--json` helps diagnose a failure, but it does not prove the port is live. Errors such as
`WECHAT_CLI_NOT_FOUND`, `AUTOMATION_PORT_TIMEOUT`, `AUTOMATOR_CONNECT_FAILED`,
`APP_NOT_RUNNING`, or `vince-mp` missing from PATH mean verification cannot run.

## If verification cannot run — the degraded path

Nothing was observed, so nothing may be claimed. You may still do Steps 1–3
(scan, MIGRATION-MAP, flip), but:
- keep the flip **uncommitted** so it stays revertible (`git checkout` rollback);
- mark **every** page `UNVERIFIED` in the MIGRATION-MAP; never write "consistent"
  or "verified", and do not infer consistency from reading the code;
- make **no** Step 5 fixes — there are no confirmed deltas, and fixing "likely"
  deltas from the scan is the assumed-regression mistake (minimal-fix rule 1);
- still surface every `rewrite` item, and tell the user to open DevTools
  (automation enabled) and re-run this loop.
Report it as "flip applied, NOT verified: N/N pages UNVERIFIED". A page whose
capture fails mid-loop (e.g. `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`) is UNVERIFIED
plus a blocker in the report, the same way.

## Contract points this file depends on (A38 coupling)

From `mp-cli-sup`'s `references/cli-contract.md`: `session start` (one reused
session), `page`, `data` (pageData, 200KB default cap), `shot <output>` (writes
under `--workspace-root`; the **parent dir must already exist** — create
`before/` and `after/` first), `nav <url>` (`navigateTo` only; a tabBar page needs
`vince-mp step '{"type":"switchTab","url":"..."}'`). If `mp-cli-sup` retires or
changes any of these five, rebalance this file and SKILL.md Step 4 in the same
Decision Record (A38). Do not let them silently diverge.

## The loop (per page)

1. **Start one session** (resolves the project + ensures the automation port +
   attaches; reused by every later command):
   ```bash
   vince-mp session start --json
   ```
2. **Before the flip — capture a baseline** for each page in `app.json.pages`:
   ```bash
   vince-mp page --json                 # route + currentPage
   vince-mp data --json                 # pageData (default cap 200KB)
   vince-mp shot before/<page>.png --workspace-root <dir>   # full-page screenshot
   ```
   (Navigate between pages with `vince-mp nav <url>`; uids reset after navigation.)
3. **Apply the mechanical flip** (Step 3 of the runbook) and rebuild so DevTools
   reloads under WebView.
4. **After — recapture the same pages** into `after/<page>.png` + a fresh
   `vince-mp data` per page.
5. **Diff** `before/<page>.png` vs `after/<page>.png` and the two `pageData`
   payloads → the list of **actual** visual/behavioral deltas. Only real deltas
   get fixed (`rules/minimal-fix-protocol.md`).

## What to look at

- **Layout**: the workaround categories (`box_shadow_border`, `flex_grid_workaround`,
  `word_break`, `scroll_view_type`) should look identical — if one shifts, it is a
  real delta, not an assumed one.
- **camera tap-mask** (`verify` rows): tap the masked region after the flip and
  confirm the handler still fires; event bubbling differs between renderers.
- **rewrite rows**: these pages are expected to break until rewritten — do not
  treat their deltas as migration regressions; they are the manual-review gate.

## Evidence to record

For each page: the before/after screenshot paths, whether `pageData` matched, and
any delta with its fix. Put this in the MIGRATION-MAP under the finding's row.
Report a Skyline query/snapshot timeout (`SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`)
as a blocker, not a silent skip.
