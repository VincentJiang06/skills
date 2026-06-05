import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError } from "./errors.js";

// Named backend environments, grounded in the real deepscan domain map
// (miniprogram/config/domain/index.ts). `.net` is the real-device debug target.
const BUILTIN_ENVS = {
  mockLan: { label: "本地 mock / LAN", base: "http://172.16.0.239:8787/x-deepscan" },
  caoliaoDevNet: { label: "草料开发 .net (实机联调)", base: "https://data.cliim.net/x-deepscan" },
  caoliaoProdIm: { label: "草料正式 .im", base: "https://data.cli.im/x-deepscan" },
};
const DEFAULT_ENV = "mockLan";
const ADMIN_LOGS_PATH = "/admin/error-logs/list";

function vinceHome() {
  return process.env.VINCE_MP_HOME || path.join(os.homedir(), ".vince-mp");
}
function configPath() {
  return path.join(vinceHome(), "config.json");
}
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}
function writeConfig(config) {
  fs.mkdirSync(vinceHome(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

export function listEnvs() {
  const config = readConfig();
  const envs = { ...BUILTIN_ENVS, ...(config.envs ?? {}) };
  return { selected: config.env ?? DEFAULT_ENV, envs };
}

export function currentEnv() {
  const { selected, envs } = listEnvs();
  const env = envs[selected];
  if (!env) {
    throw new CliError("UNKNOWN_ENV", `selected env '${selected}' is not defined`, {
      details: { known: Object.keys(envs) },
    });
  }
  return { key: selected, ...env };
}

export function useEnv(key) {
  const { envs } = listEnvs();
  if (!envs[key]) {
    throw new CliError("UNKNOWN_ENV", `unknown env '${key}'`, {
      details: { known: Object.keys(envs) },
      suggestions: ["Run `vince-mp env list` to see valid keys."],
    });
  }
  const config = readConfig();
  config.env = key;
  writeConfig(config);
  return { key, ...envs[key] };
}

export function setToken(token) {
  const config = readConfig();
  config.adminToken = token;
  writeConfig(config);
  return { stored: true };
}

function resolveToken(options) {
  return options.token || process.env.VINCE_MP_ADMIN_TOKEN || readConfig().adminToken || null;
}

/**
 * Query the backend error-log store (the "线上实机 debug" surface) by filters such as
 * requestId / userId / code / route / since. POSTs to <env.base>/admin/error-logs/list with
 * `Authorization: Bearer <ADMIN_TOKEN>`. `fetch` is injectable for tests.
 */
export async function queryErrorLogs(filters = {}, options = {}) {
  const env = options.base ? { key: "custom", base: options.base } : currentEnv();
  const token = resolveToken(options);
  if (!token) {
    throw new CliError("ADMIN_TOKEN_REQUIRED", "no admin token configured", {
      suggestions: [
        "Set VINCE_MP_ADMIN_TOKEN=<token>, or run `vince-mp env token <token>`.",
      ],
    });
  }
  const base = env.base.replace(/\/$/, "");
  const url = `${base}${options.adminPath ?? ADMIN_LOGS_PATH}`;
  const fetchImpl = options.fetch ?? fetch;

  const body = {};
  for (const key of ["level", "userId", "requestId", "route", "since"]) {
    if (filters[key] != null && filters[key] !== "") body[key] = filters[key];
  }
  if (filters.code != null && filters.code !== "") body.code = Number(filters.code);
  if (filters.limit != null) body.limit = Number(filters.limit);
  if (filters.offset != null) body.offset = Number(filters.offset);

  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new CliError("BACKEND_UNREACHABLE", `cannot reach backend: ${error instanceof Error ? error.message : String(error)}`, {
      details: { url },
      suggestions: ["Check the selected env (`vince-mp env current`) and that the backend is deployed/reachable."],
    });
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new CliError("BACKEND_ERROR", `error-logs query failed: HTTP ${response.status}`, {
      details: { url, status: response.status, body: parsed },
    });
  }
  // Unwrap the {code,data} envelope if present.
  const data = parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
  return { env: env.key, url, filters: body, result: data };
}

export async function commandEnv(args, positionals = []) {
  const sub = positionals[0] ?? "current";
  switch (sub) {
    case "list":
      return { ok: true, command: "env", action: "list", ...listEnvs() };
    case "current":
      return { ok: true, command: "env", action: "current", current: currentEnv() };
    case "use":
      return { ok: true, command: "env", action: "use", current: useEnv(positionals[1]) };
    case "token":
      if (!positionals[1]) throw new CliError("INVALID_ARGUMENT", "env token requires a token value");
      setToken(positionals[1]);
      return { ok: true, command: "env", action: "token", stored: true };
    default:
      throw new CliError("INVALID_ARGUMENT", `unknown env subcommand: ${sub}`, {
        suggestions: ["Use: env list | current | use <key> | token <value>"],
      });
  }
}

export async function commandLogs(args) {
  const filters = {
    requestId: args["request-id"],
    userId: args["user-id"],
    code: args.code,
    route: args.route,
    since: args.since,
    level: args.level,
    limit: args.limit,
    offset: args.offset,
  };
  const out = await queryErrorLogs(filters, { base: args.base, token: args.token });
  return { ok: true, command: "logs", ...out };
}
