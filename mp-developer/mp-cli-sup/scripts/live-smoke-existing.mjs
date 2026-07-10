#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const cli = process.env.VINCE_MP_CLI_BIN || "vince-mp";

const { values } = parseArgs({
  options: {
    "ws-endpoint": { type: "string" },
    "workspace-root": { type: "string" },
    "probe-elements": { type: "boolean" },
  },
});

if (!values["ws-endpoint"]) {
  console.error("missing --ws-endpoint");
  process.exit(2);
}

const args = [
  "smoke-existing",
  "--ws-endpoint",
  values["ws-endpoint"],
  "--workspace-root",
  values["workspace-root"] || process.cwd(),
  "--json",
];

if (values["probe-elements"]) args.push("--probe-elements");

const result = spawnSync(cli, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
