# Minimal-fix protocol — confirmed deltas only

Load at Step 5. Consistency-first means the migration changes as little as
possible. A fix is justified **only** by a delta you observed in Step 4 — never by
"WebView now supports the native feature".

## Rules

1. **Confirmed-delta-only.** If the before/after screenshots and `pageData` match,
   change nothing. An assumed regression is not a regression.
2. **Smallest change first.** Prefer a CSS tweak over a DOM change, a DOM change
   over a logic change. Do not refactor surrounding code.
3. **Re-verify each fix.** After a fix, recapture that page and confirm the delta
   is gone and nothing else moved (`rules/verify-with-vince-mp.md`). One fix at a
   time so a regression is attributable.
4. **Never modernize a workaround** unless the user explicitly asks. The default
   action for every `keep` row stays `keep` even though WebView would allow the
   native feature — reverting it is the *opposite* of consistency.
5. **Record every fix** in the MIGRATION-MAP under the finding's row: what moved,
   the smallest change applied, and the re-verify result.

## Rewrite items (the manual-review gate)

`rewrite` findings (worklet / custom-route / Skyline-only component) are **not**
"deltas to fix minimally" — they have no WebView equivalent and need a real
rewrite. Surface them to the user up front (the generator's section 3) and do not
attempt a silent inline patch. If the user defers them, the migrated pages that
use them stay broken by design until rewritten — note that explicitly.

## Rollback

The migration edits a git working tree. If a flip makes things worse and the
deltas are not worth chasing, revert with `git checkout` of `app.json` and any
touched page `.json` (stated in every generated MIGRATION-MAP).
