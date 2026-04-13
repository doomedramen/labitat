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
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
