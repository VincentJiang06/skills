import { parseArgs } from "node:util";

import { commandCapabilities, commandDoctor, commandMedia, commandRun, commandScreenshot, commandSmokeExisting } from "./commands.js";
import { CliError, isCliError, toErrorResponse } from "./errors.js";
import { writeJson } from "./json.js";

const COMMON_OPTIONS = {
  json: { type: "boolean" },
  "workspace-root": { type: "string" },
};

function parseCommandArgs(command, argv) {
  const commandOptions = {
    doctor: {
      project: { type: "string" },
      "cli-path": { type: "string" },
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
  }[command];

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
  }).values;
}

export async function dispatch(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return {
      ok: true,
      command: "help",
      commands: ["capabilities", "doctor", "smoke-existing", "run", "screenshot", "media"],
      note: "All commands return JSON. Use --stdin for complex run workflows.",
    };
  }

  const values = parseCommandArgs(command, rest);
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
