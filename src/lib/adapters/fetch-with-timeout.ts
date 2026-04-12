const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Wrapper around global fetch with a request timeout.
 * Aborts the request if it doesn't complete within the specified time.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let signal: AbortSignal
  if (init?.signal) {
    if (AbortSignal.any) {
      signal = AbortSignal.any([init.signal, controller.signal])
    } else {
      // Fallback: forward abort from the caller's signal to our controller
      init.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      })
      signal = controller.signal
    }
  } else {
    signal = controller.signal
  }

  try {
    return await globalThis.fetch(input, { ...init, signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
