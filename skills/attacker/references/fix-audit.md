# Fix-audit mode — attack last round's REPAIRS, not just the artifact

The fix is the least-attacked text in any target: it was written *after* the last attacker went
home, by someone who already believed they understood the defect. Attacking the artifact again
does not attack the fix — the fix has to be made the object.

This is **not a sixth lens**. It is the five lenses re-aimed at a different object (the diff), so
the A41 anti-bloat clause holds: no new failure class is introduced.

**When it fires (mandatory).** Round N produced repairs ⇒ round N+1 includes a fix-audit pass.
**Who runs it.** A fresh context that did NOT write the fixes. A fixer auditing its own fix is the
same author-independence collapse the whole skill exists to prevent (A31 / H2).
**Evidence it earns its slot.** The philosophy KB's R17 battery, round 2: this pass alone produced
**4 P1s, all inside round 1's repairs** — fix not propagated to the axiom layer, fix introducing a
new inconsistency, fix direction reversed, fix relocating the defect
(`Philosophy/meta/revisions.md` §R17 battery 记录).

## Step 0 — get the material (do this before attacking; do not attack from memory)

You need two things: **the fix diff** and **the prior findings list**.

1. **Fix diff.**
   - Git target: find the repair commits, then diff them.
     `git log --oneline -- <target-path>` → identify the last battery round's boundary (a tag, a
     round commit, or the commit the prior report names) → `git diff <baseline>..HEAD -- <target-path>`.
     No boundary recorded? Use the prior report's date: `git log --since=<report-date> --oneline -- <target-path>`.
   - Non-git target: ask the conductor/owner for before/after copies and diff them yourself.
   - Neither available: **record `fix_audit: no-baseline` in `coverage_gaps.notes` and do not run
     the pass.** A fix-audit conducted from the fixer's summary of its own fix is worthless.
2. **Prior findings list.** The previous round's `findings[]`/`flags[]` JSON, the `.loop/` ledger,
   or the prior report. Build one table before striking:

   | prior item | claimed status (fixed / won't-fix / deferred / *absent*) | diff hunk that implements it |
   |---|---|---|

   Rows with `absent` or with an empty hunk column are **already axis D candidates** — you found
   them by construction, before reading a single line of the fix.

## The four axes

**A. Propagation — did the fix reach every sibling site, including higher-rank documents?**
Take the fixed claim/number/term and grep **every** occurrence across the whole target tree, not
just the file the diff touched. Rank the untouched hits: the dangerous ones are *upstream/higher*
than the fixed site (axiom or constitution layer, spec, the `description` frontmatter, README,
installed copies, downstream skills that quote it), because a fix that lands only in the low-rank
doc leaves the authoritative text stating the defect.
*finding* = you list the untouched sibling site(s) verbatim with locations; *flag* = you suspect
siblings but did not enumerate them.

**B. New defect / new inconsistency introduced by the fix.**
Read the diff's added lines as if they were fresh, never-reviewed text — because they are — and run
Coherence over them against their new neighbours (the added text now co-exists with rules it was
not checked against). Two specific shapes worth naming, both observed in R17:
- **Direction reversal**: the patch states the opposite of what the finding asked for (a bound
  loosened where it should have tightened; an obligation turned into a permission).
- **Scope creep**: the patch fixes the reported instance by widening a rule so far that it now
  licenses things the target elsewhere forbids.

**C. Wording camouflage vs substantive repair.**
The cheapest way to close a finding is to edit the sentence that named the defect. Test it:
**re-run the original reproduction steps verbatim against the fixed target.**
- Original repro still breaks ⇒ the fix is cosmetic ⇒ finding, severity = the original's.
- Repro no longer *runs* because the text it referenced was deleted or moved ⇒ ask where the
  mechanism went. Deleted claim with the mechanism untouched = relocation, not repair.
- Softened wording (`must` → `should`, a threshold turned into "as appropriate") that makes the
  original repro non-applicable rather than non-reproducing ⇒ finding.

**D. Silently skipped items.**
Every prior item not fixed must carry an explicit written adjudication *in the target's own record*
(won't-fix + reason, or deferred + where it is tracked). An item that simply vanished between the
prior report and this round is a process defect in its own right — report it as a finding against
the *process*, with the prior item id and the absence as the reproduction. This is H7 applied to
repair: the success metric ("N findings fixed") is meaningless without its integrity metric ("M
findings dropped without adjudication").

## Reporting

Labeling is unchanged — `references/prove-or-flag.md` governs, coverage-first, classify-don't-delete.
Emit fix-audit items with `lens: "fix-audit"` (schema enum) and keep the underlying lens named in
`claim` when it helps the repairer. Severity uses the same P1/P2/P3 bar; a cosmetic fix inherits the
severity of the defect it failed to repair.

**Escalation, not another swing.** If this pass lands P1s *inside the previous round's fixes*, that
is a stop-and-escalate signal for the repair side (E9 / H5 / the arms-race rule): report it plainly
and hand it to a human decision. Do not soften the finding to keep the fix→attack cycle running —
the attacker's job ends at the honest record.
