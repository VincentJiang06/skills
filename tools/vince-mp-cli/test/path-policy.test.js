import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CliError } from "../src/errors.js";
import { resolveInsideWorkspace } from "../src/path-policy.js";

test("resolveInsideWorkspace rejects paths outside workspace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-root-"));
  const outside = path.join(os.tmpdir(), "outside-file.txt");

  assert.throws(
    () => resolveInsideWorkspace(outside, root, "output", { output: true }),
    (error) => error instanceof CliError && error.code === "PATH_OUTSIDE_WORKSPACE",
  );
});

test("resolveInsideWorkspace resolves relative output under workspace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-root-"));
  const resolved = resolveInsideWorkspace("shot.png", root, "output", { output: true });

  assert.equal(resolved, path.join(root, "shot.png"));
});
