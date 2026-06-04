import { CliError } from "./errors.js";
import { resolveInsideWorkspace } from "./path-policy.js";

export async function installMediaInstrumentation(miniProgram, options = {}) {
  const result = await miniProgram.evaluate(function install(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj) {
      return { installed: false, reason: "wx unavailable" };
    }

    const debug = wxObj.__vinceMpMediaDebug || {
      installed: false,
      events: [],
      seq: 0,
      original: {},
    };

    const targets = optionsArg.targets || ["canvas", "camera"];
    const maxEvents = optionsArg.maxEvents || 500;

    function limitValue(value, depth) {
      if (value === null || value === undefined) return value;
      if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}...` : value;
      if (typeof value === "number" || typeof value === "boolean") return value;
      if (typeof value === "function") return "[Function]";
      if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength}]`;
      if (ArrayBuffer.isView(value)) return `[${value.constructor.name} ${value.byteLength}]`;
      if ((depth || 0) >= 2) return "[Object]";
      if (Array.isArray(value)) return value.slice(0, 10).map((item) => limitValue(item, (depth || 0) + 1));
      if (typeof value === "object") {
        const out = {};
        for (const key of Object.keys(value).slice(0, 20)) {
          out[key] = limitValue(value[key], (depth || 0) + 1);
        }
        return out;
      }
      return String(value);
    }

    function pushEvent(event) {
      debug.seq += 1;
      debug.events.push({
        id: `media_${Date.now()}_${debug.seq}`,
        timestamp: new Date().toISOString(),
        ...event,
      });
      while (debug.events.length > maxEvents) {
        debug.events.shift();
      }
    }

    if (!debug.installed && targets.includes("canvas")) {
      if (typeof wxObj.createCanvasContext === "function") {
        debug.original.createCanvasContext = wxObj.createCanvasContext;
        wxObj.createCanvasContext = function createCanvasContext(canvasId, component) {
          pushEvent({ target: "canvas", type: "createCanvasContext", canvasId: canvasId || null });
          const ctx = debug.original.createCanvasContext.call(this, canvasId, component);
          if (!ctx || ctx.__vinceMpWrappedCanvasContext) return ctx;
          Object.defineProperty(ctx, "__vinceMpWrappedCanvasContext", { value: true, configurable: true });
          for (const method of ["draw", "drawImage", "fillRect", "fillText", "stroke", "clearRect"]) {
            if (typeof ctx[method] !== "function") continue;
            const original = ctx[method];
            ctx[method] = function wrappedCanvasMethod(...args) {
              try {
                const value = original.apply(this, args);
                pushEvent({ target: "canvas", type: "method", method, canvasId: canvasId || null, args: limitValue(args, 0) });
                return value;
              } catch (error) {
                pushEvent({ target: "canvas", type: "method_error", method, canvasId: canvasId || null, error: String(error && error.message ? error.message : error) });
                throw error;
              }
            };
          }
          return ctx;
        };
      }
    }

    if (!debug.installed && targets.includes("camera") && typeof wxObj.createCameraContext === "function") {
      debug.original.createCameraContext = wxObj.createCameraContext;
      wxObj.createCameraContext = function createCameraContext() {
        pushEvent({ target: "camera", type: "createCameraContext" });
        return debug.original.createCameraContext.apply(this, arguments);
      };
    }

    debug.installed = true;
    debug.targets = targets;
    debug.captureMode = optionsArg.captureMode || "metadata";
    debug.maxEvents = maxEvents;
    wxObj.__vinceMpMediaDebug = debug;

    return {
      installed: true,
      targets,
      captureMode: debug.captureMode,
      eventCount: debug.events.length,
      available: {
        createCanvasContext: typeof wxObj.createCanvasContext === "function",
        canvasToTempFilePath: typeof wxObj.canvasToTempFilePath === "function",
        canvasGetImageData: typeof wxObj.canvasGetImageData === "function",
        createCameraContext: typeof wxObj.createCameraContext === "function",
      },
    };
  }, options);

  return result;
}

export async function listMediaEvents(miniProgram, options = {}) {
  return miniProgram.evaluate(function list(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    const events = wxObj && wxObj.__vinceMpMediaDebug ? wxObj.__vinceMpMediaDebug.events || [] : [];
    const target = optionsArg.target || null;
    const filtered = target ? events.filter((event) => event.target === target) : events;
    const pageSize = optionsArg.pageSize || 50;
    const pageIdx = optionsArg.pageIdx || 0;
    return {
      installed: Boolean(wxObj && wxObj.__vinceMpMediaDebug && wxObj.__vinceMpMediaDebug.installed),
      total: filtered.length,
      pageIdx,
      pageSize,
      events: filtered.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    };
  }, options);
}

export async function exportCanvasSnapshot(miniProgram, options = {}) {
  if (!options.canvasId) {
    throw new CliError("INVALID_ARGUMENT", "canvas-export requires canvasId");
  }

  return miniProgram.evaluate(function exportCanvas(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || typeof wxObj.canvasToTempFilePath !== "function") {
      return { ok: false, code: "CANVAS_EXPORT_UNSUPPORTED", message: "wx.canvasToTempFilePath unavailable" };
    }
    return new Promise((resolve) => {
      wxObj.canvasToTempFilePath({
        canvasId: optionsArg.canvasId,
        fileType: optionsArg.fileType || "png",
        quality: optionsArg.quality || 1,
        success(res) {
          resolve({ ok: true, canvasId: optionsArg.canvasId, tempFilePath: res.tempFilePath });
        },
        fail(err) {
          resolve({ ok: false, code: "CANVAS_EXPORT_FAILED", message: err && err.errMsg ? err.errMsg : String(err) });
        },
      });
    });
  }, options);
}

export async function sampleCanvasPixels(miniProgram, options = {}) {
  if (!options.canvasId) {
    throw new CliError("INVALID_ARGUMENT", "canvas-sample requires canvasId");
  }

  return miniProgram.evaluate(function sampleCanvas(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || typeof wxObj.canvasGetImageData !== "function") {
      return { ok: false, code: "CANVAS_SAMPLE_UNSUPPORTED", message: "wx.canvasGetImageData unavailable" };
    }
    return new Promise((resolve) => {
      wxObj.canvasGetImageData({
        canvasId: optionsArg.canvasId,
        x: optionsArg.x || 0,
        y: optionsArg.y || 0,
        width: optionsArg.width || 1,
        height: optionsArg.height || 1,
        success(res) {
          const maxValues = optionsArg.maxValues || 64;
          const sample = Array.from(res.data).slice(0, maxValues);
          resolve({
            ok: true,
            canvasId: optionsArg.canvasId,
            width: res.width,
            height: res.height,
            dataLength: res.data.length,
            sample,
            sampleChecksum: sample.reduce((sum, value) => sum + value, 0),
            truncated: res.data.length > sample.length,
          });
        },
        fail(err) {
          resolve({ ok: false, code: "CANVAS_SAMPLE_FAILED", message: err && err.errMsg ? err.errMsg : String(err) });
        },
      });
    });
  }, options);
}

export async function probeCameraContext(miniProgram, options = {}) {
  return miniProgram.evaluate(function probeCamera(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || typeof wxObj.createCameraContext !== "function") {
      return { ok: false, code: "CAMERA_UNSUPPORTED", message: "wx.createCameraContext unavailable" };
    }
    const ctx = wxObj.createCameraContext();
    const methods = ["takePhoto", "startRecord", "stopRecord", "onCameraFrame"].filter((method) => typeof ctx[method] === "function");
    if (!optionsArg.allowTakePhoto) {
      return { ok: true, allowTakePhoto: false, methods, note: "metadata only; takePhoto not called" };
    }
    if (typeof ctx.takePhoto !== "function") {
      return { ok: false, code: "CAMERA_TAKE_PHOTO_UNSUPPORTED", methods };
    }
    return new Promise((resolve) => {
      ctx.takePhoto({
        quality: optionsArg.quality || "low",
        success(res) {
          resolve({ ok: true, allowTakePhoto: true, methods, tempImagePath: res.tempImagePath ? "[path-present]" : null });
        },
        fail(err) {
          resolve({ ok: false, code: "CAMERA_TAKE_PHOTO_FAILED", methods, message: err && err.errMsg ? err.errMsg : String(err) });
        },
      });
    });
  }, options);
}

export async function installCameraMock(miniProgram, options = {}, workspaceRoot) {
  validateMediaOptions("camera-mock", options, workspaceRoot);

  const mockConfig = options.mockConfig ?? {
    tempImagePath: resolveInsideWorkspace(options.fixtureImage, workspaceRoot, "fixtureImage", { mustExist: true }),
  };

  await miniProgram.mockWxMethod("createCameraContext", function createCameraContextMock(config) {
    return {
      takePhoto(optionsArg) {
        const res = { tempImagePath: config.tempImagePath || config.image || "" };
        if (optionsArg && typeof optionsArg.success === "function") optionsArg.success(res);
        if (optionsArg && typeof optionsArg.complete === "function") optionsArg.complete(res);
        return Promise.resolve(res);
      },
      onCameraFrame() {
        return {
          start() {},
          stop() {},
        };
      },
      startRecord(optionsArg) {
        const res = { errMsg: "startRecord:ok(mock)" };
        if (optionsArg && typeof optionsArg.success === "function") optionsArg.success(res);
        return Promise.resolve(res);
      },
      stopRecord(optionsArg) {
        const res = { tempVideoPath: config.tempVideoPath || "", errMsg: "stopRecord:ok(mock)" };
        if (optionsArg && typeof optionsArg.success === "function") optionsArg.success(res);
        return Promise.resolve(res);
      },
    };
  }, mockConfig);

  return {
    ok: true,
    mocked: "createCameraContext",
    sideEffects: ["wx.createCameraContext mocked until restoreWxMethod/createCameraContext"],
    mockConfigKeys: Object.keys(mockConfig),
  };
}

export function validateMediaOptions(action, options = {}, workspaceRoot = process.cwd()) {
  if (action === "camera-mock" && !options.fixtureImage && !options.mockConfig) {
    throw new CliError("CAMERA_MOCK_REQUIRES_FIXTURE", "camera-mock requires fixtureImage or mockConfig", {
      suggestions: ["Pass a fixtureImage path or explicit mockConfig so the side effect is auditable."],
    });
  }

  if (action === "camera-mock" && options.fixtureImage) {
    resolveInsideWorkspace(options.fixtureImage, workspaceRoot, "fixtureImage", { mustExist: true });
  }

  if ((action === "canvas-export" || action === "canvas-sample") && !options.canvasId) {
    throw new CliError("INVALID_ARGUMENT", `${action} requires canvasId`);
  }
}

export async function restoreMedia(miniProgram, options = {}) {
  const methods = options.methods || ["createCameraContext"];
  const restored = [];
  for (const method of methods) {
    try {
      await miniProgram.restoreWxMethod(method);
      restored.push(method);
    } catch {
      // Method may not be mocked. Keep restore best-effort.
    }
  }

  const runtime = await miniProgram.evaluate(function restoreRuntime(optionsArg) {
    const wxObj = typeof wx !== "undefined" ? wx : null;
    if (!wxObj || !wxObj.__vinceMpMediaDebug) {
      return { installed: false };
    }
    if (optionsArg.clearEvents) wxObj.__vinceMpMediaDebug.events = [];
    wxObj.__vinceMpMediaDebug.installed = false;
    return { installed: false, eventCount: wxObj.__vinceMpMediaDebug.events.length };
  }, { clearEvents: Boolean(options.clearEvents) });

  return {
    restored,
    runtime,
  };
}

export async function runMediaAction(miniProgram, action, options = {}, workspaceRoot = process.cwd()) {
  validateMediaOptions(action, options, workspaceRoot);
  switch (action) {
    case "install":
      return installMediaInstrumentation(miniProgram, options);
    case "list":
      return listMediaEvents(miniProgram, options);
    case "canvas-export":
      return exportCanvasSnapshot(miniProgram, options);
    case "canvas-sample":
      return sampleCanvasPixels(miniProgram, options);
    case "camera-probe":
      return probeCameraContext(miniProgram, options);
    case "camera-mock":
      return installCameraMock(miniProgram, options, workspaceRoot);
    case "restore":
      return restoreMedia(miniProgram, options);
    default:
      throw new CliError("UNSUPPORTED_MEDIA_ACTION", "unsupported media action", {
        details: { action },
      });
  }
}
