/** @type {import('next').NextConfig} */
import { withSerwist } from "@serwist/turbopack"

const nextConfig = {
  // Required for Docker standalone output
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
        pathname: '/img/wn/**',
      },
    ],
  },

  // Allowed origins for development (set via NEXT_PUBLIC_ALLOWED_DEV_ORIGINS env var)
  // Example: NEXT_PUBLIC_ALLOWED_DEV_ORIGINS=192.168.1.100 pnpm dev
  allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS.split(",")
    : [],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https: data: blob:",
            "font-src 'self'",
            "connect-src 'self' https:",
            "media-src 'self'",
            "object-src 'none'",
            "frame-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ') },
        ],
      },
      {
        source: '/serwist/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; connect-src 'self' https:;" },
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
