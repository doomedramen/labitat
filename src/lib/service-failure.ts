/** Categorize failures without exposing response bodies, URLs, or credentials. */
export function serviceFailureReason(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "Service request timed out";
  if (!(error instanceof Error)) return "Unable to reach service";
  if (error.name === "TimeoutError" || /timed? out|timeout/i.test(error.message))
    return "Service request timed out";
  const status = error.message.match(/(?:error:|HTTP)\s*(\d{3})\b/i)?.[1];
  if (status === "401" || status === "403") return `Service authentication failed (HTTP ${status})`;
  if (status === "404") return "Service API endpoint not found (HTTP 404)";
  if (status) return `Service API request failed (HTTP ${status})`;
  if (
    error instanceof SyntaxError ||
    /invalid response|missing required|API response|API returned|expected .* (array|object)|validation/i.test(
      error.message,
    )
  )
    return "Service returned an incompatible API response";
  return "Unable to reach service";
}
