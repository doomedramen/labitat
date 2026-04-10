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

  const signal = init?.signal
    ? AbortSignal.any
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal
    : controller.signal

  try {
    return await globalThis.fetch(input, { ...init, signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
