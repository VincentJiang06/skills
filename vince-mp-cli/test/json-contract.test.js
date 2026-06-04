import assert from "node:assert/strict";
import test from "node:test";

import { CliError, toErrorResponse } from "../src/errors.js";
import { parseJson, truncateForJson } from "../src/json.js";

test("standard error response shape is stable", () => {
  const response = toErrorResponse(new CliError("PATH_OUTSIDE_WORKSPACE", "bad path", {
    details: { fieldName: "output" },
    suggestions: ["Use --workspace-root."],
  }));

  assert.deepEqual(Object.keys(response), ["ok", "code", "message", "details", "suggestions"]);
  assert.equal(response.ok, false);
  assert.equal(response.code, "PATH_OUTSIDE_WORKSPACE");
});

test("parseJson reports invalid JSON with standard code", () => {
  assert.throws(
    () => parseJson("{nope", "workflow"),
    (error) => error instanceof CliError && error.code === "INVALID_JSON",
  );
});

test("truncateForJson produces a JSON-safe preview for large values", () => {
  const result = truncateForJson({ value: "x".repeat(200) }, 20);
  assert.equal(result.truncated, true);
  assert.equal(typeof result.value.truncatedJsonPreview, "string");
});
