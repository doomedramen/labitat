import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchWithTimeout } from "./fetch-with-timeout"

describe("fetchWithTimeout", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("resolves within timeout", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"))

    const res = await fetchWithTimeout("https://example.com", undefined, 5000)

    expect(res.ok).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it("aborts when timeout exceeded", async () => {
    // Return a fetch that hangs forever but reacts to abort
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        })
      }
    ) as typeof globalThis.fetch

    // Use a short timeout so the test runs fast
    await expect(
      fetchWithTimeout("https://example.com", undefined, 50)
    ).rejects.toThrow("Request timed out")
  })

  it("respects custom timeout", async () => {
    let abortReason: string | null = null

    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            abortReason = "timeout"
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        })
      }
    ) as typeof globalThis.fetch

    const start = Date.now()
    await expect(
      fetchWithTimeout("https://example.com", undefined, 100)
    ).rejects.toThrow()

    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(80) // ~100ms (with margin)
    expect(elapsed).toBeLessThan(500) // But not too long
    expect(abortReason).toBe("timeout")
  })

  it("merges user-provided signal", async () => {
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        })
      }
    ) as typeof globalThis.fetch

    const userController = new AbortController()

    const promise = fetchWithTimeout(
      "https://example.com",
      { signal: userController.signal },
      10_000 // Long timeout — we'll abort via user signal
    )

    // Abort via user signal before timeout fires
    userController.abort()
    await expect(promise).rejects.toThrow("aborted")
  })
})
