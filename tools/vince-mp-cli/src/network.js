import { CliError } from "./errors.js";

export async function installNetworkMonitoring(miniProgram, options = {}) {
  return miniProgram.evaluate(function install(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj) return { installed: false, reason: "wx unavailable" };

    const methods = optionsArg.methods || ["request", "uploadFile", "downloadFile"];
    const debug = wxObj.__vinceMpNetworkDebug || {
      installed: false,
      seq: 0,
      events: [],
      original: {},
    };
    const maxEvents = optionsArg.maxEvents || 500;

    function limitValue(value, depth) {
      if (value === null || value === undefined) return value;
      if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...` : value;
      if (typeof value === "number" || typeof value === "boolean") return value;
      if (typeof value === "function") return "[Function]";
      if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength}]`;
      if (ArrayBuffer.isView(value)) return `[${value.constructor.name} ${value.byteLength}]`;
      if ((depth || 0) >= 2) return "[Object]";
      if (Array.isArray(value)) return value.slice(0, 20).map((item) => limitValue(item, (depth || 0) + 1));
      if (typeof value === "object") {
        const out = {};
        for (const key of Object.keys(value).slice(0, 30)) {
          out[key] = key.toLowerCase().includes("authorization") ? "[redacted]" : limitValue(value[key], (depth || 0) + 1);
        }
        return out;
      }
      return String(value);
    }

    function pushEvent(event) {
      debug.seq += 1;
      debug.events.push({
        reqid: `net_${Date.now()}_${debug.seq}`,
        timestamp: new Date().toISOString(),
        ...event,
      });
      while (debug.events.length > maxEvents) debug.events.shift();
    }

    if (optionsArg.clearExisting) debug.events = [];

    for (const method of methods) {
      if (typeof wxObj[method] !== "function") continue;
      if (!debug.original[method]) debug.original[method] = wxObj[method];
      wxObj[method] = function patchedNetworkMethod(optionsObj) {
        const started = Date.now();
        const requestMeta = {
          target: "network",
          methodName: method,
          url: optionsObj && optionsObj.url ? String(optionsObj.url) : null,
          httpMethod: optionsObj && optionsObj.method ? String(optionsObj.method) : method === "request" ? "GET" : null,
          data: optionsArg.includeBodies ? limitValue(optionsObj && optionsObj.data, 0) : undefined,
        };
        pushEvent({ ...requestMeta, phase: "start" });

        const originalSuccess = optionsObj && optionsObj.success;
        const originalFail = optionsObj && optionsObj.fail;
        const originalComplete = optionsObj && optionsObj.complete;
        const wrappedOptions = {
          ...(optionsObj || {}),
          success(res) {
            pushEvent({
              ...requestMeta,
              phase: "success",
              statusCode: res && res.statusCode !== undefined ? res.statusCode : null,
              response: optionsArg.includeBodies ? limitValue(res && res.data, 0) : undefined,
              elapsedMs: Date.now() - started,
            });
            if (typeof originalSuccess === "function") return originalSuccess.call(this, res);
          },
          fail(err) {
            pushEvent({
              ...requestMeta,
              phase: "fail",
              error: limitValue(err, 0),
              elapsedMs: Date.now() - started,
            });
            if (typeof originalFail === "function") return originalFail.call(this, err);
          },
          complete(res) {
            if (optionsArg.captureComplete) {
              pushEvent({
                ...requestMeta,
                phase: "complete",
                result: limitValue(res, 0),
                elapsedMs: Date.now() - started,
              });
            }
            if (typeof originalComplete === "function") return originalComplete.call(this, res);
          },
        };
        return debug.original[method].call(this, wrappedOptions);
      };
    }

    debug.installed = true;
    debug.methods = methods;
    debug.maxEvents = maxEvents;
    wxObj.__vinceMpNetworkDebug = debug;

    return {
      installed: true,
      methods,
      eventCount: debug.events.length,
      sideEffects: ["wx network methods patched"],
    };
  }, options);
}

export async function listNetworkEvents(miniProgram, options = {}) {
  return miniProgram.evaluate(function list(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    const debug = wxObj && wxObj.__vinceMpNetworkDebug;
    const events = debug ? debug.events || [] : [];
    const urlPattern = optionsArg.urlPattern ? new RegExp(optionsArg.urlPattern) : null;
    const pageSize = optionsArg.pageSize || 50;
    const pageIdx = optionsArg.pageIdx || 0;
    const filtered = events.filter((event) => {
      if (optionsArg.methodName && event.methodName !== optionsArg.methodName) return false;
      if (optionsArg.phase && event.phase !== optionsArg.phase) return false;
      if (optionsArg.failedOnly && event.phase !== "fail") return false;
      if (optionsArg.successOnly && event.phase !== "success") return false;
      if (urlPattern && !urlPattern.test(event.url || "")) return false;
      return true;
    });
    return {
      installed: Boolean(debug && debug.installed),
      total: filtered.length,
      pageIdx,
      pageSize,
      events: filtered.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    };
  }, options);
}

export async function clearNetworkEvents(miniProgram) {
  return miniProgram.evaluate(function clear() {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || !wxObj.__vinceMpNetworkDebug) return { installed: false, cleared: 0 };
    const cleared = wxObj.__vinceMpNetworkDebug.events.length;
    wxObj.__vinceMpNetworkDebug.events = [];
    return { installed: Boolean(wxObj.__vinceMpNetworkDebug.installed), cleared };
  });
}

export async function restoreNetworkMonitoring(miniProgram) {
  return miniProgram.evaluate(function restore() {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || !wxObj.__vinceMpNetworkDebug) return { restored: [] };
    const restored = [];
    const original = wxObj.__vinceMpNetworkDebug.original || {};
    for (const method of Object.keys(original)) {
      wxObj[method] = original[method];
      restored.push(method);
    }
    wxObj.__vinceMpNetworkDebug.installed = false;
    return { restored, eventCount: wxObj.__vinceMpNetworkDebug.events.length };
  });
}

export function validateNetworkOptions(action, options = {}) {
  if (action === "networkList" && options.urlPattern) {
    try {
      new RegExp(options.urlPattern);
    } catch (error) {
      throw new CliError("INVALID_ARGUMENT", "networkList urlPattern must be a valid RegExp", {
        details: { urlPattern: options.urlPattern, message: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
