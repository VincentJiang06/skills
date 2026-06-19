# Verify with vince-mp — before/after capture + diff

Load at Step 4. The migration's correctness claim is "pages stay consistent"; this
is how you check it on the LIVE runtime using the system `vince-mp` CLI. This is
**protocol prose, not a unit test** — the deterministic core (scan + doc) is
already verified on fixtures; this step needs a live DevTools session and is run
at use time on the real program.

> `vince-mp` is a system dependency the sibling skill `mp-cli-sup` drives —
> do **NOT** rebuild it. Subcommands below are confirmed against
> `~/.claude/skills/.../mp-cli-sup/references/cli-contract.md` (or
> `/Users/vince/playground/skill-developer/skills/mp-cli-sup/references/cli-contract.md`).

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
