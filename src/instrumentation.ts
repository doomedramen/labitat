/**
 * Next.js instrumentation — runs once when the server starts.
 * Used to initialize background processes that should be alive
 * before any request is handled.
 */
export async function register() {
  // Only run in Node.js server context (not Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { pollingManager } = await import("@/lib/polling-manager")
    await pollingManager.start()
  }
}
