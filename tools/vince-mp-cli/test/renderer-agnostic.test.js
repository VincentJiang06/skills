import assert from "node:assert/strict";
import test from "node:test";

import { CliError } from "../src/errors.js";
import { getPageSnapshot, queryElements, summarizeElement } from "../src/snapshot.js";

// WebView-renderer probe suite.
//
// The existing suite is written through a Skyline lens (see workflow.test.js
// "Skyline-style timeout"). This file asserts the SAME core commands behave
// correctly when the page is rendered by the *WebView* engine instead, using
// mocks that model the WebView side of automator:
//   - tagName arrives DOM-cased ("VIEW"), not glass-easel-cased
//   - nodes expose only the methods that node has — no Skyline-only niceties
//   - the universal '*' selector has three possible fates across renderers
// If the CLI were secretly Skyline-only, these would fail. Cases 1–4 pin the
// renderer-agnostic behaviour we rely on; case 5 is a RED probe on the one
// genuinely renderer-sensitive surface — snapshot's default '*' wildcard.

function webviewEl(tagName, props = {}) {
  // Upper-case tagName mirrors how a DOM-backed WebView reports nodes; only the
  // methods passed in exist, so a "bare" node has no size()/offset()/value().
  return {
    tagName,
    text: async () => props.text ?? `${tagName}-text`,
    ...props.overrides,
  };
}

// 1. Baseline: a concrete-selector snapshot of a WebView page works, and uids
//    normalise to lower-case despite DOM-cased tagNames.
test("[webview] snapshot with a concrete selector normalises DOM-cased tags into stable uids", async () => {
  const page = {
    path: "pages/home/home",
    $$: async (selector) => (selector === "view" ? [webviewEl("VIEW"), webviewEl("VIEW")] : []),
  };
  const map = new Map();
  const r = await getPageSnapshot(page, map, { selector: "view", includeText: true });
  assert.equal(r.returnedCount, 2);
  assert.deepEqual(r.elements.map((e) => e.uid), ["view_0", "view_1"]);
  assert.equal(map.size, 2);
});

// 2. A WebView node that lacks the Skyline-only size()/offset()/value() must be
//    summarised, not crash — position/value are simply omitted.
test("[webview] snapshot tolerates nodes missing size/offset/value (no Skyline-only methods)", async () => {
  const bare = webviewEl("text"); // only text()
  const page = { path: "p", $$: async () => [bare] };
  const r = await getPageSnapshot(page, new Map(), { includeText: true, includePosition: true, includeValue: true });
  assert.equal(r.returnedCount, 1);
  assert.equal(r.elements[0].text, "text-text");
  assert.ok(!("size" in r.elements[0]), "missing size() should be omitted, not errored");
  assert.ok(!("value" in r.elements[0]), "missing value() should be omitted, not errored");
});

// 3. A concrete-selector query reads value() from a WebView form input.
test("[webview] query reads value() from a WebView input element", async () => {
  const input = { tagName: "INPUT", text: async () => "", value: async () => "hello" };
  const page = { $: async () => input, $$: async () => [input] };
  const r = await queryElements(page, "input", new Map(), { includeValue: true });
  assert.equal(r.count, 1);
  assert.equal(r.elements[0].value, "hello");
});

// 4. '*' that the renderer *rejects* (throws) → an actionable enumeration error
//    that tells the user to pass a concrete selector. Already handled.
test("[webview] a rejected '*' wildcard yields an actionable enumeration error", async () => {
  const page = { path: "p", $$: async () => { throw new Error("selector '*' not supported by renderer"); } };
  await assert.rejects(
    () => getPageSnapshot(page, new Map(), {}), // default selector '*'
    (e) => e instanceof CliError
      && e.code === "SNAPSHOT_ELEMENT_ENUMERATION_FAILED"
      && (e.suggestions ?? []).some((s) => /concrete selector/i.test(s)),
  );
});

// 5. RED PROBE — '*' that the renderer *silently* answers with [] (no throw).
//    A debug CLI for WebView dev should not let the user mistake "wildcard
//    unsupported by this renderer" for "the page is genuinely empty". We expect
//    an empty default-'*' snapshot to carry a diagnostic hint. The current
//    implementation returns a bare {returnedCount:0} with no signal → this fails,
//    and that failure IS the answer to "does anything need to change?".
test("[webview] an empty '*' snapshot carries a wildcard-not-supported hint", async () => {
  const page = { path: "p", $$: async () => [] }; // '*' silently yields nothing
  const r = await getPageSnapshot(page, new Map(), {}); // default selector '*'
  assert.equal(r.returnedCount, 0);
  assert.ok(
    typeof r.hint === "string" && /(wildcard|\*|concrete selector)/i.test(r.hint),
    "an empty wildcard snapshot should hint that '*' may be unsupported by this renderer and to pass a concrete selector",
  );
});

// Guard: summarizeElement itself is renderer-neutral — a Skyline-only field
// request against a WebView node degrades gracefully rather than throwing.
test("[webview] summarizeElement omits position when the node has no size()/offset()", async () => {
  const s = await summarizeElement(webviewEl("BUTTON"), "button_0", { includeText: true, includePosition: true });
  assert.equal(s.tagName, "BUTTON");
  assert.equal(s.text, "BUTTON-text");
  assert.ok(!("size" in s) && !("offset" in s));
});
