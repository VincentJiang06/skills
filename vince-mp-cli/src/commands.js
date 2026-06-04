import fs from "node:fs";

import { connectMiniProgram, disconnectMiniProgram, inspectWechatCli } from "./automator-client.js";
import { getCapabilities } from "./capabilities.js";
import { ensureSession, requestSession } from "./client.js";
import { detectSelectedDomain, findStaleTsJsPairs, localIpv4, runTypecheck } from "./doctor.js";
import { CliError } from "./errors.js";
import { parseJson, readStdin } from "./json.js";
import { runMediaAction } from "./media.js";
import { validateMediaOptions } from "./media.js";
import { resolveInsideWorkspace, resolveWorkspaceRoot } from "./path-policy.js";
import { resolveProject } from "./project-resolve.js";
import { getPageSnapshot } from "./snapshot.js";
import { runWorkflow } from "./workflow.js";

export async function commandDoctor(args) {
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const searchRoot = args.project
    ? resolveInsideWorkspace(args.project, workspaceRoot, "project", { mustExist: true })
    : workspaceRoot;

  let project = null;
  let projectCheck;
  try {
    project = resolveProject(searchRoot);
    projectCheck = {
      ok: true,
      projectRoot: project.projectRoot,
      appRoot: project.appRoot,
      appJson: project.appJsonPath,
      miniprogramRoot: project.miniprogramRoot,
      appId: project.appId,
      source: project.source,
    };
  } catch (error) {
    projectCheck = {
      ok: false,
      code: error instanceof CliError ? error.code : "PROJECT_RESOLVE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  let typecheck = { ran: false, ok: null, reason: "project not resolved" };
  let jsFreshness = null;
  let selectedDomain = null;
  if (project) {
    typecheck = args["skip-typecheck"]
      ? { ran: false, ok: null, reason: "skipped (--skip-typecheck)" }
      : await runTypecheck(project.projectRoot);
    jsFreshness = findStaleTsJsPairs(project.appRoot);
    selectedDomain = detectSelectedDomain(project.appRoot);
  }

  return {
    ok: true,
    command: "doctor",
    workspaceRoot,
    checks: {
      node: { version: process.version, ok: Number(process.versions.node.split(".")[0]) >= 18 },
      project: projectCheck,
      wechatCli: inspectWechatCli(args["cli-path"]),
      typecheck,
      jsFreshness,
      selectedDomain,
      localIpv4: localIpv4(),
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

  // Prefer the persistent session (reuse one connection) unless an explicit connection is
  // requested — via --connect OR an embedded workflow.connect — or the caller opts out. This
  // keeps `run --connect ...` and self-describing workflows one-shot & backward compatible.
  if (!connectOverride && !workflow.connect && !args["no-session"]) {
    if (!Array.isArray(workflow.steps)) {
      throw new CliError("INVALID_ARGUMENT", "workflow.steps must be an array");
    }
    await ensureSession(workspaceRoot, {
      port: args.port ? Number(args.port) : undefined,
      cliPath: args["cli-path"],
      idleTimeoutMs: args["idle-timeout-ms"] ? Number(args["idle-timeout-ms"]) : undefined,
    });
    const resp = await requestSession(workspaceRoot, {
      op: "batch",
      steps: workflow.steps,
      continueOnError: workflow.options?.continueOnError,
    });
    return {
      ok: resp.ok,
      command: "run",
      via: "session",
      steps: resp.steps,
      sideEffects: (resp.steps ?? []).flatMap((item) => item.result?.sideEffects ?? []),
    };
  }

  const result = await runWorkflow(workflow, { connectOverride, workspaceRoot });
  return { ...result, via: "one-shot" };
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
