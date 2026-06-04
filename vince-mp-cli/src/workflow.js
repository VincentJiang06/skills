import { assertSafeWxMethod, connectMiniProgram, disconnectMiniProgram } from "./automator-client.js";
import { CliError, withTimeout } from "./errors.js";
import { cropElementScreenshot } from "./image-crop.js";
import { resolveInsideWorkspace } from "./path-policy.js";
import { truncateForJson } from "./json.js";
import { runMediaAction } from "./media.js";
import {
  clearNetworkEvents,
  installNetworkMonitoring,
  listNetworkEvents,
  restoreNetworkMonitoring,
  validateNetworkOptions,
} from "./network.js";
import { getPageSnapshot, queryElements } from "./snapshot.js";

async function getCurrentPage(context) {
  context.currentPage = await context.miniProgram.currentPage();
  if (!context.currentPage) {
    throw new CliError("CURRENT_PAGE_UNAVAILABLE", "current page is unavailable");
  }
  return context.currentPage;
}

function getElement(context, uid) {
  if (!uid || !context.elementMap.has(uid)) {
    throw new CliError("STALE_OR_UNKNOWN_UID", "uid is unknown or stale", {
      details: { uid },
      suggestions: ["Run query or snapshot again after navigation or page mutation."],
    });
  }
  return context.elementMap.get(uid);
}

async function pageInfo(page) {
  return {
    path: page?.path ?? null,
    query: page?.query ?? {},
  };
}

async function waitStep(context, step) {
  const page = await getCurrentPage(context);
  const timeoutMs = step.timeoutMs ?? 5000;
  if (Number.isInteger(step.delayMs) || Number.isInteger(step.ms)) {
    const delayMs = step.delayMs ?? step.ms;
    await page.waitFor(delayMs);
    return { waitedMs: delayMs };
  }
  if (step.selector) {
    await withTimeout(page.waitFor(step.selector), timeoutMs, () => new CliError("WAIT_TIMEOUT", "timed out waiting for selector", {
      details: { selector: step.selector, timeoutMs },
    }));
    return { selector: step.selector, timeoutMs };
  }
  throw new CliError("INVALID_ARGUMENT", "wait step requires delayMs, ms, or selector");
}

function sanitizeConsoleArgs(args) {
  return (args ?? []).map((item) => {
    if (item === null || item === undefined) return item;
    if (typeof item === "string") return item.length > 1000 ? `${item.slice(0, 1000)}...` : item;
    if (typeof item === "number" || typeof item === "boolean") return item;
    try {
      const encoded = JSON.stringify(item);
      return encoded && encoded.length > 1000 ? `${encoded.slice(0, 1000)}...` : item;
    } catch {
      return String(item);
    }
  });
}

function startConsoleCapture(context) {
  if (context.console.installed) {
    return;
  }
  if (typeof context.miniProgram.on !== "function") {
    throw new CliError("UNSUPPORTED_RUNTIME_FEATURE", "miniProgram does not support console events");
  }

  const consoleHandler = (message) => {
    context.console.seq += 1;
    const args = sanitizeConsoleArgs(message?.args ?? []);
    context.console.messages.push({
      msgid: `msg_${Date.now()}_${context.console.seq}`,
      type: message?.type ?? "log",
      args,
      message: args.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" "),
      timestamp: new Date().toISOString(),
    });
  };
  const exceptionHandler = (error) => {
    context.console.seq += 1;
    context.console.exceptions.push({
      msgid: `msg_${Date.now()}_${context.console.seq}`,
      type: "exception",
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      timestamp: new Date().toISOString(),
    });
  };

  context.miniProgram.on("console", consoleHandler);
  context.miniProgram.on("exception", exceptionHandler);
  context.console.handlers = { consoleHandler, exceptionHandler };
  context.console.installed = true;
}

function stopConsoleCapture(context) {
  if (!context.console.installed || !context.console.handlers || typeof context.miniProgram.off !== "function") {
    return;
  }
  context.miniProgram.off("console", context.console.handlers.consoleHandler);
  context.miniProgram.off("exception", context.console.handlers.exceptionHandler);
  context.console.installed = false;
  context.console.handlers = null;
}

function listConsoleCapture(context, step) {
  const includeExceptions = step.includeExceptions !== false;
  const types = Array.isArray(step.types) ? new Set(step.types) : null;
  const pageSize = step.pageSize ?? 50;
  const pageIdx = step.pageIdx ?? 0;
  const messages = context.console.messages.filter((message) => !types || types.has(message.type));
  const exceptions = includeExceptions ? context.console.exceptions : [];
  const all = [...messages, ...exceptions].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return {
    installed: context.console.installed,
    total: all.length,
    messageCount: messages.length,
    exceptionCount: exceptions.length,
    pageIdx,
    pageSize,
    entries: all.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
  };
}

async function executeStep(context, step, index) {
  if (!step || typeof step !== "object") {
    throw new CliError("INVALID_ARGUMENT", "workflow step must be an object", {
      details: { index },
    });
  }

  const type = step.type;
  switch (type) {
    case "currentPage": {
      const page = await getCurrentPage(context);
      return pageInfo(page);
    }
    case "pageStack": {
      const pages = await context.miniProgram.pageStack();
      return {
        count: pages.length,
        pages: pages.map((page, pageIndex) => ({
          index: pageIndex,
          path: page.path,
          query: page.query ?? {},
          current: pageIndex === pages.length - 1,
        })),
      };
    }
    case "pageData": {
      const page = await getCurrentPage(context);
      const data = await page.data(step.path);
      return truncateForJson(data, step.maxJsonBytes ?? 20000);
    }
    case "systemInfo": {
      const info = await context.miniProgram.systemInfo();
      return truncateForJson(info, step.maxJsonBytes ?? 20000);
    }
    case "appGlobalData": {
      const result = await context.miniProgram.evaluate(function readGlobalData() {
        const app = typeof getApp !== "undefined" ? getApp() : null;
        return app ? app.globalData || {} : null;
      });
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "launchOptions": {
      const result = await context.miniProgram.callWxMethod("getLaunchOptionsSync");
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "navigateTo": {
      if (!step.url) throw new CliError("INVALID_ARGUMENT", "navigateTo requires url");
      const page = await context.miniProgram.navigateTo(step.url);
      context.currentPage = page;
      context.elementMap.clear();
      return pageInfo(page);
    }
    case "reLaunch": {
      if (!step.url) throw new CliError("INVALID_ARGUMENT", "reLaunch requires url");
      const page = await context.miniProgram.reLaunch(step.url);
      context.currentPage = page;
      context.elementMap.clear();
      return { ...(await pageInfo(page)), sideEffects: ["mini-program-relaunch"] };
    }
    case "switchTab": {
      if (!step.url) throw new CliError("INVALID_ARGUMENT", "switchTab requires url");
      const page = await context.miniProgram.switchTab(step.url);
      context.currentPage = page;
      context.elementMap.clear();
      return pageInfo(page);
    }
    case "wait":
      return waitStep(context, step);
    case "query": {
      const page = await getCurrentPage(context);
      return queryElements(page, step.selector, context.elementMap, {
        all: step.all,
        timeoutMs: step.timeoutMs,
        propertyTimeoutMs: step.propertyTimeoutMs,
        includePosition: step.includePosition,
        includeText: step.includeText,
        includeValue: step.includeValue,
      });
    }
    case "snapshot": {
      const page = await getCurrentPage(context);
      return getPageSnapshot(page, context.elementMap, {
        selector: step.selector,
        timeoutMs: step.timeoutMs,
        propertyTimeoutMs: step.propertyTimeoutMs,
        maxElements: step.maxElements,
        includePosition: step.includePosition,
        includeText: step.includeText,
        includeValue: step.includeValue,
      });
    }
    case "tap": {
      const element = getElement(context, step.uid);
      await element.tap();
      return { uid: step.uid, sideEffects: ["tap"] };
    }
    case "longpress": {
      const element = getElement(context, step.uid);
      if (typeof element.longpress !== "function") {
        throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support longpress()", {
          details: { uid: step.uid },
        });
      }
      await element.longpress();
      return { uid: step.uid, sideEffects: ["longpress"] };
    }
    case "input": {
      const element = getElement(context, step.uid);
      if (typeof element.input !== "function") {
        throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support input()", {
          details: { uid: step.uid },
        });
      }
      await element.input(String(step.text ?? ""));
      return { uid: step.uid, textLength: String(step.text ?? "").length, sideEffects: ["input"] };
    }
    case "elementText": {
      const element = getElement(context, step.uid);
      if (typeof element.text !== "function") throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support text()");
      return truncateForJson(await element.text(), step.maxJsonBytes ?? 20000);
    }
    case "elementValue": {
      const element = getElement(context, step.uid);
      if (typeof element.value !== "function") throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support value()");
      return truncateForJson(await element.value(), step.maxJsonBytes ?? 20000);
    }
    case "elementAttribute": {
      const element = getElement(context, step.uid);
      if (!step.name) throw new CliError("INVALID_ARGUMENT", "elementAttribute requires name");
      if (typeof element.attribute !== "function") throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support attribute()");
      return truncateForJson(await element.attribute(step.name), step.maxJsonBytes ?? 20000);
    }
    case "elementProperty": {
      const element = getElement(context, step.uid);
      if (!step.name) throw new CliError("INVALID_ARGUMENT", "elementProperty requires name");
      if (typeof element.property !== "function") throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support property()");
      return truncateForJson(await element.property(step.name), step.maxJsonBytes ?? 20000);
    }
    case "elementTrigger": {
      const element = getElement(context, step.uid);
      if (!step.eventName) throw new CliError("INVALID_ARGUMENT", "elementTrigger requires eventName");
      if (typeof element.trigger !== "function") throw new CliError("UNSUPPORTED_ELEMENT_ACTION", "target element does not support trigger()");
      await element.trigger(step.eventName, step.detail ?? {});
      return { uid: step.uid, eventName: step.eventName, sideEffects: [`trigger:${step.eventName}`] };
    }
    case "elementScreenshot": {
      const element = getElement(context, step.uid);
      return cropElementScreenshot(context.miniProgram, element, step.output, context.workspaceRoot, {
        padding: step.padding,
        pixelRatio: step.pixelRatio,
      });
    }
    case "callWxMethod": {
      if (!step.method) throw new CliError("INVALID_ARGUMENT", "callWxMethod requires method");
      assertSafeWxMethod(step.method, step.allowUnsafe);
      const result = await context.miniProgram.callWxMethod(step.method, ...(step.args ?? []));
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "mockWxMethod": {
      if (!step.method) throw new CliError("INVALID_ARGUMENT", "mockWxMethod requires method");
      if (!("result" in step) && !step.function) {
        throw new CliError("INVALID_ARGUMENT", "mockWxMethod requires result or function");
      }
      if (step.function) {
        await context.miniProgram.mockWxMethod(step.method, step.function, ...(step.args ?? []));
      } else {
        await context.miniProgram.mockWxMethod(step.method, step.result, ...(step.args ?? []));
      }
      return { method: step.method, sideEffects: [`wx.${step.method} mocked`] };
    }
    case "restoreWxMethod": {
      if (!step.method) throw new CliError("INVALID_ARGUMENT", "restoreWxMethod requires method");
      await context.miniProgram.restoreWxMethod(step.method);
      return { method: step.method, sideEffects: [`wx.${step.method} restored`] };
    }
    case "storageGet": {
      if (!step.key) throw new CliError("INVALID_ARGUMENT", "storageGet requires key");
      const result = await context.miniProgram.callWxMethod("getStorageSync", step.key);
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "storageSet": {
      if (!step.key) throw new CliError("INVALID_ARGUMENT", "storageSet requires key");
      await context.miniProgram.callWxMethod("setStorageSync", step.key, step.value);
      return { key: step.key, sideEffects: ["storage:set"] };
    }
    case "storageRemove": {
      if (!step.key) throw new CliError("INVALID_ARGUMENT", "storageRemove requires key");
      await context.miniProgram.callWxMethod("removeStorageSync", step.key);
      return { key: step.key, sideEffects: ["storage:remove"] };
    }
    case "storageClear": {
      if (step.confirm !== true) {
        throw new CliError("STORAGE_CLEAR_REQUIRES_CONFIRMATION", "storageClear requires confirm:true", {
          suggestions: ["Use storageRemove for a single key or pass confirm:true for an explicit full clear."],
        });
      }
      await context.miniProgram.callWxMethod("clearStorageSync");
      return { sideEffects: ["storage:clear"] };
    }
    case "setPageData": {
      const page = await getCurrentPage(context);
      if (!step.data || typeof step.data !== "object" || Array.isArray(step.data)) {
        throw new CliError("INVALID_ARGUMENT", "setPageData requires data object");
      }
      await page.setData(step.data);
      return { keys: Object.keys(step.data), sideEffects: ["page:setData"] };
    }
    case "callPageMethod": {
      const page = await getCurrentPage(context);
      if (!step.method) throw new CliError("INVALID_ARGUMENT", "callPageMethod requires method");
      const result = await page.callMethod(step.method, ...(step.args ?? []));
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "pageSize": {
      const page = await getCurrentPage(context);
      return page.size();
    }
    case "scrollTop": {
      const page = await getCurrentPage(context);
      return truncateForJson(await page.scrollTop(), step.maxJsonBytes ?? 20000);
    }
    case "pageScrollTo": {
      if (!Number.isFinite(step.scrollTop)) throw new CliError("INVALID_ARGUMENT", "pageScrollTo requires numeric scrollTop");
      await context.miniProgram.pageScrollTo(step.scrollTop);
      return { scrollTop: step.scrollTop, sideEffects: ["page:scroll"] };
    }
    case "evaluate": {
      if (!step.function) throw new CliError("INVALID_ARGUMENT", "evaluate requires function");
      const result = await context.miniProgram.evaluate(step.function, ...(step.args ?? []));
      return truncateForJson(result, step.maxJsonBytes ?? 20000);
    }
    case "screenshot": {
      if (!step.output) {
        throw new CliError("OUTPUT_REQUIRED", "screenshot step requires output path");
      }
      const output = resolveInsideWorkspace(step.output, context.workspaceRoot, "steps[].output", { output: true });
      await context.miniProgram.screenshot({ path: output });
      return { output, sideEffects: ["write-file"] };
    }
    case "startConsole": {
      startConsoleCapture(context);
      return { installed: true, sideEffects: [] };
    }
    case "listConsole":
      return listConsoleCapture(context, step);
    case "clearConsole": {
      const cleared = context.console.messages.length + context.console.exceptions.length;
      context.console.messages = [];
      context.console.exceptions = [];
      return { cleared };
    }
    case "networkInstall":
      return installNetworkMonitoring(context.miniProgram, step.options ?? {});
    case "networkList": {
      validateNetworkOptions("networkList", step.options ?? {});
      return listNetworkEvents(context.miniProgram, step.options ?? {});
    }
    case "networkClear":
      return clearNetworkEvents(context.miniProgram);
    case "networkRestore":
      return restoreNetworkMonitoring(context.miniProgram);
    case "mediaInstall":
      return runMediaAction(context.miniProgram, "install", step.options ?? {}, context.workspaceRoot);
    case "mediaList":
      return runMediaAction(context.miniProgram, "list", step.options ?? {}, context.workspaceRoot);
    case "mediaAction": {
      if (!step.action) throw new CliError("INVALID_ARGUMENT", "mediaAction requires action");
      return runMediaAction(context.miniProgram, step.action, step.options ?? {}, context.workspaceRoot);
    }
    default:
      throw new CliError("UNSUPPORTED_STEP", "unsupported workflow step", {
        details: { type, index },
      });
  }
}

export async function runWorkflow(workflow, options = {}) {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    throw new CliError("INVALID_ARGUMENT", "workflow must be an object");
  }

  const connect = options.connectOverride ?? workflow.connect;
  const steps = workflow.steps;
  if (!Array.isArray(steps)) {
    throw new CliError("INVALID_ARGUMENT", "workflow.steps must be an array");
  }

  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const { miniProgram, connection } = await connectMiniProgram(connect, workspaceRoot);
  const context = {
    miniProgram,
    currentPage: null,
    elementMap: new Map(),
    console: {
      installed: false,
      messages: [],
      exceptions: [],
      handlers: null,
      seq: 0,
    },
    workspaceRoot,
  };

  const stepResults = [];
  try {
    for (const [index, step] of steps.entries()) {
      try {
        const result = await executeStep(context, step, index);
        stepResults.push({
          ok: true,
          index,
          id: step.id ?? null,
          type: step.type,
          result,
        });
      } catch (error) {
        const failed = {
          ok: false,
          index,
          id: step.id ?? null,
          type: step.type,
          code: error instanceof CliError ? error.code : "STEP_ERROR",
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof CliError ? error.details : {},
        };
        stepResults.push(failed);
        if (!workflow.options?.continueOnError) {
          throw new CliError("STEP_FAILED", "workflow step failed", {
            details: failed,
            cause: error,
          });
        }
      }
    }

    return {
      ok: true,
      command: "run",
      connection,
      steps: stepResults,
      sideEffects: stepResults.flatMap((item) => item.result?.sideEffects ?? []),
    };
  } finally {
    stopConsoleCapture(context);
    disconnectMiniProgram(miniProgram);
  }
}

export { executeStep };
