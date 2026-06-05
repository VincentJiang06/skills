import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectSelectedDomain, findStaleTsJsPairs, localIpv4, runTypecheck } from "../src/doctor.js";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-doc-"));
}
function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function setMtime(p, epochSec) {
  fs.utimesSync(p, epochSec, epochSec);
}

test("findStaleTsJsPairs flags .ts newer than its .js sibling", () => {
  const root = tmp();
  // stale: a.ts edited after a.js was built
  write(path.join(root, "a.js"), "//");
  write(path.join(root, "a.ts"), "//");
  setMtime(path.join(root, "a.js"), 1000);
  setMtime(path.join(root, "a.ts"), 2000);
  // fresh: b.js newer than b.ts
  write(path.join(root, "b.ts"), "//");
  write(path.join(root, "b.js"), "//");
  setMtime(path.join(root, "b.ts"), 1000);
  setMtime(path.join(root, "b.js"), 2000);
  // .ts with no sibling .js is not a pair
  write(path.join(root, "c.ts"), "//");
  // node_modules must be skipped
  write(path.join(root, "node_modules", "x.ts"), "//");
  write(path.join(root, "node_modules", "x.js"), "//");
  setMtime(path.join(root, "node_modules", "x.ts"), 2000);
  setMtime(path.join(root, "node_modules", "x.js"), 1000);

  const r = findStaleTsJsPairs(root);
  assert.equal(r.checked, 2); // a + b pairs (c has no js, node_modules skipped)
  assert.equal(r.staleCount, 1);
  assert.equal(r.stale.length, 1);
  assert.ok(r.stale[0].endsWith("a.ts"));
});

test("detectSelectedDomain extracts the URL from config/domain/selected", () => {
  const appRoot = tmp();
  write(
    path.join(appRoot, "config", "domain", "selected.ts"),
    "export const selected = { base: \"https://data.cliim.net/x-deepscan\" };\n",
  );
  const r = detectSelectedDomain(appRoot);
  assert.equal(r.found, true);
  assert.ok(r.file.endsWith(path.join("config", "domain", "selected.ts")));
  assert.ok(r.urls.includes("https://data.cliim.net/x-deepscan"));
});

test("detectSelectedDomain returns found:false when absent", () => {
  const appRoot = tmp();
  const r = detectSelectedDomain(appRoot);
  assert.equal(r.found, false);
});

test("localIpv4 returns an array of {name,address}", () => {
  const r = localIpv4();
  assert.ok(Array.isArray(r));
  for (const e of r) {
    assert.equal(typeof e.address, "string");
    assert.equal(typeof e.name, "string");
  }
});

test("runTypecheck reports ran:false when no tsconfig", async () => {
  const root = tmp();
  const r = await runTypecheck(root, { spawn: () => ({ status: 0, stdout: "" }) });
  assert.equal(r.ran, false);
  assert.match(r.reason, /tsconfig/);
});

test("runTypecheck reports ok:true on exit 0 and ok:false on nonzero", async () => {
  const root = tmp();
  write(path.join(root, "tsconfig.json"), "{}");
  write(path.join(root, "node_modules", ".bin", "tsc"), "#!/bin/sh\n");

  const pass = await runTypecheck(root, { spawn: () => ({ status: 0, stdout: "" }) });
  assert.equal(pass.ran, true);
  assert.equal(pass.ok, true);

  const fail = await runTypecheck(root, { spawn: () => ({ status: 2, stdout: "x.ts(1,1): error TS1005" }) });
  assert.equal(fail.ran, true);
  assert.equal(fail.ok, false);
  assert.match(fail.output, /error TS1005/);
});
