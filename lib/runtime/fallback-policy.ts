const fallbackDisabledMessage =
  "Persistent data is unavailable. Mock fallback is disabled outside development.";

export function allowDevelopmentFallbacks() {
  return process.env.NODE_ENV !== "production";
}

export function getFallbackDisabledError() {
  return new Error(fallbackDisabledMessage);
}

export function logFallbackSuppressed(context: string, error?: unknown) {
  console.error(`${context} ${fallbackDisabledMessage}`, error);
}
