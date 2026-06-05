import assert from "node:assert/strict";
import test from "node:test";

import { getPageSnapshot, summarizeElement } from "../src/snapshot.js";

function el(tagName, props = {}) {
  return {
    tagName,
    text: async () => props.text ?? `${tagName}-text`,
    size: async () => ({ width: 10, height: 10 }),
    offset: async () => ({ left: 0, top: 0 }),
    ...props.overrides,
  };
}

test("summarizeElement collects text + position", async () => {
  const s = await summarizeElement(el("view"), "view_0", { includeText: true, includePosition: true });
  assert.equal(s.uid, "view_0");
  assert.equal(s.tagName, "view");
  assert.equal(s.text, "view-text");
  assert.deepEqual(s.size, { width: 10, height: 10 });
  assert.deepEqual(s.offset, { left: 0, top: 0 });
});

test("getPageSnapshot returns elements in order with stable uids", async () => {
  const elements = [el("view"), el("button"), el("text")];
  const page = { path: "pages/x/x", $$: async () => elements };
  const map = new Map();
  const r = await getPageSnapshot(page, map, { includeText: true });
  assert.equal(r.returnedCount, 3);
  assert.deepEqual(r.elements.map((e) => e.uid), ["view_0", "button_1", "text_2"]);
  assert.equal(r.elements[0].text, "view-text");
  assert.equal(map.size, 3);
});

test("a single failing property read is isolated as {unavailable}, not a whole-snapshot crash", async () => {
  const good = el("view");
  const bad = el("button", { overrides: { text: async () => { throw new Error("boom"); } } });
  const page = { path: "pages/x/x", $$: async () => [good, bad] };
  const map = new Map();
  const r = await getPageSnapshot(page, map, { includeText: true, propertyTimeoutMs: 200 });
  assert.equal(r.returnedCount, 2);
  assert.equal(r.elements[0].text, "view-text");
  assert.equal(r.elements[1].text.unavailable, true);
});
