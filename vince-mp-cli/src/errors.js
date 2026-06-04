export class CliError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CliError";
    this.code = code;
    this.details = options.details ?? {};
    this.suggestions = options.suggestions ?? [];
    this.exitCode = options.exitCode ?? 1;
  }
}

export function isCliError(error) {
  return error instanceof CliError;
}

export function toErrorResponse(error) {
  if (isCliError(error)) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      details: error.details,
      suggestions: error.suggestions,
    };
  }

  return {
    ok: false,
    code: "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : String(error),
    details: {},
    suggestions: ["Run the command again with --json and inspect the structured error."],
  };
}

export function wrapAutomatorError(code, message, error, suggestions = []) {
  return new CliError(code, `${message}: ${error instanceof Error ? error.message : String(error)}`, {
    cause: error,
    suggestions,
  });
}

export async function withTimeout(promise, timeoutMs, onTimeout) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(onTimeout()), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
