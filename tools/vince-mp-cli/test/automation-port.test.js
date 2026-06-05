import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";

import { ensureAutomationPort, isPortLive } from "../src/automation-port.js";
import { CliError } from "../src/errors.js";

test("isPortLive: true for a listening port, false once closed", async () => {
  const server = net.createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  assert.equal(await isPortLive("127.0.0.1", port, 500), true);
  await new Promise((r) => server.close(r));
  assert.equal(await isPortLive("127.0.0.1", port, 300), false);
});

test("ensureAutomationPort returns the live endpoint WITHOUT spawning (no port fight)", async () => {
  let spawned = 0;
  const r = await ensureAutomationPort({
    projectRoot: "/tmp/p",
    port: 9420,
    cliPath: "/bin/cli",
    probe: async () => true,
    spawn: () => { spawned += 1; return { pid: 1, unref() {} }; },
  });
  assert.equal(r.started, false);
  assert.equal(r.wsEndpoint, "ws://127.0.0.1:9420");
  assert.equal(spawned, 0);
});

test("ensureAutomationPort spawns `cli auto` and waits for liveness", async () => {
  const calls = [];
  let live = false;
  const r = await ensureAutomationPort({
    projectRoot: "/tmp/proj",
    port: 9420,
    cliPath: "/bin/cli",
    pollIntervalMs: 5,
    timeoutMs: 1000,
    probe: async () => live,
    spawn: (cmd, args) => {
      calls.push({ cmd, args });
      setTimeout(() => { live = true; }, 20);
      return { pid: 42, unref() {} };
    },
  });
  assert.equal(r.started, true);
  assert.equal(r.wsEndpoint, "ws://127.0.0.1:9420");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, "/bin/cli");
  assert.deepEqual(calls[0].args, ["auto", "--project", "/tmp/proj", "--auto-port", "9420"]);
});

test("ensureAutomationPort throws AUTOMATION_PORT_TIMEOUT when the port never comes up", async () => {
  await assert.rejects(
    () => ensureAutomationPort({
      projectRoot: "/tmp/proj",
      port: 9420,
      cliPath: "/bin/cli",
      pollIntervalMs: 5,
      timeoutMs: 40,
      probe: async () => false,
      spawn: () => ({ pid: 1, unref() {} }),
    }),
    (e) => e instanceof CliError && e.code === "AUTOMATION_PORT_TIMEOUT",
  );
});
