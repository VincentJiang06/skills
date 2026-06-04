import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PNG } from "pngjs";

import { CliError } from "../src/errors.js";
import { executeStep } from "../src/workflow.js";

function writeGradientPng(filePath, width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      png.data[offset] = x % 256;
      png.data[offset + 1] = y % 256;
      png.data[offset + 2] = 123;
      png.data[offset + 3] = 255;
    }
  }
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

test("snapshot step returns bounded Skyline-style timeout", async () => {
  const context = {
    miniProgram: {
      currentPage: async () => ({
        path: "pages/index/index",
        $$: () => new Promise(() => undefined),
      }),
    },
    currentPage: null,
    elementMap: new Map(),
    workspaceRoot: process.cwd(),
  };

  await assert.rejects(
    () => executeStep(context, { type: "snapshot", timeoutMs: 20 }, 0),
    (error) => error instanceof CliError && error.code === "SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT",
  );
});

test("callWxMethod rejects unsafe methods unless explicit", async () => {
  const context = {
    miniProgram: {
      callWxMethod: async () => "ok",
    },
    currentPage: null,
    elementMap: new Map(),
    workspaceRoot: process.cwd(),
  };

  await assert.rejects(
    () => executeStep(context, { type: "callWxMethod", method: "setStorage", args: [] }, 0),
    (error) => error instanceof CliError && error.code === "UNSAFE_WX_METHOD",
  );

  const result = await executeStep(context, {
    type: "callWxMethod",
    method: "setStorage",
    allowUnsafe: true,
    args: [],
  }, 0);
  assert.equal(result.value, "ok");
});

test("elementScreenshot crops one queried element from the full screenshot", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-cli-"));
  fs.mkdirSync(path.join(workspaceRoot, "captures"));
  const output = "captures/element.png";
  const element = {
    tagName: "view",
    offset: async () => ({ left: 10, top: 20 }),
    size: async () => ({ width: 30, height: 10 }),
  };
  const context = {
    miniProgram: {
      screenshot: async ({ path: screenshotPath }) => writeGradientPng(screenshotPath, 200, 200),
      systemInfo: async () => ({ windowWidth: 100, windowHeight: 100, pixelRatio: 2 }),
    },
    currentPage: null,
    elementMap: new Map([["view_0", element]]),
    workspaceRoot,
  };

  const result = await executeStep(context, { type: "elementScreenshot", uid: "view_0", output }, 0);
  const cropped = PNG.sync.read(fs.readFileSync(path.join(workspaceRoot, output)));

  assert.equal(result.output, path.join(workspaceRoot, output));
  assert.deepEqual(result.crop, { x: 20, y: 40, width: 60, height: 20 });
  assert.equal(cropped.width, 60);
  assert.equal(cropped.height, 20);
  assert.equal(cropped.data[0], 20);
  assert.equal(cropped.data[1], 40);
});

test("elementScreenshot keeps output inside workspace", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vince-mp-cli-"));
  const context = {
    miniProgram: {
      screenshot: async () => undefined,
      systemInfo: async () => ({ windowWidth: 100, windowHeight: 100 }),
    },
    currentPage: null,
    elementMap: new Map([["view_0", {
      offset: async () => ({ left: 0, top: 0 }),
      size: async () => ({ width: 10, height: 10 }),
    }]]),
    workspaceRoot,
  };

  await assert.rejects(
    () => executeStep(context, { type: "elementScreenshot", uid: "view_0", output: "/tmp/outside.png" }, 0),
    (error) => error instanceof CliError && error.code === "PATH_OUTSIDE_WORKSPACE",
  );
});

test("storageClear requires explicit confirmation", async () => {
  const context = {
    miniProgram: {
      callWxMethod: async () => undefined,
    },
    currentPage: null,
    elementMap: new Map(),
    workspaceRoot: process.cwd(),
  };

  await assert.rejects(
    () => executeStep(context, { type: "storageClear" }, 0),
    (error) => error instanceof CliError && error.code === "STORAGE_CLEAR_REQUIRES_CONFIRMATION",
  );
});
