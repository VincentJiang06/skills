import fs from "node:fs";
import path from "node:path";

import { PNG } from "pngjs";

import { CliError } from "./errors.js";
import { resolveInsideWorkspace } from "./path-policy.js";

function toNumber(value, fieldName) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new CliError("ELEMENT_GEOMETRY_UNAVAILABLE", `element ${fieldName} is not numeric`, {
    details: { fieldName, value },
  });
}

function normalizeOffset(offset) {
  if (!offset || typeof offset !== "object") {
    throw new CliError("ELEMENT_GEOMETRY_UNAVAILABLE", "element offset is unavailable", {
      details: { offset },
    });
  }
  return {
    left: toNumber(offset.left ?? offset.x ?? offset.pageX ?? offset.clientX, "offset.left"),
    top: toNumber(offset.top ?? offset.y ?? offset.pageY ?? offset.clientY, "offset.top"),
  };
}

function normalizeSize(size) {
  if (!size || typeof size !== "object") {
    throw new CliError("ELEMENT_GEOMETRY_UNAVAILABLE", "element size is unavailable", {
      details: { size },
    });
  }
  return {
    width: toNumber(size.width, "size.width"),
    height: toNumber(size.height, "size.height"),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeScale(png, systemInfo, options = {}) {
  if (Number.isFinite(options.pixelRatio) && options.pixelRatio > 0) {
    return { x: options.pixelRatio, y: options.pixelRatio, source: "option" };
  }

  const windowWidth = Number(systemInfo?.windowWidth ?? systemInfo?.screenWidth);
  const windowHeight = Number(systemInfo?.windowHeight ?? systemInfo?.screenHeight);
  if (Number.isFinite(windowWidth) && windowWidth > 0 && Number.isFinite(windowHeight) && windowHeight > 0) {
    return {
      x: png.width / windowWidth,
      y: png.height / windowHeight,
      source: "screenshot/window",
    };
  }

  const pixelRatio = Number(systemInfo?.pixelRatio ?? systemInfo?.devicePixelRatio);
  if (Number.isFinite(pixelRatio) && pixelRatio > 0) {
    return { x: pixelRatio, y: pixelRatio, source: "systemInfo.pixelRatio" };
  }

  return { x: 1, y: 1, source: "fallback" };
}

export async function cropElementScreenshot(miniProgram, element, output, workspaceRoot, options = {}) {
  if (!output) {
    throw new CliError("OUTPUT_REQUIRED", "elementScreenshot requires output path");
  }
  if (!element || typeof element.offset !== "function" || typeof element.size !== "function") {
    throw new CliError("ELEMENT_GEOMETRY_UNAVAILABLE", "element must support offset() and size()");
  }

  const outputPath = resolveInsideWorkspace(output, workspaceRoot, "steps[].output", { output: true });
  const tempPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.full.png`);
  resolveInsideWorkspace(tempPath, workspaceRoot, "steps[].tempOutput", { output: true });

  const [offset, size] = await Promise.all([
    element.offset().then(normalizeOffset),
    element.size().then(normalizeSize),
  ]);

  try {
    await miniProgram.screenshot({ path: tempPath });
    const [systemInfo, png] = await Promise.all([
      typeof miniProgram.systemInfo === "function" ? miniProgram.systemInfo().catch(() => null) : Promise.resolve(null),
      fs.promises.readFile(tempPath).then((buffer) => PNG.sync.read(buffer)),
    ]);

    const padding = Number.isFinite(options.padding) ? Math.max(0, options.padding) : 0;
    const scale = computeScale(png, systemInfo, options);
    const rawX = Math.floor((offset.left - padding) * scale.x);
    const rawY = Math.floor((offset.top - padding) * scale.y);
    const rawWidth = Math.ceil((size.width + padding * 2) * scale.x);
    const rawHeight = Math.ceil((size.height + padding * 2) * scale.y);

    const x = clamp(rawX, 0, png.width);
    const y = clamp(rawY, 0, png.height);
    const width = clamp(rawWidth - Math.max(0, x - rawX), 0, png.width - x);
    const height = clamp(rawHeight - Math.max(0, y - rawY), 0, png.height - y);

    if (width <= 0 || height <= 0) {
      throw new CliError("ELEMENT_SCREENSHOT_BOUNDS_INVALID", "element crop rectangle is outside screenshot bounds", {
        details: {
          offset,
          size,
          screenshot: { width: png.width, height: png.height },
          crop: { x, y, width, height },
        },
      });
    }

    const cropped = new PNG({ width, height });
    PNG.bitblt(png, cropped, x, y, width, height, 0, 0);
    await fs.promises.writeFile(outputPath, PNG.sync.write(cropped));

    return {
      output: outputPath,
      offset,
      size,
      screenshot: { width: png.width, height: png.height },
      scale,
      crop: { x, y, width, height },
      sideEffects: ["write-file", "temporary-full-screenshot"],
    };
  } finally {
    await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
  }
}
