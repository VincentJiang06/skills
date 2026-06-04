import fs from "node:fs";
import path from "node:path";

import { CliError } from "./errors.js";

export function resolveWorkspaceRoot(workspaceRoot = process.cwd()) {
  const resolved = path.resolve(workspaceRoot);
  if (!fs.existsSync(resolved)) {
    throw new CliError("WORKSPACE_NOT_FOUND", "workspace root does not exist", {
      details: { workspaceRoot: resolved },
      suggestions: ["Pass --workspace-root with an existing directory."],
    });
  }
  return resolved;
}

export function isInsideWorkspace(targetPath, workspaceRoot) {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(targetPath);
  return target === root || target.startsWith(`${root}${path.sep}`);
}

export function resolveInsideWorkspace(inputPath, workspaceRoot, fieldName, options = {}) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new CliError("INVALID_ARGUMENT", `${fieldName} must be a non-empty path`, {
      details: { fieldName },
    });
  }

  const root = resolveWorkspaceRoot(workspaceRoot);
  const resolved = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(root, inputPath);

  if (!isInsideWorkspace(resolved, root)) {
    throw new CliError("PATH_OUTSIDE_WORKSPACE", `${fieldName} is outside workspace root`, {
      details: { fieldName, path: resolved, workspaceRoot: root },
      suggestions: ["Move the path under the workspace or pass a wider --workspace-root explicitly."],
    });
  }

  if (options.mustExist && !fs.existsSync(resolved)) {
    throw new CliError("PATH_NOT_FOUND", `${fieldName} does not exist`, {
      details: { fieldName, path: resolved },
    });
  }

  if (options.output) {
    const parent = path.dirname(resolved);
    if (!fs.existsSync(parent)) {
      throw new CliError("PATH_NOT_FOUND", `${fieldName} parent directory does not exist`, {
        details: { fieldName, path: resolved, parent },
      });
    }
  }

  return resolved;
}

export function assertProjectShape(projectPath) {
  const appJson = path.join(projectPath, "app.json");
  const projectConfig = path.join(projectPath, "project.config.json");

  if (!fs.existsSync(appJson)) {
    throw new CliError("INVALID_PROJECT", "project path is not a Mini Program root", {
      details: { projectPath, missing: "app.json" },
      suggestions: ["Point --project or connect.projectPath at the directory containing app.json."],
    });
  }

  return {
    appJson,
    projectConfig,
    hasProjectConfig: fs.existsSync(projectConfig),
  };
}
