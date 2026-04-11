/**
 * Adapter Mock Utilities
 *
 * Provides mock data generators and request handlers for all service adapters.
 * These mocks can be used in both unit tests (Vitest) and e2e tests (Playwright).
 *
 * ## Usage in Unit Tests (Vitest)
 *
 * ```ts
 * import { createMockAdapter, radarrMocks } from '@/tests/helpers/adapter-mocks'
 *
 * // Setup mock fetch responses
 * const mockAdapter = createMockAdapter()
 * mockAdapter.setup(radarrMocks.success())
 *
 * // Or use the convenience wrapper
 * import { withMockAdapter } from '@/tests/helpers/adapter-mocks'
 *
 * await withMockAdapter(radarrMocks.success(), async () => {
 *   const result = await radarrDefinition.fetchData(config)
 *   expect(result.queued).toBe(5)
 * })
 * ```
 *
 * ## Usage in E2E Tests (Playwright)
 *
 * ```ts
 * import { createPlaywrightMockAdapter, radarrMocks } from '@/tests/helpers/adapter-mocks'
 *
 * test('dashboard with radarr widget', async ({ page }) => {
 *   const mockAdapter = createPlaywrightMockAdapter(page)
 *   mockAdapter.setup(radarrMocks.success())
 *
 *   await page.goto('/dashboard')
 *   // Radarr widget will use mocked API responses
 * })
 * ```
 */

import type { Page } from "@playwright/test"

// ── Types ───────────────────────────────────────────────────────────────────────

/**
 * Mock response definition that can be used to setup fetch mocks
 */
export type MockResponse = {
  /** URL pattern to match (string or regex) */
  urlPattern: string | RegExp
  /** HTTP status code */
  status?: number
  /** Response body (will be JSON stringified if object) */
  body: unknown
  /** Response headers */
  headers?: Record<string, string>
  /** Simulate network error instead of returning a response */
  networkError?: boolean
}

/**
 * Mock adapter instance that provides setup and teardown methods
 */
export type MockAdapter = {
  /** Setup mock fetch responses */
  setup: (...responses: MockResponse[]) => void
  /** Remove all mock fetch responses */
  teardown: () => void
  /** Get all recorded requests */
  getRequests: () => RecordedRequest[]
  /** Clear recorded requests */
  clearRequests: () => void
}

export type RecordedRequest = {
  url: string
  method: string
  headers?: Record<string, string>
  timestamp: number
}

// ── URL Pattern Matchers ────────────────────────────────────────────────────────

/**
 * Create URL matchers for common API patterns used by adapters
 */
export const urlPatterns = {
  /** Match base URL with optional trailing slash */
  base: (baseUrl: string) => new RegExp(`^${baseUrl.replace(/\/$/, "")}/?`),

  /** Match API endpoint with path segments */
  api: (baseUrl: string, path: string) =>
    new RegExp(`^${baseUrl.replace(/\/$/, "")}${path}`),

  /** Match with query parameters (partial match) */
  withQuery: (
    baseUrl: string,
    path: string,
    queryParams: Record<string, string>
  ) => {
    const base = `${baseUrl.replace(/\/$/, "")}${path}`
    const params = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
    return new RegExp(
      `${base}.*${params.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}`
    )
  },

  /** Match any URL containing a substring */
  contains: (substring: string) =>
    new RegExp(substring.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")),

  /** Match exact URL */
  exact: (url: string) =>
    new RegExp(`^${url.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}$`),
}

// ── Response Builders ───────────────────────────────────────────────────────────

/**
 * Create a successful JSON response
 */
export function successResponse(
  urlPattern: string | RegExp,
  body: unknown,
  status = 200,
  headers: Record<string, string> = { "Content-Type": "application/json" }
): MockResponse {
  return { urlPattern, status, body, headers }
}

/**
 * Create an error response
 */
export function errorResponse(
  urlPattern: string | RegExp,
  status: number,
  body: unknown = { error: `HTTP ${status}` }
): MockResponse {
  return { urlPattern, status, body }
}

/**
 * Create a network error response (simulates fetch rejection)
 */
export function networkErrorResponse(
  urlPattern: string | RegExp
): MockResponse {
  return { urlPattern, networkError: true, body: null }
}

// ── Vitest Mock Adapter ─────────────────────────────────────────────────────────

/**
 * Create a mock adapter for Vitest unit tests
 * Mocks the global fetch function
 */
export function createMockAdapter(): MockAdapter {
  const responses: MockResponse[] = []
  const requests: RecordedRequest[] = []
  let originalFetch: typeof global.fetch

  return {
    setup(...newResponses) {
      responses.push(...newResponses)
      originalFetch = global.fetch

      global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url
        const method = init?.method || "GET"
        const headers = init?.headers as Record<string, string> | undefined

        requests.push({
          url,
          method,
          headers,
          timestamp: Date.now(),
        })

        // Find matching response
        const match = responses.find((r) => {
          if (typeof r.urlPattern === "string") {
            return url.includes(r.urlPattern)
          }
          return r.urlPattern.test(url)
        })

        if (!match) {
          throw new Error(`No mock response found for URL: ${url}`)
        }

        if (match.networkError) {
          throw new TypeError("Network request failed")
        }

        return new Response(
          typeof match.body === "string"
            ? match.body
            : JSON.stringify(match.body),
          {
            status: match.status || 200,
            headers: match.headers,
          }
        )
      }
    },

    teardown() {
      responses.length = 0
      requests.length = 0
      if (originalFetch) {
        global.fetch = originalFetch
      }
    },

    getRequests() {
      return [...requests]
    },

    clearRequests() {
      requests.length = 0
    },
  }
}

/**
 * Convenience wrapper that automatically sets up and tears down mocks
 */
export async function withMockAdapter<T>(
  responses: MockResponse | MockResponse[],
  fn: () => Promise<T>
): Promise<T> {
  const adapter = createMockAdapter()
  const responseArray = Array.isArray(responses) ? responses : [responses]
  adapter.setup(...responseArray)

  try {
    return await fn()
  } finally {
    adapter.teardown()
  }
}

// ── Playwright Mock Adapter ─────────────────────────────────────────────────────

/**
 * Create a mock adapter for Playwright e2e tests
 * Uses Playwright's route interception
 */
export function createPlaywrightMockAdapter(page: Page) {
  const responses: MockResponse[] = []
  const requests: RecordedRequest[] = []

  return {
    setup(...newResponses: MockResponse[]) {
      responses.push(...newResponses)

      page.route("**/*", async (route) => {
        const request = route.request()
        const url = request.url()

        requests.push({
          url,
          method: request.method(),
          timestamp: Date.now(),
        })

        // Find matching response
        const match = responses.find((r) => {
          if (typeof r.urlPattern === "string") {
            return url.includes(r.urlPattern)
          }
          return r.urlPattern.test(url)
        })

        if (!match) {
          // Continue with real request if no match
          return route.continue()
        }

        if (match.networkError) {
          return route.abort("failed")
        }

        await route.fulfill({
          status: match.status || 200,
          headers: match.headers,
          body:
            typeof match.body === "string"
              ? match.body
              : JSON.stringify(match.body),
        })
      })
    },

    teardown() {
      responses.length = 0
      requests.length = 0
      page.unroute("**/*")
    },

    getRequests() {
      return [...requests]
    },

    clearRequests() {
      requests.length = 0
    },
  }
}

// ── Factory Helpers ─────────────────────────────────────────────────────────────

/**
 * Create a mock response for a JSON API endpoint
 */
export function mockApi(
  baseUrl: string,
  path: string,
  body: unknown,
  queryParams?: Record<string, string>
): MockResponse {
  const pattern = queryParams
    ? urlPatterns.withQuery(baseUrl, path, queryParams)
    : urlPatterns.api(baseUrl, path)

  return successResponse(pattern, body)
}

/**
 * Create multiple mock responses for Promise.all calls
 */
export function mockParallel(
  baseUrl: string,
  endpoints: Array<{
    path: string
    body: unknown
    queryParams?: Record<string, string>
  }>
): MockResponse[] {
  return endpoints.map(({ path, body, queryParams }) =>
    mockApi(baseUrl, path, body, queryParams)
  )
}
