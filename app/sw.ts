/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker"
import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  RouteMatchCallbackOptions,
  HandlerDidErrorCallbackParam,
} from "serwist"
import { Serwist, StaleWhileRevalidate, ExpirationPlugin } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Typed matcher helpers
function rscPrefetchMatcher({
  request,
  url: { pathname },
  sameOrigin,
}: RouteMatchCallbackOptions) {
  return (
    request.headers.get("RSC") === "1" &&
    request.headers.get("Next-Router-Prefetch") === "1" &&
    sameOrigin &&
    !pathname.startsWith("/api/")
  )
}

function rscNavigationMatcher({
  request,
  url: { pathname },
  sameOrigin,
}: RouteMatchCallbackOptions) {
  return (
    request.headers.get("RSC") === "1" &&
    sameOrigin &&
    !pathname.startsWith("/api/")
  )
}

function htmlMatcher({
  request,
  url: { pathname },
  sameOrigin,
}: RouteMatchCallbackOptions) {
  return (
    request.headers.get("Content-Type")?.includes("text/html") &&
    sameOrigin &&
    !pathname.startsWith("/api/")
  )
}

function documentMatcher({ request }: HandlerDidErrorCallbackParam) {
  return request.destination === "document"
}

// Custom caching strategies for Next.js-specific requests
const cacheStrategies = [
  // RSC Prefetch: triggered when hovering over links
  {
    matcher: rscPrefetchMatcher,
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc-prefetch",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // RSC Navigation: triggered when users click links for page navigation
  {
    matcher: rscNavigationMatcher,
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // HTML Document (Page Shell): triggered on first visit or hard refresh
  {
    matcher: htmlMatcher,
    handler: new StaleWhileRevalidate({
      cacheName: "pages",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...cacheStrategies, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: documentMatcher,
      },
    ],
  },
})

serwist.addEventListeners()
