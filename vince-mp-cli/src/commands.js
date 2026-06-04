import fs from "node:fs";

import { connectMiniProgram, disconnectMiniProgram, inspectWechatCli } from "./automator-client.js";
import { getCapabilities } from "./capabilities.js";
import { CliError } from "./errors.js";
import { parseJson, readStdin } from "./json.js";
import { runMediaAction } from "./media.js";
import { validateMediaOptions } from "./media.js";
import { assertProjectShape, resolveInsideWorkspace, resolveWorkspaceRoot } from "./path-policy.js";
import { getPageSnapshot } from "./snapshot.js";
import { runWorkflow } from "./workflow.js";

export async function commandDoctor(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const projectPath = resolveInsideWorkspace(args.project, workspaceRoot, "project", { mustExist: true });
  const projectShape = assertProjectShape(projectPath);
  const cli = inspectWechatCli(args["cli-path"]);

  return {
    ok: true,
    command: "doctor",
    workspaceRoot,
    checks: {
      node: {
        version: process.version,
        ok: Number(process.versions.node.split(".")[0]) >= 18,
      },
      project: {
        path: projectPath,
        appJson: projectShape.appJson,
        projectConfig: projectShape.projectConfig,
        hasProjectConfig: projectShape.hasProjectConfig,
      },
      wechatCli: cli,
    },
    sideEffects: [],
  };
}

export async function commandCapabilities() {
  return getCapabilities();
}

export async function commandSmokeExisting(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const wsEndpoint = args["ws-endpoint"];
  if (!wsEndpoint) {
    throw new CliError("INVALID_ARGUMENT", "smoke-existing requires --ws-endpoint");
  }

  const { miniProgram, connection } = await connectMiniProgram({ mode: "attach", wsEndpoint }, workspaceRoot);
  const elementMap = new Map();
  try {
    const currentPage = await miniProgram.currentPage();
    const pages = await miniProgram.pageStack();
    const systemInfo = await miniProgram.systemInfo();
    const pageData = currentPage ? await currentPage.data() : null;
    const keys = pageData && typeof pageData === "object" && !Array.isArray(pageData) ? Object.keys(pageData) : [];

    let snapshot = {
      attempted: false,
      note: "probeElements=false",
    };
    if (args["probe-elements"]) {
      try {
        snapshot = {
          attempted: true,
          ok: true,
          result: await getPageSnapshot(currentPage, elementMap, {
            timeoutMs: Number(args["snapshot-timeout-ms"] ?? 3000),
            maxElements: Number(args["max-elements"] ?? 50),
            includeText: true,
          }),
        };
      } catch (error) {
        snapshot = {
          attempted: true,
          ok: false,
          code: error instanceof CliError ? error.code : "SNAPSHOT_UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : String(error),
          partialEvidenceStillValid: true,
        };
      }
    }

    return {
      ok: true,
      command: "smoke-existing",
      connection,
      currentPage: currentPage ? { path: currentPage.path, query: currentPage.query ?? {} } : null,
      pageStack: pages.map((page, index) => ({
        index,
        path: page.path,
        query: page.query ?? {},
        current: index === pages.length - 1,
      })),
      systemInfo,
      pageData: {
        keyCount: keys.length,
        keys: keys.slice(0, 100),
      },
      snapshot,
      sideEffects: ["connect-existing-automation-session"],
    };
  } finally {
    disconnectMiniProgram(miniProgram);
  }
}

export async function commandRun(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const input = args.stdin ? await readStdin() : args.workflow;
  const workflow = parseJson(input, "workflow");
  const connectOverride = args.connect ? parseJson(args.connect, "connect") : undefined;
  return runWorkflow(workflow, { connectOverride, workspaceRoot });
}

export async function commandScreenshot(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const connect = parseJson(args.connect, "connect");
  if (!args.output) {
    throw new CliError("OUTPUT_REQUIRED", "screenshot requires --output");
  }
  const output = resolveInsideWorkspace(args.output, workspaceRoot, "output", { output: true });

  const { miniProgram, connection } = await connectMiniProgram(connect, workspaceRoot);
  try {
    await miniProgram.screenshot({ path: output });
    return {
      ok: true,
      command: "screenshot",
      connection,
      output,
      outputExists: fs.existsSync(output),
      sideEffects: ["write-file"],
    };
  } finally {
    disconnectMiniProgram(miniProgram);
  }
}

export async function commandMedia(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const connect = parseJson(args.connect, "connect");
  const action = args.action;
  if (!action) {
    throw new CliError("INVALID_ARGUMENT", "media requires --action");
  }

  const options = {
    target: args.target,
    targets: args.targets ? args.targets.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
    canvasId: args["canvas-id"],
    fixtureImage: args["fixture-image"],
    allowTakePhoto: Boolean(args["allow-take-photo"]),
    captureMode: args["capture-mode"],
    mockConfig: args.mock ? parseJson(args.mock, "mock") : undefined,
  };
  Object.keys(options).forEach((key) => options[key] === undefined && delete options[key]);
  validateMediaOptions(action, options, workspaceRoot);

  const { miniProgram, connection } = await connectMiniProgram(connect, workspaceRoot);
  try {
    const result = await runMediaAction(miniProgram, action, options, workspaceRoot);
    return {
      ok: true,
      command: "media",
      connection,
      action,
      result,
      sideEffects: action === "install" || action === "camera-mock" || action === "restore"
        ? [`media:${action}`]
        : [],
    };
  } finally {
    disconnectMiniProgram(miniProgram);
  }
}
