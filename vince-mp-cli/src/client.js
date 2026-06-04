import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { ensureAutomationPort } from "./automation-port.js";
import { CliError } from "./errors.js";
import { resolveProject } from "./project-resolve.js";

const BIN_PATH = path.resolve(import.meta.dirname, "..", "bin", "vince-mp.js");

export function sessionHome() {
  return process.env.VINCE_MP_HOME || path.join(os.homedir(), ".vince-mp");
}

export function sessionPaths(workspaceRoot) {
  let key;
  try {
    key = fs.realpathSync(workspaceRoot);
  } catch {
    key = path.resolve(workspaceRoot);
  }
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
  const dir = path.join(sessionHome(), "sessions");
  return {
    key,
    dir,
    sockPath: path.join(dir, `${hash}.sock`),
    metaPath: path.join(dir, `${hash}.json`),
    logPath: path.join(dir, `${hash}.log`),
  };
}

function ensureSessionDir(workspaceRoot) {
  const { dir } = sessionPaths(workspaceRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Send one newline-delimited JSON request to a session socket and read one response. */
export function sendToSock(sockPath, request, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(sockPath);
    let buffer = "";
    let settled = false;
    const fail = (code, message) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new CliError(code, message, { details: { sockPath } }));
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk) => {
      buffer += chunk;
      const idx = buffer.indexOf("\n");
      if (idx === -1) return;
      if (settled) return;
      settled = true;
      socket.end();
      try {
        resolve(JSON.parse(buffer.slice(0, idx)));
      } catch (error) {
        reject(new CliError("SESSION_BAD_RESPONSE", `invalid session response: ${error.message}`));
      }
    });
    socket.on("timeout", () => fail("SESSION_TIMEOUT", `session request timed out after ${timeoutMs}ms`));
    socket.on("error", (error) => fail("SESSION_NOT_RUNNING", `cannot reach session socket: ${error.message}`));
  });
}

export function readMeta(workspaceRoot) {
  const { metaPath } = sessionPaths(workspaceRoot);
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return null;
  }
}

export function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function cleanupSession(workspaceRoot) {
  const { sockPath, metaPath } = sessionPaths(workspaceRoot);
  for (const p of [sockPath, metaPath]) {
    try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ }
  }
}

/** Return live session meta (ping-confirmed) or null, cleaning up a stale socket/meta. */
export async function getSession(workspaceRoot) {
  const meta = readMeta(workspaceRoot);
  const { sockPath } = sessionPaths(workspaceRoot);
  if (!meta && !fs.existsSync(sockPath)) {
    return null;
  }
  try {
    const pong = await sendToSock(sockPath, { op: "ping" }, 2000);
    if (pong && pong.op === "pong") {
      return meta ?? { sockPath, pid: pong.pid };
    }
  } catch {
    // not reachable → stale
  }
  cleanupSession(workspaceRoot);
  return null;
}

export async function requestSession(workspaceRoot, request, timeoutMs) {
  const { sockPath } = sessionPaths(workspaceRoot);
  return sendToSock(sockPath, request, timeoutMs);
}

/**
 * One-command connect: turn a workspace into a ready connect spec. Explicit `connect`
 * is passed through; otherwise resolve the project (miniprogramRoot-aware) and ensure
 * the automation port is live (spawning `cli auto` if needed), then attach.
 */
export async function prepareConnect(workspaceRoot, options = {}) {
  if (options.connect) {
    return { connect: options.connect, project: null, ensured: null };
  }
  const project = resolveProject(workspaceRoot);
  const ensured = await ensureAutomationPort({
    projectRoot: project.projectRoot,
    port: options.port ?? 9420,
    cliPath: options.cliPath,
    timeoutMs: options.portTimeoutMs ?? 45000,
  });
  return {
    connect: { mode: "attach", wsEndpoint: ensured.wsEndpoint },
    project,
    ensured,
  };
}

/** Return a live session, spawning a detached daemon if one is not already running. */
export async function ensureSession(workspaceRoot, options = {}) {
  const existing = await getSession(workspaceRoot);
  if (existing) {
    return { meta: existing, started: false, reused: true };
  }

  ensureSessionDir(workspaceRoot);
  const { sockPath, metaPath, logPath } = sessionPaths(workspaceRoot);
  cleanupSession(workspaceRoot);

  const prepared = await prepareConnect(workspaceRoot, options);

  const args = [
    BIN_PATH, "__session-daemon",
    "--workspace-root", workspaceRoot,
    "--sock", sockPath,
    "--meta", metaPath,
    "--connect", JSON.stringify(prepared.connect),
  ];
  if (options.idleTimeoutMs != null) {
    args.push("--idle-timeout-ms", String(options.idleTimeoutMs));
  }

  const logFd = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, args, { detached: true, stdio: ["ignore", logFd, logFd] });
  child.unref();

  const deadline = Date.now() + (options.startTimeoutMs ?? 20000);
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    const meta = await getSession(workspaceRoot);
    if (meta) {
      return { meta, started: true, prepared, pid: child.pid };
    }
  }
  let tail = "";
  try { tail = fs.readFileSync(logPath, "utf8").slice(-600); } catch { /* ignore */ }
  throw new CliError("SESSION_START_FAILED", "session daemon did not become ready", {
    details: { sockPath, logTail: tail },
    suggestions: ["Run `vince-mp doctor` to verify the project + DevTools automation port."],
  });
}

export async function stopSession(workspaceRoot) {
  const meta = readMeta(workspaceRoot);
  const alive = await getSession(workspaceRoot);
  if (alive) {
    try {
      await requestSession(workspaceRoot, { op: "shutdown" }, 3000);
    } catch { /* fall through to kill */ }
  }
  if (meta?.pid && isProcessAlive(meta.pid)) {
    try { process.kill(meta.pid, "SIGTERM"); } catch { /* best-effort */ }
  }
  cleanupSession(workspaceRoot);
  return { stopped: Boolean(alive || meta), pid: meta?.pid ?? null };
}
