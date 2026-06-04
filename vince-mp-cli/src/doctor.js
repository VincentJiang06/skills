import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", "miniprogram_npm", "dist", "build", "out", "coverage"]);
function skip(name) {
  return SKIP_DIRS.has(name) || name.startsWith(".");
}

function walkFiles(root, maxDepth, onFile) {
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length > 0) {
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < maxDepth && !skip(entry.name)) {
          stack.push({ dir: full, depth: depth + 1 });
        }
      } else if (entry.isFile()) {
        onFile(full);
      }
    }
  }
}

/**
 * Heuristic freshness check: a committed `.js` is stale if its `.ts` sibling was
 * edited more recently (the DevTools runs `.js`, so a newer `.ts` means a missing
 * rebuild). This is an mtime heuristic — `runTypecheck` is the authoritative compile
 * check; the two together catch the "green tests but broken/stale build" trap.
 */
export function findStaleTsJsPairs(appRoot, options = {}) {
  const maxDepth = options.maxDepth ?? 12;
  const tsFiles = [];
  walkFiles(appRoot, maxDepth, (file) => {
    if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      tsFiles.push(file);
    }
  });

  let checked = 0;
  const stale = [];
  for (const ts of tsFiles) {
    const js = `${ts.slice(0, -3)}.js`;
    if (!fs.existsSync(js)) {
      continue;
    }
    checked += 1;
    try {
      if (fs.statSync(ts).mtimeMs > fs.statSync(js).mtimeMs) {
        stale.push(ts);
      }
    } catch {
      // ignore unreadable pair
    }
  }
  return { checked, staleCount: stale.length, stale };
}

const DOMAIN_CANDIDATES = [
  ["config", "domain", "selected.ts"],
  ["config", "domain", "selected.js"],
  ["config", "domain", "selected.json"],
  ["config", "domain.ts"],
  ["config", "domain.js"],
];

/** Best-effort: surface the currently-selected backend domain so the user can spot a
 *  wrong/auto-rewritten target (project memory: build:devtools rewrites it to LAN IP). */
export function detectSelectedDomain(appRoot) {
  for (const parts of DOMAIN_CANDIDATES) {
    const file = path.join(appRoot, ...parts);
    if (fs.existsSync(file)) {
      let text = "";
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const urls = [...new Set((text.match(/https?:\/\/[^\s"'`)]+/g) ?? []))];
      return { found: true, file, urls };
    }
  }
  return { found: false };
}

export function localIpv4() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        out.push({ name, address: addr.address });
      }
    }
  }
  return out;
}

/** Run the project's local `tsc --noEmit`. Spawn is injectable for tests. */
export async function runTypecheck(projectRoot, options = {}) {
  const spawn = options.spawn ?? spawnSync;
  const tsconfig = path.join(projectRoot, "tsconfig.json");
  if (!fs.existsSync(tsconfig)) {
    return { ran: false, ok: null, reason: "no tsconfig.json at project root" };
  }
  const tscBin = path.join(projectRoot, "node_modules", ".bin", "tsc");
  if (!fs.existsSync(tscBin)) {
    return { ran: false, ok: null, reason: "tsc not installed (no node_modules/.bin/tsc)" };
  }
  const result = spawn(tscBin, ["--noEmit", "-p", tsconfig], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 120000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return {
    ran: true,
    ok: result.status === 0,
    exitCode: result.status ?? null,
    output: output.length > 4000 ? `${output.slice(0, 4000)}…` : output,
  };
}
