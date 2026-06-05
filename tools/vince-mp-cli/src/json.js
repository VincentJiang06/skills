import { CliError } from "./errors.js";

export async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

export function parseJson(text, fieldName = "json") {
  if (!text || typeof text !== "string") {
    throw new CliError("INVALID_JSON", `${fieldName} must be a non-empty JSON string`, {
      details: { fieldName },
    });
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError("INVALID_JSON", `${fieldName} is not valid JSON`, {
      details: { fieldName, error: error instanceof Error ? error.message : String(error) },
    });
  }
}

export function writeJson(value, stream = process.stdout) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function truncateForJson(value, maxJsonBytes = 20000) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    return {
      value: null,
      truncated: false,
      jsonBytes: 0,
    };
  }
  if (encoded.length <= maxJsonBytes) {
    return {
      value,
      truncated: false,
      jsonBytes: encoded.length,
    };
  }

  return {
    value: {
      truncatedJsonPreview: encoded.slice(0, Math.max(0, maxJsonBytes)),
    },
    truncated: true,
    jsonBytes: encoded.length,
  };
}
