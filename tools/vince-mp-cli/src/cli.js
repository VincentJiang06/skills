import { parseArgs } from "node:util";

import { commandEnv, commandLogs } from "./backend.js";
import { commandCapabilities, commandDoctor, commandMedia, commandRun, commandScreenshot, commandSmokeExisting } from "./commands.js";
import { getCapabilities } from "./capabilities.js";
import { CliError, isCliError, toErrorResponse } from "./errors.js";
import { writeJson } from "./json.js";
import { commandSession, commandSessionDaemon } from "./session-commands.js";
import { commandStepGeneric, commandStepShorthand, STEP_OPTIONS, STEP_SHORTHANDS } from "./step-commands.js";

const COMMON_OPTIONS = {
  json: { type: "boolean" },
  "workspace-root": { type: "string" },
  // Documented as universal "common flags" — tolerated on every command so passing them never
  // errors under strict parsing; they are no-ops on commands that don't connect.
  port: { type: "string" },
  "no-session": { type: "boolean" },
};

function parseCommandArgs(command, argv) {
  const commandOptions = {
    doctor: {
      project: { type: "string" },
      "cli-path": { type: "string" },
      "skip-typecheck": { type: "boolean" },
    },
    capabilities: {},
    "smoke-existing": {
      "ws-endpoint": { type: "string" },
      "probe-elements": { type: "boolean" },
      "snapshot-timeout-ms": { type: "string" },
      "max-elements": { type: "string" },
    },
    run: {
      connect: { type: "string" },
      stdin: { type: "boolean" },
      workflow: { type: "string" },
      "no-session": { type: "boolean" },
      port: { type: "string" },
      "cli-path": { type: "string" },
      "idle-timeout-ms": { type: "string" },
    },
    screenshot: {
      connect: { type: "string" },
      output: { type: "string" },
    },
    media: {
      connect: { type: "string" },
      action: { type: "string" },
      target: { type: "string" },
      targets: { type: "string" },
      "canvas-id": { type: "string" },
      "fixture-image": { type: "string" },
      "allow-take-photo": { type: "boolean" },
      "capture-mode": { type: "string" },
      mock: { type: "string" },
    },
    session: {
      connect: { type: "string" },
      port: { type: "string" },
      "cli-path": { type: "string" },
      "idle-timeout-ms": { type: "string" },
    },
    "__session-daemon": {
      sock: { type: "string" },
      meta: { type: "string" },
      connect: { type: "string" },
      port: { type: "string" },
      "idle-timeout-ms": { type: "string" },
    },
    env: {},
    logs: {
      "request-id": { type: "string" },
      "user-id": { type: "string" },
      code: { type: "string" },
      route: { type: "string" },
      since: { type: "string" },
      level: { type: "string" },
      limit: { type: "string" },
      offset: { type: "string" },
      base: { type: "string" },
      token: { type: "string" },
    },
  }[command] ?? (STEP_SHORTHANDS.has(command) ? STEP_OPTIONS : undefined);

  if (!commandOptions) {
    throw new CliError("UNSUPPORTED_COMMAND", `unsupported command: ${command}`, {
      details: { command },
      suggestions: ["Run vince-mp help --json to list commands."],
    });
  }

  return parseArgs({
    args: argv,
    options: {
      ...COMMON_OPTIONS,
      ...commandOptions,
    },
    allowPositionals: true,
    strict: true,
  });
}

export async function dispatch(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    const caps = getCapabilities();
    return {
      ok: true,
      command: "help",
      commands: caps.commands,
      session: "session start|status|stop|restart|reconnect — one persistent connection; repeat commands are instant and uids persist.",
      shorthands: caps.shorthands,
      examples: [
        "vince-mp session start                 # connect once (auto-resolves project + automation port)",
        "vince-mp data                          # read pageData (instant; reuses the session)",
        "vince-mp query .submit-btn             # mint a uid, then: vince-mp tap <uid>",
        "vince-mp scan PKG-123                  # camera-less: callPageMethod onScanCode with a scancode event",
      ],
      note: "All commands return JSON. Shorthands auto-start a session; pass --no-session for a one-shot connect.",
    };
  }

  const { values, positionals } = parseCommandArgs(command, rest);
  if (STEP_SHORTHANDS.has(command)) {
    return command === "step" ? commandStepGeneric(values, positionals) : commandStepShorthand(command, values, positionals);
  }
  switch (command) {
    case "doctor":
      return commandDoctor(values);
    case "capabilities":
      return commandCapabilities(values);
    case "smoke-existing":
      return commandSmokeExisting(values);
    case "run":
      return commandRun(values);
    case "screenshot":
      return commandScreenshot(values);
    case "media":
      return commandMedia(values);
    case "session":
      return commandSession(values, positionals);
    case "env":
      return commandEnv(values, positionals);
    case "logs":
      return commandLogs(values);
    case "__session-daemon":
      await commandSessionDaemon(values);
      return await new Promise(() => {}); // run forever; never print JSON
    default:
      return {
        ok: false,
        code: "UNSUPPORTED_COMMAND",
        message: `unsupported command: ${command}`,
        details: { command },
        suggestions: ["Run vince-mp help --json to list commands."],
      };
  }
}

export async function main(argv) {
  try {
    const result = await dispatch(argv);
    writeJson(result);
    if (result && result.ok === false) {
      process.exitCode = 1;
    }
  } catch (error) {
    const response = toErrorResponse(error);
    writeJson(response, process.stderr);
    process.exitCode = isCliError(error) ? error.exitCode : 1;
  }
}
