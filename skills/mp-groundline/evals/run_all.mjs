#!/usr/bin/env node
// Re-runnable eval harness for mp-groundline.
//
// Imports the MECHANISM from ../scripts (scan + the MIGRATION-MAP generator) —
// it does NOT reimplement either. Runs every labeled case in cases.mjs, prints
// one `PASS <id>` / `FAIL <id> — reason` line each (PASS/FAIL at line start),
// and exits 0 iff all pass (1 otherwise). The conductor re-runs this file.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

import { scan } from "../scripts/scan.mjs";
import { generate } from "../scripts/gen_migration_map.mjs";
import { cases, FIXTURES } from "./cases.mjs";

function run() {
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const root = path.join(FIXTURES, c.fixture);
    const ctx = c.kind === "gen" ? { scan, generate, root } : { scan, root };
    try {
      c.assert(ctx);
      console.log(`PASS ${c.id}`);
      passed++;
    } catch (err) {
      const reason = (err && err.message ? err.message : String(err)).split("\n")[0];
      console.log(`FAIL ${c.id} — ${reason}`);
      failed++;
    }
  }

  console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

const isMain = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] || "");
  } catch {
    return false;
  }
})();

if (isMain) {
  process.exit(run());
}

export { run };
