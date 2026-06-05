import { CliError, withTimeout } from "./errors.js";

function normalizeTagName(tagName) {
  return String(tagName || "element").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

function makeUid(tagName, index) {
  return `${normalizeTagName(tagName)}_${index}`;
}

// Run async `fn` over items with bounded concurrency, preserving result order. Replaces the
// old serial per-element loop so a Skyline snapshot of N elements is N/limit round-trips of
// latency instead of N (the dominant in-call cost on large pages).
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
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

  // Fire the property reads concurrently — they are independent CDP round-trips.
  const reads = [];
  if (includeText && typeof element?.text === "function") {
    reads.push(["text", () => element.text()]);
  }
  if (includeValue && typeof element?.value === "function") {
    reads.push(["value", () => element.value()]);
  }
  if (includePosition && typeof element?.size === "function") {
    reads.push(["size", () => element.size()]);
  }
  if (includePosition && typeof element?.offset === "function") {
    reads.push(["offset", () => element.offset()]);
  }

  const settled = await Promise.all(reads.map(async ([key, reader]) => [key, await maybeRead(key, reader, propertyTimeoutMs)]));
  for (const [key, value] of settled) {
    summary[key] = value;
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
  const base = elementMap.size;
  const summaries = await mapLimit(elements, options.concurrency ?? 8, async (element, index) => {
    const uid = makeUid(element?.tagName ?? "element", base + index);
    elementMap.set(uid, element);
    return summarizeElement(element, uid, options);
  });

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
      suggestions: [
        "Pass a concrete selector (e.g. `snapshot view` or `snapshot .item`); the universal '*' selector is not supported by every renderer.",
      ],
    });
  }

  const limited = Array.isArray(elements) ? elements.slice(0, maxElements) : [];
  elementMap.clear();

  const summaries = await mapLimit(limited, options.concurrency ?? 8, async (element, index) => {
    const uid = makeUid(element?.tagName ?? "element", index);
    elementMap.set(uid, element);
    return summarizeElement(element, uid, options);
  });

  const result = {
    path: page.path ?? null,
    selector,
    elementCount: Array.isArray(elements) ? elements.length : 0,
    returnedCount: summaries.length,
    truncated: Array.isArray(elements) && elements.length > limited.length,
    elements: summaries,
  };

  // A '*' wildcard that yields zero elements is ambiguous: the page may truly be
  // empty, or this renderer may simply not enumerate every node through '*' (the
  // catch above only fires when '*' THROWS — some renderers answer [] instead).
  // Hand the caller a concrete next step so an empty snapshot isn't mistaken for
  // an empty page. Renderer-neutral: helps both WebView and Skyline.
  if (selector === "*" && result.returnedCount === 0) {
    result.hint = "0 elements via the '*' wildcard — the universal '*' selector is not enumerated by every renderer. Pass a concrete selector (e.g. `snapshot view` or `snapshot .item`) to tell a genuinely empty page from an unsupported wildcard.";
  }

  return result;
}
