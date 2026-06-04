import { CliError, withTimeout } from "./errors.js";

function normalizeTagName(tagName) {
  return String(tagName || "element").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

function makeUid(tagName, index) {
  return `${normalizeTagName(tagName)}_${index}`;
}

async function maybeRead(label, reader, timeoutMs) {
  try {
    return await withTimeout(Promise.resolve().then(reader), timeoutMs, () => new CliError(
      "ELEMENT_PROPERTY_TIMEOUT",
      `timed out while reading element ${label}`,
      { details: { label, timeoutMs } },
    ));
  } catch (error) {
    return {
      unavailable: true,
      code: error instanceof CliError ? error.code : "ELEMENT_PROPERTY_ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function summarizeElement(element, uid, options = {}) {
  const propertyTimeoutMs = options.propertyTimeoutMs ?? 500;
  const includePosition = Boolean(options.includePosition);
  const includeText = options.includeText !== false;
  const includeValue = Boolean(options.includeValue);

  const summary = {
    uid,
    tagName: element?.tagName ?? null,
  };

  if (includeText && typeof element?.text === "function") {
    summary.text = await maybeRead("text", () => element.text(), propertyTimeoutMs);
  }

  if (includeValue && typeof element?.value === "function") {
    summary.value = await maybeRead("value", () => element.value(), propertyTimeoutMs);
  }

  if (includePosition) {
    if (typeof element?.size === "function") {
      summary.size = await maybeRead("size", () => element.size(), propertyTimeoutMs);
    }
    if (typeof element?.offset === "function") {
      summary.offset = await maybeRead("offset", () => element.offset(), propertyTimeoutMs);
    }
  }

  return summary;
}

export async function queryElements(page, selector, elementMap, options = {}) {
  if (!selector || typeof selector !== "string") {
    throw new CliError("INVALID_ARGUMENT", "query selector must be a non-empty string", {
      details: { selector },
    });
  }

  const timeoutMs = options.timeoutMs ?? 3000;
  const all = Boolean(options.all);
  const rawElements = await withTimeout(
    all ? page.$$(selector) : page.$(selector),
    timeoutMs,
    () => new CliError("QUERY_TIMEOUT", "timed out while querying elements", {
      details: { selector, timeoutMs },
    }),
  );

  const elements = all ? rawElements ?? [] : rawElements ? [rawElements] : [];
  const summaries = [];
  for (const [index, element] of elements.entries()) {
    const uid = makeUid(element?.tagName ?? "element", elementMap.size + index);
    elementMap.set(uid, element);
    summaries.push(await summarizeElement(element, uid, options));
  }

  return {
    selector,
    count: summaries.length,
    elements: summaries,
  };
}

export async function getPageSnapshot(page, elementMap, options = {}) {
  if (!page) {
    throw new CliError("CONNECT_REQUIRED", "current page is not available");
  }

  const timeoutMs = options.timeoutMs ?? 3000;
  const maxElements = options.maxElements ?? 100;
  const selector = options.selector ?? "*";

  let elements;
  try {
    elements = await withTimeout(
      page.$$(selector),
      timeoutMs,
      () => new CliError("SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT", "timed out while enumerating page elements", {
        details: { selector, timeoutMs },
        suggestions: ["Treat route/pageData as partial evidence and do not perform uid-based actions."],
      }),
    );
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError("SNAPSHOT_ELEMENT_ENUMERATION_FAILED", "failed to enumerate page elements", {
      details: { selector, message: error instanceof Error ? error.message : String(error) },
    });
  }

  const limited = Array.isArray(elements) ? elements.slice(0, maxElements) : [];
  elementMap.clear();

  const summaries = [];
  for (const [index, element] of limited.entries()) {
    const uid = makeUid(element?.tagName ?? "element", index);
    elementMap.set(uid, element);
    summaries.push(await summarizeElement(element, uid, options));
  }

  return {
    path: page.path ?? null,
    selector,
    elementCount: Array.isArray(elements) ? elements.length : 0,
    returnedCount: summaries.length,
    truncated: Array.isArray(elements) && elements.length > limited.length,
    elements: summaries,
  };
}
