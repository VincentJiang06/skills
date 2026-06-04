import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getSession, sendToSock, sessionPaths } from "../src/client.js";
import { startSession } from "../src/daemon.js";

// Short /tmp paths keep us under the macOS 104-char unix-socket limit.
function tmpDir() {
  return fs.mkdtempSync("/tmp/vmp-");
}

function mockMiniProgram() {
  const element = { tagName: "view", taps: 0, tap: async () => { element.taps += 1; } };
  const page = {
    path: "pages/index/index",
    $: async () => element,
    data: async () => ({ hello: "world" }),
  };
  return { element, mp: { currentPage: async () => page } };
}

async function start(dir, connectImpl) {
  return startSession({
    sockPath: path.join(dir, "s.sock"),
    metaPath: path.join(dir, "s.json"),
    workspaceRoot: dir,
    idleTimeoutMs: 0,
    connectImpl,
  });
}

test("session connects ONCE, serves many requests, and keeps uids stable across them", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  const { element, mp } = mockMiniProgram();
  let connects = 0;
  const handle = await start(dir, async () => {
    connects += 1;
    return { miniProgram: mp, connection: { mode: "test" } };
  });
  try {
    const r1 = await sendToSock(sockPath, { op: "step", step: { type: "currentPage" } });
    assert.equal(r1.ok, true);
    assert.equal(r1.result.path, "pages/index/index");

    // Separate connection mints a uid...
    const r2 = await sendToSock(sockPath, { op: "step", step: { type: "query", selector: ".btn" } });
    assert.equal(r2.ok, true);
    const uid = r2.result.elements[0].uid;
    assert.ok(uid);

    // ...and a THIRD separate connection can still act on it — proves the elementMap
    // (uids) survives across independent CLI invocations. This is the headline win.
    const r3 = await sendToSock(sockPath, { op: "step", step: { type: "tap", uid } });
    assert.equal(r3.ok, true);
    assert.equal(element.taps, 1);

    const st = await sendToSock(sockPath, { op: "status" });
    assert.equal(st.ok, true);
    assert.ok(st.uidCount >= 1);

    // The automation connection was opened exactly once for all four requests.
    assert.equal(connects, 1);
  } finally {
    await handle.close("test");
  }
});

test("session batch runs steps sequentially sharing one context", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  const { element, mp } = mockMiniProgram();
  const handle = await start(dir, async () => ({ miniProgram: mp, connection: {} }));
  try {
    const resp = await sendToSock(sockPath, {
      op: "batch",
      steps: [
        { type: "query", selector: ".btn" },
        { type: "tap", uid: "view_0" },
      ],
    });
    assert.equal(resp.ok, true);
    assert.equal(resp.steps.length, 2);
    assert.equal(resp.steps[1].ok, true);
    assert.equal(element.taps, 1);
  } finally {
    await handle.close("test");
  }
});

test("session unknown op returns a structured error", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  const { mp } = mockMiniProgram();
  const handle = await start(dir, async () => ({ miniProgram: mp, connection: {} }));
  try {
    const resp = await sendToSock(sockPath, { op: "frobnicate" });
    assert.equal(resp.ok, false);
    assert.equal(resp.code, "UNKNOWN_OP");
  } finally {
    await handle.close("test");
  }
});

test("session shutdown op stops the server and removes the socket", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  const { mp } = mockMiniProgram();
  await start(dir, async () => ({ miniProgram: mp, connection: {} }));
  const resp = await sendToSock(sockPath, { op: "shutdown" });
  assert.equal(resp.ok, true);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(fs.existsSync(sockPath), false);
});

test("session auto-reconnects on a transport error and retries the step", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  let gen = 0;
  const handle = await start(dir, async () => {
    gen += 1;
    const dead = gen === 1; // first connection is broken, reconnect yields a live one
    return {
      miniProgram: {
        currentPage: async () => {
          if (dead) throw new Error("WebSocket is not open");
          return { path: "pages/index/index" };
        },
      },
      connection: { gen },
    };
  });
  try {
    const r = await sendToSock(sockPath, { op: "step", step: { type: "currentPage" } });
    assert.equal(r.ok, true);
    assert.equal(r.result.path, "pages/index/index");
    const st = await sendToSock(sockPath, { op: "status" });
    assert.equal(st.reconnects, 1);
    assert.equal(gen, 2);
  } finally {
    await handle.close("test");
  }
});

test("explicit reconnect op swaps in a fresh connection", async () => {
  const dir = tmpDir();
  const sockPath = path.join(dir, "s.sock");
  let gen = 0;
  const { mp } = mockMiniProgram();
  const handle = await start(dir, async () => { gen += 1; return { miniProgram: mp, connection: { gen } }; });
  try {
    const r = await sendToSock(sockPath, { op: "reconnect" });
    assert.equal(r.ok, true);
    assert.equal(r.reconnects, 1);
    assert.equal(gen, 2);
  } finally {
    await handle.close("test");
  }
});

test("getSession cleans up a stale socket/meta and returns null", async () => {
  const home = tmpDir();
  process.env.VINCE_MP_HOME = home;
  try {
    const ws = tmpDir();
    const { dir, sockPath, metaPath } = sessionPaths(ws);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify({ pid: 999999, sockPath }));
    fs.writeFileSync(sockPath, ""); // a regular file, not a live socket

    const result = await getSession(ws);
    assert.equal(result, null);
    assert.equal(fs.existsSync(metaPath), false);
    assert.equal(fs.existsSync(sockPath), false);
  } finally {
    delete process.env.VINCE_MP_HOME;
  }
});
