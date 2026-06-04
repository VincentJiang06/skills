import { ensureSession, prepareConnect, requestSession } from "./client.js";
import { CliError } from "./errors.js";
import { parseJson, readStdin } from "./json.js";
import { resolveWorkspaceRoot } from "./path-policy.js";
import { runWorkflow } from "./workflow.js";

// Generous default so big page state (e.g. a scan page) is not silently truncated under ~6KB.
const BIG_JSON_BYTES = 200000;

// The daily-driver shorthands that build one workflow step and route it to the session.
export const STEP_SHORTHANDS = new Set([
  "page", "stack", "data", "sysinfo", "query", "snapshot",
  "tap", "input", "eval", "scan", "console", "shot", "nav", "step",
]);

export const STEP_OPTIONS = {
  "no-session": { type: "boolean" },
  connect: { type: "string" },
  port: { type: "string" },
  "cli-path": { type: "string" },
  "idle-timeout-ms": { type: "string" },
  all: { type: "boolean" },
  position: { type: "boolean" },
  "max-bytes": { type: "string" },
  "max-elements": { type: "string" },
  method: { type: "string" },
  type: { type: "string" },
  clear: { type: "boolean" },
  "page-size": { type: "string" },
  stdin: { type: "boolean" },
};

function routeOpts(args) {
  return {
    noSession: Boolean(args["no-session"]),
    connect: args.connect ? parseJson(args.connect, "connect") : undefined,
    port: args.port ? Number(args.port) : undefined,
    cliPath: args["cli-path"],
    idleTimeoutMs: args["idle-timeout-ms"] ? Number(args["idle-timeout-ms"]) : undefined,
  };
}

function num(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function requireArg(value, message) {
  if (!value) throw new CliError("INVALID_ARGUMENT", message);
  return value;
}

function buildStep(command, args, positionals) {
  switch (command) {
    case "page":
      return { type: "currentPage" };
    case "stack":
      return { type: "pageStack" };
    case "data":
      return { type: "pageData", path: positionals[0], maxJsonBytes: num(args["max-bytes"], BIG_JSON_BYTES) };
    case "sysinfo":
      return { type: "systemInfo", maxJsonBytes: BIG_JSON_BYTES };
    case "query":
      return {
        type: "query",
        selector: requireArg(positionals[0], "query requires a selector"),
        all: Boolean(args.all),
        includeText: true,
        includePosition: Boolean(args.position),
      };
    case "snapshot":
      return {
        type: "snapshot",
        selector: positionals[0],
        includeText: true,
        includePosition: Boolean(args.position),
        maxElements: num(args["max-elements"], undefined),
      };
    case "tap":
      return { type: "tap", uid: requireArg(positionals[0], "tap requires a uid") };
    case "input":
      return {
        type: "input",
        uid: requireArg(positionals[0], "input requires a uid"),
        text: positionals.slice(1).join(" "),
      };
    case "eval": {
      const expr = positionals.join(" ");
      requireArg(expr, "eval requires a JS expression");
      return { type: "evaluate", function: `function(){ return (${expr}); }`, maxJsonBytes: BIG_JSON_BYTES };
    }
    case "nav":
      return { type: "navigateTo", url: requireArg(positionals[0], "nav requires a url") };
    case "scan":
      return {
        type: "callPageMethod",
        method: args.method ?? "onScanCode",
        args: [{ result: requireArg(positionals[0], "scan requires a code"), scanType: args.type ?? "qrcode" }],
        maxJsonBytes: BIG_JSON_BYTES,
      };
    case "console":
      return args.clear
        ? { type: "clearConsole" }
        : { type: "listConsole", pageSize: num(args["page-size"], 50), types: args.type ? [args.type] : undefined };
    case "shot":
      return { type: "screenshot", output: requireArg(positionals[0], "shot requires an output path") };
    default:
      throw new CliError("UNSUPPORTED_COMMAND", `unknown step command: ${command}`);
  }
}

async function routeStep(workspaceRoot, stepOrSteps, opts) {
  const isBatch = Array.isArray(stepOrSteps);
  if (opts.noSession) {
    const prepared = await prepareConnect(workspaceRoot, opts);
    const steps = isBatch ? stepOrSteps : [stepOrSteps];
    const run = await runWorkflow({ connect: prepared.connect, steps, options: { continueOnError: opts.continueOnError } }, { workspaceRoot });
    if (isBatch) return { ok: run.ok, via: "one-shot", steps: run.steps };
    const s = run.steps[0];
    return s && s.ok
      ? { ok: true, via: "one-shot", result: s.result }
      : { ok: false, via: "one-shot", code: s?.code ?? "STEP_FAILED", message: s?.message ?? "step failed", details: s?.details ?? {}, suggestions: s?.suggestions ?? [] };
  }

  await ensureSession(workspaceRoot, opts);
  const resp = isBatch
    ? await requestSession(workspaceRoot, { op: "batch", steps: stepOrSteps, continueOnError: opts.continueOnError })
    : await requestSession(workspaceRoot, { op: "step", step: stepOrSteps });
  if (isBatch) return { ok: resp.ok, via: "session", steps: resp.steps };
  return resp.ok
    ? { ok: true, via: "session", result: resp.result }
    : { ok: false, via: "session", code: resp.code, message: resp.message, details: resp.details, suggestions: resp.suggestions ?? [] };
}

/** Named shorthand command (page/data/tap/scan/console/...). */
export async function commandStepShorthand(command, args, positionals = []) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const opts = routeOpts(args);
  if (command === "console" && opts.noSession) {
    throw new CliError("INVALID_ARGUMENT", "console needs a session (the buffer lives in the daemon); drop --no-session");
  }
  const step = buildStep(command, args, positionals);
  const routed = await routeStep(workspaceRoot, step, opts);
  return routed.ok
    ? { ok: true, command, via: routed.via, result: routed.result }
    : { ok: false, command, via: routed.via, code: routed.code, message: routed.message, details: routed.details, suggestions: routed.suggestions ?? [] };
}

/** Generic escape hatch: `step '<json>'` (a step object or an array → batch). */
export async function commandStepGeneric(args, positionals = []) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const opts = routeOpts(args);
  const raw = positionals[0] ?? (args.stdin ? await readStdin() : undefined);
  const parsed = parseJson(raw, "step");
  const routed = await routeStep(workspaceRoot, parsed, opts);
  return { ok: routed.ok, command: "step", via: routed.via, ...(Array.isArray(parsed) ? { steps: routed.steps } : routed.ok ? { result: routed.result } : { code: routed.code, message: routed.message, details: routed.details, suggestions: routed.suggestions ?? [] }) };
}
