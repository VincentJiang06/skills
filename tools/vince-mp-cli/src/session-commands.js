import { ensureSession, getSession, requestSession, stopSession } from "./client.js";
import { runSessionDaemon } from "./daemon.js";
import { CliError } from "./errors.js";
import { parseJson } from "./json.js";
import { resolveWorkspaceRoot } from "./path-policy.js";

function sessionOptions(args) {
  return {
    connect: args.connect ? parseJson(args.connect, "connect") : undefined,
    port: args.port ? Number(args.port) : undefined,
    cliPath: args["cli-path"],
    idleTimeoutMs: args["idle-timeout-ms"] ? Number(args["idle-timeout-ms"]) : undefined,
  };
}

export async function commandSession(args, positionals = []) {
  const sub = positionals[0] ?? "status";
  const workspaceRoot = resolveWorkspaceRoot(args["workspace-root"] ?? process.cwd());
  const opts = sessionOptions(args);

  switch (sub) {
    case "start": {
      const r = await ensureSession(workspaceRoot, opts);
      return {
        ok: true,
        command: "session",
        action: "start",
        started: r.started,
        reused: r.reused ?? false,
        connection: r.prepared?.connect ?? r.meta?.connection ?? null,
        project: r.prepared?.project ?? null,
        ensured: r.prepared?.ensured ?? null,
        sock: r.meta?.sockPath ?? null,
        pid: r.meta?.pid ?? r.pid ?? null,
      };
    }
    case "status": {
      const alive = await getSession(workspaceRoot);
      if (!alive) {
        return { ok: true, command: "session", action: "status", running: false };
      }
      const status = await requestSession(workspaceRoot, { op: "status" }, 5000);
      return { ok: true, command: "session", action: "status", running: true, status };
    }
    case "reconnect": {
      const alive = await getSession(workspaceRoot);
      if (!alive) {
        return { ok: false, command: "session", action: "reconnect", running: false, message: "no running session to reconnect" };
      }
      const resp = await requestSession(workspaceRoot, { op: "reconnect" }, 30000);
      return resp.ok
        ? { ok: true, command: "session", action: "reconnect", connection: resp.connection, reconnects: resp.reconnects }
        : { ok: false, command: "session", action: "reconnect", code: resp.code, message: resp.message };
    }
    case "stop": {
      const r = await stopSession(workspaceRoot);
      return { ok: true, command: "session", action: "stop", stopped: r.stopped, pid: r.pid };
    }
    case "restart": {
      await stopSession(workspaceRoot);
      const r = await ensureSession(workspaceRoot, opts);
      return {
        ok: true,
        command: "session",
        action: "restart",
        started: r.started,
        connection: r.prepared?.connect ?? null,
        project: r.prepared?.project ?? null,
        sock: r.meta?.sockPath ?? null,
        pid: r.meta?.pid ?? r.pid ?? null,
      };
    }
    default:
      throw new CliError("INVALID_ARGUMENT", `unknown session subcommand: ${sub}`, {
        suggestions: ["Use: session start | stop | status | restart"],
      });
  }
}

/** Detached daemon entry — runs forever; never returns to the JSON-printing main loop. */
export async function commandSessionDaemon(args) {
  const workspaceRoot = args["workspace-root"] ?? process.cwd();
  const connect = args.connect ? parseJson(args.connect, "connect") : undefined;
  await runSessionDaemon({
    workspaceRoot,
    sockPath: args.sock,
    metaPath: args.meta,
    connect,
    idleTimeoutMs: args["idle-timeout-ms"] ? Number(args["idle-timeout-ms"]) : undefined,
  });
}
