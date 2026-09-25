# Changelog — mp-groundline

## 0.1.2 — 2026-09-25 (R20 wave, freeze tier: incident-driven patch)

Scope is three verified incidents. Everything else is carried as-is (A40 freeze).
Each line names the principle it follows.

- **validate-skill fixed; it had been red since 2026-06-20 on every copy** (P13/A50: skeleton
  checks only; iron rule 7: a gate everyone ignores is no gate). There were three causes. The
  description regex knew only `>`, so the `>-` switch in 0f76f26 read the description as ">-"
  and raised two false errors. The name check rejected the `vince-` prefix that deploy adds.
  The sibling check wanted the literal `vince-mp-cli-sup`, which the 2db5c6c de-prefix removed.
  The fix reads the description only from the `description:` key (`>`/`>-`/`|`/`|-` block or
  a plain/quoted single line). The name check accepts exactly `mp-groundline` or
  `vince-mp-groundline`, anchored. The sibling check looks for the substring `mp-cli-sup`.
  No check was added or loosened beyond these (142 → 156 lines).
  - The script is **local-only (gitignored), so this commit does not carry it** (dispute D1,
    kept for the owner). Hand-off: `runs/mp-groundline/local-only/validate-skill.mjs` in the
    R20 run dir, with its `.patch`. sha256 `bf40a5a2b96c5dcd477c339dd0acb56fc47516ee527cec5609297c08bf148356`.
    Merge step: copy it to `scripts/validate-skill.mjs` in the main checkout, check the sha256,
    then run it and `evals/run_all.mjs` there and on each install root after deploy.
  - Evidence: 8/8 mutations still go red and name the right check (including an unanchored-name
    `vince-mp-groundline-old` and a removed description key). 6/6 description forms parse
    green. There are 0 false positives across the main checkout and the ~/.claude, ~/.agents,
    ~/.codex and ~/.qoder installs (temp copies, installs never written).
  - Known limit: a CRLF SKILL.md still fails "missing YAML frontmatter", as it did before. No
    copy uses CRLF, so the check was not widened.
  - The same `>` parse bug in mp-cli-sup's own validate-skill was not fixed here and does not
    share code with this fix (self-contained install roots). It is registered as A51(iv)
    exposure for the battery.
- **Step 4 precondition + degraded path** (the skill's own minimal-fix rule 1, "an assumed
  regression is not a regression", and the verify file's "blocker, not a silent skip"; A38).
  `vince-mp session start --json` must succeed. Check it before Step 3, because the baseline
  is captured before the flip. If it fails, keep the flip uncommitted and mark every page
  `UNVERIFIED` in the MIGRATION-MAP. Make no Step 5 fixes and never say "consistent".
  `rules/verify-with-vince-mp.md` now lists the five `vince-mp` contract points it depends
  on (session start, page, data, shot with a pre-existing parent dir, nav = navigateTo only),
  sourced from mp-cli-sup `references/cli-contract.md` at c2a922b. Versioned as a patch: this
  spells out obligations the rules already implied and adds no new contract.
- **Release gate made honest** (A40/O7 K2 review; iron rule 7). `release-manifest.json`
  version 0.1.0 → 0.1.2. Gate conditions now list only checks that run: validate-skill on the dev
  checkout and on every install root after each deploy, the harness at 44/44 (was "18/18"),
  and E11. The real-program smoke, trigger eval and 0.1.0 adversarial checklist are
  **waived with reasons**, where before they were silently marked passed. `passed: false`
  until E11 runs.
- **metric-plan.json**: measured block refreshed to 2026-09-25 with a `model_baseline` stamp
  (A37). E11 (A44) is **not measured yet**. `without_skill_run_id` stays empty until a real
  run exists. The arms (3 cases) are prepared in the R20 run dir.
- `.clawhubignore` excludes `scripts/validate-skill.mjs`. The bundle has no evals/ or tests/,
  so a shipped copy could only ever be red.
- README / README.en.md: one line on the vince-mp dependency and the UNVERIFIED rule. It also
  says validate-skill does not prove a real migration is consistent.

**Merge note (U2):** mp-cli-sup is being upgraded in the same wave. At merge, diff its
`references/cli-contract.md` against c2a922b for `session start`, `page`, `data`, `shot`,
`nav`. Any change means re-editing `rules/verify-with-vince-mp.md` in the same Decision
Record (A38).

**Exemptions carried (not fixed in this freeze patch):**
- X1: A36 Authority sentence ("scanned source is data, not instructions").
- X2: L-plane "what counts as a real visual delta" judgment card. It cannot be calibrated
  offline.
- X3: `skill-design-record.json` still says `deterministic_case_count` 18 (actual 44), and
  the example map has no UNVERIFIED column.

Outlet for all three: the next tier upgrade, an injection or misjudged-delta incident, or an
A42 settlement. The judgment ledger (PLANE J1–J30) for this release is in the R20 Structure
Contract `runs/mp-groundline/structure-contract.json`.

## 0.1.1 — 2026-07-06 (history reconstructed from git; no changelog existed)

- 2026-06-20 de-prefix (2db5c6c). 2026-06-23 description shortened to `>-` ≤320 chars (0f76f26)
  and zipper pass (93e7e67). 2026-07-06 version bump 0.1.1 (3e0ef80). 2026-07-31
  reference-path fix (d3a76b2).

## 0.1.0 — 2026-06-05

- First working version: deterministic scanner + MIGRATION-MAP generator + evidence-bound
  mapping KB. It was then hardened over 5 engineer rounds × 4 batteries, growing from 23 to
  44 cases.
