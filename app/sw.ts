/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  HandlerDidErrorCallbackParam,
} from "serwist"
import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
} from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

function documentMatcher({ request }: HandlerDidErrorCallbackParam) {
  return request.destination === "document"
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/.*/],
  },
  runtimeCaching: [
    // API routes: network-first with timeout, no caching for auth endpoints
    {
      matcher: ({ url: { pathname } }) => pathname.startsWith("/api/auth/"),
      handler: new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Other API routes: network-first with caching
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Static JS assets (Next.js hashes filenames — immutable)
    {
      matcher: /\.(?:js)$/i,
      handler: new CacheFirst({
        cacheName: "static-js-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 48,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Static image assets
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new CacheFirst({
        cacheName: "static-image-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Static CSS assets (Next.js hashes filenames — immutable)
    {
      matcher: /\.(?:css|less)$/i,
      handler: new CacheFirst({
        cacheName: "static-style-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Static font assets (immutable once deployed)
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: new CacheFirst({
        cacheName: "static-font-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Static data files (JSON, XML, CSV)
    {
      matcher: /\.(?:json|xml|csv)$/i,
      handler: new NetworkFirst({
        cacheName: "static-data-assets",
        networkTimeoutSeconds: 10,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Selfhst icons from jsdelivr CDN: cache-first (immutable, versioned URLs)
    {
      matcher: ({ url }) =>
        url.hostname === "cdn.jsdelivr.net" &&
        url.pathname.startsWith("/gh/selfhst/icons"),
      handler: new CacheFirst({
        cacheName: "selfhst-icons",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 1 month
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Cross-origin requests (e.g. weather API)
    {
      matcher: ({ sameOrigin }) => !sameOrigin,
      handler: new NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 60 * 60,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // All other same-origin requests: stale-while-revalidate
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && !pathname.startsWith("/api/"),
      handler: new StaleWhileRevalidate({
        cacheName: "others",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
            maxAgeFrom: "last-used",
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: documentMatcher,
      },
    ],
  },
})

serwist.addEventListeners()
