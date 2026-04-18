const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Wrapper around global fetch with a request timeout.
 * Aborts the request if it doesn't complete within the specified time.
 * Throws DOMException with name "TimeoutError" on timeout (vs "AbortError" for manual aborts).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let signal: AbortSignal;
  if (init?.signal) {
    if (AbortSignal.any) {
      signal = AbortSignal.any([init.signal, controller.signal]);
    } else {
      // Fallback: forward abort from the caller's signal to our controller
      init.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
      signal = controller.signal;
    }
  } else {
    signal = controller.signal;
  }

  try {
    return await globalThis.fetch(input, { ...init, signal });
  } catch (err) {
    // Handle timeout from our own AbortController
    if (timedOut && err instanceof DOMException && err.name === "AbortError") {
      throw new DOMException("Request timed out", "TimeoutError");
    }
    // Handle native TimeoutError (some runtimes throw this directly)
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new DOMException("Request timed out", "TimeoutError");
    }

    if (err instanceof Error) {
      // Provide more context for common fetch failures
      if (err.message.includes("fetch failed")) {
        // This is the generic Node.js fetch error, usually wrapping a lower-level error
        const cause = (err as any).cause;
        if (cause instanceof Error) {
          throw new Error(`Request failed: ${cause.message}`);
        }
      }
      throw new Error(`Request failed: ${err.message}`);
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
