import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CliError } from "../src/errors.js";
import { resolveProject } from "../src/project-resolve.js";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-pr-"));
}
function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

test("resolves miniprogramRoot subdir layout (app.json under miniprogram/)", () => {
  const root = tmp();
  write(path.join(root, "project.config.json"), JSON.stringify({ miniprogramRoot: "miniprogram/", appid: "wx123" }));
  write(path.join(root, "miniprogram", "app.json"), "{\"pages\":[\"pages/index/index\"]}");

  const r = resolveProject(root);
  assert.equal(r.source, "project.config.json");
  assert.equal(r.projectRoot, fs.realpathSync(root));
  assert.equal(r.appRoot, path.join(fs.realpathSync(root), "miniprogram"));
  assert.equal(r.appJsonPath, path.join(fs.realpathSync(root), "miniprogram", "app.json"));
  assert.equal(r.appId, "wx123");
});

test("resolves root layout (no miniprogramRoot, app.json at root)", () => {
  const root = tmp();
  write(path.join(root, "project.config.json"), JSON.stringify({ appid: "wxROOT" }));
  write(path.join(root, "app.json"), "{\"pages\":[]}");

  const r = resolveProject(root);
  assert.equal(r.source, "project.config.json");
  assert.equal(r.appRoot, fs.realpathSync(root));
  assert.equal(r.appId, "wxROOT");
});

test("falls back to app.json search when no project.config.json", () => {
  const root = tmp();
  write(path.join(root, "app.json"), "{\"pages\":[]}");

  const r = resolveProject(root);
  assert.equal(r.source, "app-json-search");
  assert.equal(r.appRoot, fs.realpathSync(root));
});

test("fallback search skips node_modules / .claude worktrees", () => {
  const root = tmp();
  // decoys that must be ignored
  write(path.join(root, "node_modules", "pkg", "app.json"), "{}");
  write(path.join(root, ".claude", "worktrees", "wt", "app.json"), "{}");
  // the real one, one level down
  write(path.join(root, "client", "app.json"), "{\"pages\":[]}");

  const r = resolveProject(root);
  assert.equal(r.source, "app-json-search");
  assert.equal(r.appRoot, path.join(fs.realpathSync(root), "client"));
});

test("clear error when miniprogramRoot points at a dir with no app.json", () => {
  const root = tmp();
  write(path.join(root, "project.config.json"), JSON.stringify({ miniprogramRoot: "src/" }));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  // no app.json under src/

  assert.throws(
    () => resolveProject(root),
    (e) => e instanceof CliError && e.code === "INVALID_PROJECT" && /app\.json/.test(e.message),
  );
});

test("PROJECT_NOT_FOUND when no app.json anywhere", () => {
  const root = tmp();
  write(path.join(root, "readme.md"), "nothing here");

  assert.throws(
    () => resolveProject(root),
    (e) => e instanceof CliError && e.code === "PROJECT_NOT_FOUND",
  );
});
