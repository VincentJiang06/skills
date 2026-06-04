import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { currentEnv, listEnvs, queryErrorLogs, setToken, useEnv } from "../src/backend.js";
import { CliError } from "../src/errors.js";

function withHome(fn) {
  const home = fs.mkdtempSync("/tmp/vmpcfg-");
  const prev = process.env.VINCE_MP_HOME;
  const prevToken = process.env.VINCE_MP_ADMIN_TOKEN;
  process.env.VINCE_MP_HOME = home;
  delete process.env.VINCE_MP_ADMIN_TOKEN;
  return Promise.resolve(fn()).finally(() => {
    if (prev === undefined) delete process.env.VINCE_MP_HOME; else process.env.VINCE_MP_HOME = prev;
    if (prevToken !== undefined) process.env.VINCE_MP_ADMIN_TOKEN = prevToken;
  });
}

test("env defaults to mockLan, use/current round-trips, unknown rejected", () => withHome(() => {
  assert.equal(listEnvs().selected, "mockLan");
  const used = useEnv("caoliaoDevNet");
  assert.match(used.base, /data\.cliim\.net/);
  assert.equal(currentEnv().key, "caoliaoDevNet");
  assert.throws(() => useEnv("nope"), (e) => e instanceof CliError && e.code === "UNKNOWN_ENV");
}));

test("queryErrorLogs builds Bearer POST to the selected env and unwraps {code,data}", () => withHome(async () => {
  useEnv("caoliaoDevNet");
  setToken("secret-123");
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return { ok: true, status: 200, text: async () => JSON.stringify({ code: 1, data: { total: 2, errors: [{ requestId: "rq-1" }, { requestId: "rq-1" }] } }) };
  };
  const out = await queryErrorLogs({ requestId: "rq-1", code: "500" }, { fetch: fakeFetch });
  assert.equal(captured.url, "https://data.cliim.net/x-deepscan/admin/error-logs/list");
  assert.equal(captured.init.headers.authorization, "Bearer secret-123");
  assert.deepEqual(JSON.parse(captured.init.body), { requestId: "rq-1", code: 500 });
  assert.equal(out.result.total, 2);
}));

test("queryErrorLogs without a token fails with ADMIN_TOKEN_REQUIRED", () => withHome(async () => {
  await assert.rejects(
    () => queryErrorLogs({ requestId: "x" }, { fetch: async () => ({ ok: true, status: 200, text: async () => "{}" }) }),
    (e) => e instanceof CliError && e.code === "ADMIN_TOKEN_REQUIRED",
  );
}));

test("queryErrorLogs maps an HTTP error to BACKEND_ERROR and a network throw to BACKEND_UNREACHABLE", () => withHome(async () => {
  setToken("t");
  await assert.rejects(
    () => queryErrorLogs({}, { fetch: async () => ({ ok: false, status: 500, text: async () => "boom" }) }),
    (e) => e instanceof CliError && e.code === "BACKEND_ERROR",
  );
  await assert.rejects(
    () => queryErrorLogs({}, { fetch: async () => { throw new Error("ECONNREFUSED"); } }),
    (e) => e instanceof CliError && e.code === "BACKEND_UNREACHABLE",
  );
}));
