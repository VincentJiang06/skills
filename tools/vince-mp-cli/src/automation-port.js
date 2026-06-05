import { spawn as childSpawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

import { defaultWechatCliPath } from "./defaults.js";
import { CliError } from "./errors.js";

/** TCP liveness probe — resolves true if something accepts a connection on host:port. */
export function isPortLive(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Guarantee a live WeChat DevTools automation endpoint, collapsing the documented
 * two-step manual recipe (run `cli auto --auto-port`, then attach) into one call:
 *   - if the port already answers, return it WITHOUT spawning (no "port in use" fight);
 *   - otherwise spawn `<cli> auto --project <projectRoot> --auto-port <port>` detached
 *     and poll until the port answers, with a bounded timeout.
 * `probe` and `spawn` are injectable for tests.
 */
export async function ensureAutomationPort(options = {}) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 9420;
  const probe = options.probe ?? ((h, p) => isPortLive(h, p));
  const wsEndpoint = `ws://${host}:${port}`;

  if (await probe(host, port)) {
    return { wsEndpoint, host, port, started: false };
  }

  const cliPath = options.cliPath || process.env.WECHAT_DEVTOOLS_CLI || defaultWechatCliPath();
  if ((!cliPath || !fs.existsSync(cliPath)) && !options.spawn) {
    throw new CliError("WECHAT_CLI_NOT_FOUND", "WeChat DevTools CLI not found; cannot enable the automation port", {
      details: { cliPath },
      suggestions: ["Pass --cli-path or set WECHAT_DEVTOOLS_CLI to the DevTools `cli` binary."],
    });
  }
  if (!options.projectRoot) {
    throw new CliError("INVALID_ARGUMENT", "ensureAutomationPort requires projectRoot to launch automation");
  }

  const spawn = options.spawn ?? ((cmd, args) => childSpawn(cmd, args, { detached: true, stdio: "ignore" }));
  const child = spawn(cliPath, ["auto", "--project", options.projectRoot, "--auto-port", String(port)]);
  if (child && typeof child.unref === "function") {
    child.unref();
  }

  const timeoutMs = options.timeoutMs ?? 45000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(pollIntervalMs);
    if (await probe(host, port)) {
      return { wsEndpoint, host, port, started: true, pid: child?.pid ?? null };
    }
  }

  throw new CliError("AUTOMATION_PORT_TIMEOUT", `automation port ${port} did not come up within ${timeoutMs}ms`, {
    details: { host, port, projectRoot: options.projectRoot, cliPath },
    suggestions: [
      "Open the project once in WeChat DevTools.",
      "Enable 设置 → 安全设置 → 服务端口 (CLI/HTTP automation) in DevTools.",
    ],
  });
}
