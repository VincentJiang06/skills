import assert from "node:assert/strict";
import test from "node:test";

import { parseConnectConfig } from "../src/automator-client.js";
import { CliError } from "../src/errors.js";

test("attach connection allows only wsEndpoint", () => {
  assert.deepEqual(parseConnectConfig({
    mode: "attach",
    wsEndpoint: "ws://127.0.0.1:9420",
  }), {
    mode: "attach",
    wsEndpoint: "ws://127.0.0.1:9420",
  });

  assert.throws(
    () => parseConnectConfig({
      mode: "attach",
      wsEndpoint: "ws://127.0.0.1:9420",
      projectPath: "/tmp/project",
    }),
    (error) => error instanceof CliError && error.code === "UNSAFE_CONNECTION_MODE",
  );
});

test("launch connection requires projectPath", () => {
  assert.throws(
    () => parseConnectConfig({ mode: "launch" }),
    (error) => error instanceof CliError && error.code === "INVALID_ARGUMENT",
  );
});
