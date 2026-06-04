import fs from "node:fs";
import net from "node:net";

import { connectMiniProgram, disconnectMiniProgram } from "./automator-client.js";
import { CliError, withTimeout } from "./errors.js";
import { createSessionContext, executeStep, startConsoleCapture, stopConsoleCapture } from "./workflow.js";

const PROTOCOL_VERSION = 1;

/**
 * Start an in-process session server: connect ONCE, hold the context (stable uids),
 * and serve newline-delimited JSON requests (one request per socket connection) on a
 * Unix domain socket. Returns a handle the detached daemon (and tests) drive.
 *
 * Requests: {op:"ping"} {op:"status"} {op:"step",step} {op:"batch",steps,continueOnError?}
 *           {op:"reconnect"} {op:"shutdown"}
 * Self-heals: a transport error during a step triggers one reconnect + retry (uids reset).
 *
 * Injectables: `connectImpl` (async ()=>{miniProgram,connection}) or `miniProgram`.
 */
export async function startSession(options = {}) {
  const { sockPath, metaPath } = options;
  if (!sockPath) {
    throw new CliError("INVALID_ARGUMENT", "startSession requires sockPath");
  }
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const startedAt = Date.now();

  const connectImpl = options.miniProgram
    ? async () => ({ miniProgram: options.miniProgram, connection: { mode: "injected" } })
    : options.connectImpl ?? (async () => connectMiniProgram(options.connect, workspaceRoot));

  const first = await connectImpl();
  const context = createSessionContext({ miniProgram: first.miniProgram, workspaceRoot });

  const state = {
    requests: 0,
    lastActivityAt: startedAt,
    closing: false,
    connection: first.connection,
    reconnects: 0,
  };

  // Capture console from session start so `vince-mp console` shows everything (best-effort:
  // skip if the runtime/mock doesn't emit console events).
  function installConsole() {
    if (typeof context.miniProgram?.on === "function") {
      try { startConsoleCapture(context); } catch { /* runtime lacks console events */ }
    }
  }
  installConsole();

  // Recover a dropped connection (DevTools closed/restarted): swap in a fresh automation
  // connection and reset per-connection state. uids are necessarily cleared (re-query after).
  async function reconnect() {
    try { stopConsoleCapture(context); } catch { /* best-effort */ }
    try { disconnectMiniProgram(context.miniProgram); } catch { /* best-effort */ }
    const fresh = await connectImpl();
    context.miniProgram = fresh.miniProgram;
    context.currentPage = null;
    context.elementMap.clear();
    context.console.installed = false;
    context.console.handlers = null;
    state.connection = fresh.connection;
    state.reconnects += 1;
    installConsole();
    return fresh.connection;
  }

  // A transport-dead error (ws closed) — distinct from a domain error like APP_NOT_RUNNING,
  // where the connection is fine but the app isn't running. Only the former warrants a reconnect.
  function isTransportError(error) {
    if (error instanceof CliError) return error.code === "AUTOMATOR_CONNECT_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    return /websocket|socket hang up|ECONNRESET|ECONNREFUSED|EPIPE|not open|connection closed|disconnect/i.test(message);
  }

  // Generic backstop: no single step may wedge the session. A step's own inner timeout
  // (query/snapshot/wait) fires first; this only catches otherwise-unguarded hangs.
  const stepBackstopMs = options.stepTimeoutMs ?? 20000;
  async function runStepGuarded(step, index, allowReconnect = true) {
    const guard = Math.max(stepBackstopMs, (Number(step?.timeoutMs) || 0) + 5000);
    try {
      return await withTimeout(
        Promise.resolve().then(() => executeStep(context, step, index)),
        guard,
        () => new CliError("STEP_TIMEOUT", `step '${step?.type}' timed out after ${guard}ms (connection or app may be unresponsive)`),
      );
    } catch (error) {
      if (allowReconnect && isTransportError(error)) {
        try {
          await reconnect();
        } catch (reconnectError) {
          throw new CliError("SESSION_CONNECTION_LOST", `automation connection dropped and reconnect failed: ${reconnectError instanceof Error ? reconnectError.message : String(reconnectError)}`, {
            suggestions: ["Confirm DevTools is open and its automation port is live, then `vince-mp session restart`."],
          });
        }
        return runStepGuarded(step, index, false); // retry once on the fresh connection
      }
      throw error;
    }
  }

  // Serialize step execution so concurrent client connections never interleave on the
  // single shared automation connection / elementMap.
  let queue = Promise.resolve();
  function serialize(task) {
    const run = queue.then(task, task);
    // keep the chain from rejecting future tasks
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  function snapshotStatus() {
    return {
      ok: true,
      op: "status",
      protocol: PROTOCOL_VERSION,
      pid: process.pid,
      connection: state.connection,
      workspaceRoot,
      startedAt,
      uptimeMs: Date.now() - startedAt,
      requests: state.requests,
      reconnects: state.reconnects,
      uidCount: context.elementMap.size,
      currentPagePath: context.currentPage?.path ?? null,
      consoleInstalled: context.console.installed,
      lastActivityAt: state.lastActivityAt,
    };
  }

  async function handleRequest(request) {
    state.requests += 1;
    state.lastActivityAt = Date.now();
    const op = request?.op;
    switch (op) {
      case "ping":
        return { ok: true, op: "pong", protocol: PROTOCOL_VERSION, pid: process.pid };
      case "status":
        return snapshotStatus();
      case "shutdown":
        queueShutdown();
        return { ok: true, op: "shutdown", pid: process.pid };
      case "reconnect":
        return serialize(async () => {
          try {
            const conn = await reconnect();
            return { ok: true, op: "reconnect", connection: conn, reconnects: state.reconnects };
          } catch (error) {
            return stepError(error, "reconnect");
          }
        });
      case "step": {
        return serialize(async () => {
          try {
            const result = await runStepGuarded(request.step, 0);
            return { ok: true, op: "step", type: request.step?.type, result };
          } catch (error) {
            return stepError(error, request.step?.type);
          }
        });
      }
      case "batch": {
        return serialize(async () => {
          const steps = Array.isArray(request.steps) ? request.steps : [];
          const results = [];
          for (const [index, step] of steps.entries()) {
            try {
              const result = await runStepGuarded(step, index);
              results.push({ ok: true, index, id: step?.id ?? null, type: step?.type, result });
            } catch (error) {
              const failed = { ...stepError(error, step?.type), index, id: step?.id ?? null };
              results.push(failed);
              if (!request.continueOnError) break;
            }
          }
          return { ok: results.every((r) => r.ok), op: "batch", steps: results };
        });
      }
      default:
        return { ok: false, op: "error", code: "UNKNOWN_OP", message: `unknown session op: ${op}` };
    }
  }

  const server = net.createServer((socket) => {
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) return;
      const line = buffer.slice(0, newlineIndex);
      let request;
      try {
        request = JSON.parse(line);
      } catch {
        socket.end(`${JSON.stringify({ ok: false, op: "error", code: "BAD_REQUEST", message: "invalid JSON request" })}\n`);
        return;
      }
      Promise.resolve(handleRequest(request))
        .then((response) => {
          socket.end(`${JSON.stringify(response)}\n`);
        })
        .catch((error) => {
          socket.end(`${JSON.stringify(stepError(error))}\n`);
        });
    });
    socket.on("error", () => socket.destroy());
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      if (error && error.code === "EADDRINUSE") {
        // Either a live daemon already owns this socket (lose the race gracefully) or a crashed
        // daemon left a stale file (unlink + retry once).
        const probe = net.connect(sockPath);
        probe.once("connect", () => {
          probe.destroy();
          reject(new CliError("SESSION_ALREADY_RUNNING", "a session daemon is already listening on this socket"));
        });
        probe.once("error", () => {
          try { fs.rmSync(sockPath, { force: true }); } catch { /* best-effort */ }
          server.once("error", reject);
          server.listen(sockPath, () => resolve());
        });
        return;
      }
      reject(error);
    };
    server.once("error", onError);
    server.listen(sockPath, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });

  if (metaPath) {
    fs.writeFileSync(metaPath, JSON.stringify({
      protocol: PROTOCOL_VERSION,
      pid: process.pid,
      sockPath,
      workspaceRoot,
      connection: state.connection,
      startedAt,
    }, null, 2));
  }

  let idleTimer = null;
  const idleTimeoutMs = options.idleTimeoutMs ?? 1800000; // 30 min
  if (idleTimeoutMs > 0 && Number.isFinite(idleTimeoutMs)) {
    idleTimer = setInterval(() => {
      if (Date.now() - state.lastActivityAt >= idleTimeoutMs) {
        close("idle-timeout");
      }
    }, Math.min(idleTimeoutMs, 60000));
    if (typeof idleTimer.unref === "function") idleTimer.unref();
  }

  let closed = false;
  let shutdownPending = false;
  function queueShutdown() {
    if (shutdownPending) return;
    shutdownPending = true;
    // let the shutdown response flush first
    setTimeout(() => close("shutdown"), 50);
  }

  async function close(reason) {
    if (closed) return;
    closed = true;
    state.closing = true;
    if (idleTimer) clearInterval(idleTimer);
    try { stopConsoleCapture(context); } catch { /* best-effort */ }
    try { disconnectMiniProgram(context.miniProgram); } catch { /* best-effort */ }
    await new Promise((resolve) => server.close(() => resolve()));
    for (const p of [sockPath, metaPath]) {
      if (p) { try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ } }
    }
    if (typeof options.onClose === "function") options.onClose(reason);
  }

  return { server, sockPath, metaPath, connection: state.connection, context, close, status: snapshotStatus, reconnect };
}

function stepError(error, type) {
  return {
    ok: false,
    op: "step",
    type: type ?? null,
    code: error instanceof CliError ? error.code : "STEP_ERROR",
    message: error instanceof Error ? error.message : String(error),
    details: error instanceof CliError ? error.details : {},
    suggestions: error instanceof CliError ? error.suggestions : [],
  };
}

/**
 * Detached-daemon entry: resolves the connection itself (one-command connect happens in
 * the caller, which passes a ready `connect`), starts the session, wires signals, and
 * keeps the process alive until shutdown / idle / signal.
 */
export async function runSessionDaemon(options = {}) {
  const handle = await startSession({
    ...options,
    onClose: () => process.exit(0),
  });
  const bye = () => { handle.close("signal").then(() => process.exit(0)); };
  process.on("SIGTERM", bye);
  process.on("SIGINT", bye);
  return handle;
}
