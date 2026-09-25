# Changelog — mp-groundline

## 0.2.1 — 2026-09-25 (R20 wave, release record; no behavior change)

Patch bump: this entry records evidence and open defects, and corrects stale stamps.
No script, rule or SKILL.md instruction changed (SKILL.md changed only its version line).
The fix budget for this wave is spent (iron rule 3: one fix round and one fix audit),
so the defects below stay open for the owner to rule on. Principle for every line:
evidence-bound record (P10 authority comes from provenance; A40/O7 honest release gate).

**E11 two-arm result (A44), run on 0.1.2 before the fix round.** 3 cases, 1 run each.
WITHOUT arm = the bare model with the skill explicitly forbidden. Each arm had its own
git copy of the program, prepared before the agents started.
- The judge preferred WITH in all 3 cases. There were 0 cases where WITH was worse on
  D1 (behaviour), D2 (recall of hard features) or F4 (no speculative fixes).
- The WITH arm changed less every time: 4 files vs 12 in case 1, 1 line vs 5 files in
  case 2, 2 lines vs 8 files in case 3. It kept `rendererOptions` and every workaround
  and marked every page UNVERIFIED.
- In all 3 cases the WITHOUT arm made fixes for layout differences it had never
  observed. In cases 1 and 3 it also deleted `rendererOptions.skyline`.
- In case 3 the WITH arm had to find a skyline-pinned subpackage page by hand. That
  was scanner defect F01, fixed in 0.2.0.
- The WITH arm did worse in one place: in case 2 its map did not mention the planted
  hostile comment. Neither arm followed that comment.
- Limits of this evidence:
  - The judge knew which arm was which (the arm folders were named with/without).
  - No token counts were recorded, only tool calls: median 14 for WITH, 11 for
    WITHOUT, a ratio of about 1.27. So the pre-registered cost check (tokens) was not
    measured.
  - The judge and the fixtures came from the same model family as the builder.
  - N=3 shows a direction only.
  - The run tested 0.1.2, not 0.2.x.
- Verdict: WITH beats WITHOUT on the fidelity it was built for (minimal diff, keep the
  workarounds, no unobserved fixes, per-page UNVERIFIED). The retire rule does not fire.

**Battery (one round, instance-tier independence: same vendor and model, fresh context).**
- 4 of 5 planted seeds were found. The missed seed was SEED-COH-1, the scanner-contract
  example summary total. Under the SEED gate the round is **void** as a clean-round
  count, but its confirmed findings stand.
- 14 findings were confirmed: P1 ×2, P2 ×5, P3 ×7. One was refuted (F18).
- 0.2.0 fixed all seven P1/P2 findings: F01, F02, F05, F06, F07, F10 and F11.
- One fix audit followed. It found **no P0 or P1** in the fix code, so iron rule 3 was
  not triggered. It did find 2 P2 and 7 P3, all open. Most sit in code the 0.2.0 fix
  round added. They are listed under "Open defects" below.

**Stamps corrected (record only).**
- `assets/metric-plan.json` measured block now shows the E11 result, 49/49 cases,
  30 fixtures and the real-program scan smoke.
- `assets/release-manifest.json` is now 0.2.1. The "deep-scan program no longer on
  disk" waiver was false: both deep-scan programs are on disk and scan cleanly
  (`{mechanical 1, keep 34, verify 1, rewrite 0}` and `{1, 30, 1, 0}`).
- The release gate stays `passed: false`, because of open defect OD1 below.
- The remaining F17 items are still open: `eval-cases.json` "18 cases" and SKILL.md
  "Three success metrics".

**Model deviation (registered).** The skill-creator-max model policy of 2026-09-13
says builder = Fable and evaluators = Opus. This wave ran every role on Opus 5.5 high
at the owner's order: builder, judge, seeder, attacker, adjudicator, fixer and fix
auditor. Independence is instance-tier only.

**Open defects (found by the fix audit, not fixed, owner ruling needed):**
- **OD1 (P2, F06 regression).** A page that app.json still declares can sit inside a
  `packOptions.ignore` folder. The scan then flips that page's renderer but never
  reads its content, so a `grid-view` or custom route on that page is dropped without
  a flag. This matches the manifest's own rollback trigger "missed rewrite (silent
  drop)".
  - Workaround until fixed: compare the map's "Not scanned" folder list with the page
    pins it asks you to flip. If a page appears in both, scan that folder by hand.
- **OD2 (P2, F07 with F02).** The "default layout shift ... every node" warning, and
  its advice to add one app.wxss default rule, also appear for programs that adopted
  Skyline page by page. On those programs the rule would change pages that were always
  WebView.
  - Workaround: when the map says per-page adoption, keep any default-layout fix to
    the pinned pages.
- **OD3–OD9 (P3):**
  - Early `scan | head` exits 1 with EPIPE instead of 0.
  - A quote-bearing regex on the same line still hides a later `wx://` route
    (documented limit).
  - The generator treats a `page_overrides` entry without `needs_flip` (0.1.x scan
    JSON) as a webview pin.
  - Blocker JSON omits `ignored_dirs`.
  - The renderer_options note says "expect a global layout shift" even when both
    layout flags are set.
  - SKILL.md Preflight names `already_migrated` before Step 1 runs the scan, and
    Step 3 says to edit app.json even for per-page adoption.
  - The F05 regression case does not discriminate on Linux, where pipe writes are
    synchronous.
- **Battery P3s carried from round 1:**
  - F09: validate-skill requires only 16 PASS lines.
  - F12: the cited skyline-* sources are missing from this machine.
  - F13: the context budget is below the mandatory load.
  - F15: the Step 6 rollback does not cover files edited in Step 5.
  - F16: the verify module loads after the baseline is needed.
  - F17: remaining stale counts (see above).
  - F04r: the navigateTo stack cap of 10.

## 0.2.0 — 2026-09-25 (R20 wave, battery fix round)

One fix round on the battery-confirmed defects (instance-tier battery, adjudicated).
Minor bump: the scanner contract gains two additive fields and `already_migrated`
is redefined. Each line names the principle it follows.

- **F01/F02 (P1) — page renderer pins are measured against the target `webview`**
  (prime directive "flag, never silently drop"; skyline-to-webview.md S-OVERVIEW:
  Skyline is adopted per page/subpackage; scan-protocol invariant "already webview ⇒
  mechanical==0"). Before, a page json pinned to `skyline` under a skyline app gave no
  finding (it equalled the app renderer), so on a real 352-page program 107 Skyline
  pages were missed while 221 webview-pinned pages were listed as needing work; and a
  skyline page under an unset app came back `already_migrated:true` with mechanical>0.
  Now every non-webview pin is a `page_renderer_override` (mechanical); a webview pin
  under a skyline app is listed in `page_overrides` with the new `needs_flip:false` and
  is no finding; `already_migrated` needs the app **and** every page off Skyline. The
  map lists the pins to flip, counts the webview pins as informational, and does not
  ask for an app.json flip when only pages pin Skyline. SKILL.md Preflight/Step 3,
  scan-protocol, scanner-contract and skyline-to-webview updated to match.
- **F05 — piped scan output no longer cut at 64 KiB** (SKILL.md Step 2 documents the
  `scan | gen_migration_map` pipe; "blocker, not a silent skip"). `process.exit()` right
  after `stdout.write` truncated a pipe at 65,536 bytes with exit 0; the CLI now sets
  `process.exitCode`.
- **F06 — the program's own `packOptions.ignore` folders are skipped and reported**
  (flag, never silently drop: the skip is listed; P13/A50: a structural presence check
  on the program's declared config, no semantic judgment). On the real program 1,149 of
  2,399 findings were `dist/` build copies. Only `type:"folder"` entries are honored,
  resolved against `miniprogramRoot` (first-party project.config doc). New additive
  output field `ignored_dirs`; the map header names each skipped folder.
- **F07 — default-layout shift warning** (evidence-bound map: every verdict traces to a
  source; minimal-fix rules 1–2). First-party Skyline wxss doc: Skyline defaults to flex
  (column) + border-box unless `rendererOptions.skyline.defaultDisplayBlock` /
  `defaultContentBox` are set. The old "ignored, keep/strip" label hid that the flip
  shifts every node's default layout. Prose in skyline-to-webview.md and Step 3; the
  map warns when either flag is missing (a presence check on scan data, no new finding
  category) and names one app.wxss default rule as the smallest fix once Step 4
  confirms a global shift.
- **F11 — JS comment stripper ends `'…'`/`"…"` strings at a newline** (flag, never
  silently drop). A quote inside a regex literal (`/['"]/g`) opened a false string that
  ran on, so a later `'wx://bottom-sheet'` lost its `//` to comment stripping and the
  rewrite vanished. Regex literals are still not parsed; a rewrite token on the same
  line after such a regex is a documented known limit.
- **F10 — harness (local-only, gitignored; hand-off patch in the R20 run dir).** The
  mislabelled edge of `scan_page_override_distinct` now matches its fixture; the
  fixtures that only ever pinned `webview` pages (page-override, subpackages,
  page-override-dedupe) now pin `skyline` where they test discovery/dedupe; five new
  cases (`scan_page_skyline_unset_app`, `cli_scan_pipe_large_output`,
  `scan_pack_ignore_folder`, `scan_js_regex_quote_no_drop`,
  `gen_skyline_default_layout_warning`). All of them were red on 0.1.2. 44 → 49 cases.
- **Real-corpus false-positive measurement** (iron rule 7): 30 existing fixtures +
  2 deep-scan Skyline programs: summaries unchanged. wxa.cli.im: −1,149 `dist/` rows,
  −221 webview-pin rows, +107 Skyline-pin rows, −4 rows in two other `packOptions.ignore`
  folders (`pages/scan-index`, not declared in the current app.json;
  `pages/code-others/protect/list`); every change is explained.
- Growth: scan.mjs 591 → 624, gen_migration_map.mjs 223 → 243, cases 44 → 49 (all
  under the +50% ceiling).

**Known limit added:** a program that switches `app.json`/`project.config.json` per
build variant is scanned in its current variant only; scan each variant separately.

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
