import assert from "node:assert/strict";
import test from "node:test";

import { CliError } from "../src/errors.js";
import { validateMediaOptions } from "../src/media.js";

test("camera-mock validates fixture before any DevTools connection", () => {
  assert.throws(
    () => validateMediaOptions("camera-mock", {}, process.cwd()),
    (error) => error instanceof CliError && error.code === "CAMERA_MOCK_REQUIRES_FIXTURE",
  );
});

test("canvas actions require explicit canvasId", () => {
  assert.throws(
    () => validateMediaOptions("canvas-sample", {}, process.cwd()),
    (error) => error instanceof CliError && error.code === "INVALID_ARGUMENT",
  );
});
