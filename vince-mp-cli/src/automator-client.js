import fs from "node:fs";

import automator from "miniprogram-automator";

import { defaultWechatCliPath } from "./defaults.js";
import { CliError, wrapAutomatorError } from "./errors.js";
import { assertProjectShape, resolveInsideWorkspace } from "./path-policy.js";

export const SAFE_WX_METHODS = new Set([
  "getAccountInfoSync",
  "getAppBaseInfo",
  "getDeviceInfo",
  "getEnterOptionsSync",
  "getLaunchOptionsSync",
  "getMenuButtonBoundingClientRect",
  "getNetworkType",
  "getStorage",
  "getStorageInfo",
  "getStorageInfoSync",
  "getStorageSync",
  "getSystemInfo",
  "getSystemInfoSync",
  "getWindowInfo",
]);

export function parseConnectConfig(connect) {
  if (!connect || typeof connect !== "object" || Array.isArray(connect)) {
    throw new CliError("INVALID_ARGUMENT", "connect must be an object", {
      details: { connect },
    });
  }

  if (connect.mode !== "attach" && connect.mode !== "launch") {
    throw new CliError("UNSAFE_CONNECTION_MODE", "connect.mode must be attach or launch", {
      details: { mode: connect.mode },
      suggestions: ["Use attach for an existing DevTools instance or launch with an explicit projectPath."],
    });
  }

  if (connect.mode === "attach") {
    if (!connect.wsEndpoint || typeof connect.wsEndpoint !== "string") {
      throw new CliError("INVALID_ARGUMENT", "attach mode requires wsEndpoint", {
        details: { connect },
      });
    }
    if (connect.projectPath || connect.reLaunch || connect.launch) {
      throw new CliError("UNSAFE_CONNECTION_MODE", "attach mode must not include launch/reload fields", {
        details: { forbiddenFields: ["projectPath", "reLaunch", "launch"] },
      });
    }
  }

  if (connect.mode === "launch" && (!connect.projectPath || typeof connect.projectPath !== "string")) {
    throw new CliError("INVALID_ARGUMENT", "launch mode requires projectPath", {
      details: { connect },
    });
  }

  return connect;
}

export function normalizeConnectConfig(connect, workspaceRoot) {
  const config = parseConnectConfig(connect);
  if (config.mode === "attach") {
    return {
      mode: "attach",
      wsEndpoint: config.wsEndpoint,
    };
  }

  const projectPath = resolveInsideWorkspace(config.projectPath, workspaceRoot, "connect.projectPath", {
    mustExist: true,
  });
  assertProjectShape(projectPath);

  const launchOptions = {
    projectPath,
  };
  if (config.cliPath) {
    launchOptions.cliPath = config.cliPath;
  }
  if (Number.isInteger(config.port)) {
    launchOptions.port = config.port;
  }
  if (Number.isInteger(config.timeout)) {
    launchOptions.timeout = config.timeout;
  }
  if (typeof config.account === "string") {
    launchOptions.account = config.account;
  }
  if (typeof config.ticket === "string") {
    launchOptions.ticket = config.ticket;
  }
  if (typeof config.trustProject === "boolean") {
    launchOptions.trustProject = config.trustProject;
  }
  if (Array.isArray(config.args)) {
    launchOptions.args = config.args;
  }
  if (config.projectConfig && typeof config.projectConfig === "object") {
    launchOptions.projectConfig = config.projectConfig;
  }

  return {
    mode: "launch",
    launchOptions,
  };
}

export async function connectMiniProgram(connect, workspaceRoot) {
  const normalized = normalizeConnectConfig(connect, workspaceRoot);
  try {
    if (normalized.mode === "attach") {
      const miniProgram = await automator.connect({ wsEndpoint: normalized.wsEndpoint });
      return {
        miniProgram,
        connection: {
          mode: "attach",
          wsEndpoint: normalized.wsEndpoint,
          sideEffects: ["connect-existing-automation-session"],
        },
      };
    }

    const miniProgram = await automator.launch(normalized.launchOptions);
    return {
      miniProgram,
      connection: {
        mode: "launch",
        projectPath: normalized.launchOptions.projectPath,
        port: normalized.launchOptions.port ?? null,
        sideEffects: ["may-open-or-focus-devtools-project"],
      },
    };
  } catch (error) {
    throw wrapAutomatorError("AUTOMATOR_CONNECT_FAILED", "failed to connect to WeChat DevTools", error, [
      "Confirm DevTools automation is enabled in WeChat DevTools security settings.",
      "Use attach mode for an already-open client when restart is not allowed.",
    ]);
  }
}

export function disconnectMiniProgram(miniProgram) {
  if (!miniProgram || typeof miniProgram.disconnect !== "function") {
    return;
  }
  try {
    miniProgram.disconnect();
  } catch {
    // Disconnect is best-effort. Never call close() implicitly.
  }
}

export function assertSafeWxMethod(method, allowUnsafe = false) {
  if (allowUnsafe || SAFE_WX_METHODS.has(method)) {
    return;
  }

  throw new CliError("UNSAFE_WX_METHOD", "wx method is not in the default read-only allowlist", {
    details: { method },
    suggestions: ["Pass allowUnsafe:true in the explicit workflow step if this side effect is intended."],
  });
}

export function inspectWechatCli(cliPath) {
  const resolved = cliPath || process.env.WECHAT_DEVTOOLS_CLI || defaultWechatCliPath();
  return {
    path: resolved,
    exists: Boolean(resolved && fs.existsSync(resolved)),
    source: cliPath ? "argument" : process.env.WECHAT_DEVTOOLS_CLI ? "env" : "default",
  };
}
