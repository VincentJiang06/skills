import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cliPath = path.resolve(import.meta.dirname, "..", "bin", "vince-mp.js");

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    input: options.input,
    encoding: "utf8",
  });
  const output = result.stdout || result.stderr;
  return {
    status: result.status,
    json: JSON.parse(output),
  };
}

test("doctor succeeds on a minimal project fixture without runtime side effects", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-cli-"));
  const project = path.join(root, "project");
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, "app.json"), "{\"pages\":[\"pages/index/index\"]}\n");
  fs.writeFileSync(path.join(project, "project.config.json"), "{\"appid\":\"touristappid\"}\n");

  const result = runCli(["doctor", "--project", project, "--workspace-root", root, "--json"]);

  assert.equal(result.status, 0);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.command, "doctor");
  assert.deepEqual(result.json.sideEffects, []);
});

test("documented common flags (--port, --no-session) are tolerated on non-session commands", () => {
  // capabilities does not connect; it must accept the universal flags without erroring.
  const cap = runCli(["capabilities", "--port", "9420", "--no-session", "--json"]);
  assert.equal(cap.status, 0);
  assert.equal(cap.json.command, "capabilities");

  // doctor likewise (on a minimal fixture).
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-cli-"));
  const project = path.join(root, "project");
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, "app.json"), "{\"pages\":[\"pages/index/index\"]}\n");
  fs.writeFileSync(path.join(project, "project.config.json"), "{\"appid\":\"touristappid\"}\n");
  const doc = runCli(["doctor", "--project", project, "--workspace-root", root, "--port", "9420", "--skip-typecheck", "--json"]);
  assert.equal(doc.status, 0);
  assert.equal(doc.json.checks.project.ok, true);
});

test("capabilities exposes element screenshot and explicit side-effect defaults", () => {
  const result = runCli(["capabilities", "--json"]);

  assert.equal(result.status, 0);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.command, "capabilities");
  assert.ok(result.json.commands.includes("run"));
  assert.ok(result.json.workflowSteps.includes("elementScreenshot"));
  assert.equal(result.json.safeDefaults.implicitFileWrites, false);
});

test("screenshot rejects output outside workspace before connecting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-cli-"));

  const result = runCli([
    "screenshot",
    "--connect",
    "{\"mode\":\"attach\",\"wsEndpoint\":\"ws://127.0.0.1:1\"}",
    "--output",
    "/tmp/outside.png",
    "--workspace-root",
    root,
    "--json",
  ]);

  assert.equal(result.status, 1);
  assert.equal(result.json.code, "PATH_OUTSIDE_WORKSPACE");
});

test("run rejects unsafe attach contract before connecting", () => {
  const result = runCli(["run", "--stdin", "--workspace-root", "/tmp", "--json"], {
    input: "{\"connect\":{\"mode\":\"attach\",\"wsEndpoint\":\"ws://127.0.0.1:1\",\"projectPath\":\"/tmp/nope\"},\"steps\":[]}",
  });

  assert.equal(result.status, 1);
  assert.equal(result.json.code, "UNSAFE_CONNECTION_MODE");
});

test("media camera-mock requires explicit fixture before connecting", () => {
  const result = runCli([
    "media",
    "--connect",
    "{\"mode\":\"attach\",\"wsEndpoint\":\"ws://127.0.0.1:1\"}",
    "--action",
    "camera-mock",
    "--workspace-root",
    "/tmp",
    "--json",
  ]);

  assert.equal(result.status, 1);
  assert.equal(result.json.code, "CAMERA_MOCK_REQUIRES_FIXTURE");
});
