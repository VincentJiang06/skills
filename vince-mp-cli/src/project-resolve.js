import fs from "node:fs";
import path from "node:path";

import { CliError } from "./errors.js";
import { resolveWorkspaceRoot } from "./path-policy.js";

// Directories that must never be descended into when searching for a Mini Program
// root: build output, deps, and especially copied worktrees that would yield a false
// app.json match (see project memory: ".claude/worktrees/* and node_modules/* cause
// false matches"). Any dotted dir (.git, .claude, .vscode) is skipped too.
const EXCLUDED_DIRS = new Set(["node_modules", "miniprogram_npm", "dist", "build", "out", "coverage"]);

function isExcludedDir(name) {
  return EXCLUDED_DIRS.has(name) || name.startsWith(".");
}

// Breadth-first search for `fileName`, returning the shallowest match (so the
// outermost project.config.json / app.json wins) while skipping excluded dirs.
function findFileShallow(root, fileName, maxDepth) {
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    const candidate = path.join(dir, fileName);
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // not present at this level; keep searching
    }
    if (depth >= maxDepth) {
      continue;
    }
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !isExcludedDir(entry.name)) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }
  }
  return null;
}

/**
 * Resolve a Mini Program from a workspace, honoring project.config.json's
 * miniprogramRoot so a `miniprogram/`-subdir layout no longer trips INVALID_PROJECT.
 * Returns { projectRoot, appRoot, appJsonPath, miniprogramRoot, appId, source }.
 */
export function resolveProject(workspaceRoot, options = {}) {
  const realRoot = fs.realpathSync(resolveWorkspaceRoot(workspaceRoot));

  const pcPath = findFileShallow(realRoot, "project.config.json", options.maxDepth ?? 3);
  if (pcPath) {
    const projectRoot = path.dirname(pcPath);
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(pcPath, "utf8"));
    } catch (error) {
      throw new CliError("INVALID_PROJECT", "project.config.json is not valid JSON", {
        details: { projectConfig: pcPath, error: error instanceof Error ? error.message : String(error) },
      });
    }
    const miniprogramRoot = typeof config.miniprogramRoot === "string" && config.miniprogramRoot.trim()
      ? config.miniprogramRoot
      : "./";
    const appRoot = path.resolve(projectRoot, miniprogramRoot);
    const appJsonPath = path.join(appRoot, "app.json");
    if (!fs.existsSync(appJsonPath)) {
      throw new CliError("INVALID_PROJECT", `project.config.json miniprogramRoot points to ${appRoot} but app.json is missing there`, {
        details: { projectRoot, miniprogramRoot, appRoot, appJsonPath },
        suggestions: [
          "Verify miniprogramRoot in project.config.json.",
          "Open the project once in WeChat DevTools to generate app.json.",
        ],
      });
    }
    return {
      projectRoot,
      appRoot,
      appJsonPath,
      miniprogramRoot,
      appId: typeof config.appid === "string" ? config.appid : null,
      source: "project.config.json",
    };
  }

  const appJsonPath = findFileShallow(realRoot, "app.json", options.maxDepth ?? 4);
  if (appJsonPath) {
    const appRoot = path.dirname(appJsonPath);
    return {
      projectRoot: appRoot,
      appRoot,
      appJsonPath,
      miniprogramRoot: "./",
      appId: null,
      source: "app-json-search",
    };
  }

  throw new CliError("PROJECT_NOT_FOUND", "no Mini Program found under the workspace (no project.config.json+app.json, no bare app.json)", {
    details: { workspaceRoot: realRoot },
    suggestions: [
      "Run from the project root, or pass --workspace-root pointing at the repo with project.config.json or app.json.",
    ],
  });
}
