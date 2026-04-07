import { spawnSync } from "node:child_process"
import { createSerwistRoute } from "@serwist/turbopack"
import { NextResponse } from "next/server"

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() ?? crypto.randomUUID()

// Disable service worker in development and test environments
// to avoid cache issues during development
const isDevOrTest =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

const serwistRoute = createSerwistRoute({
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/offline", revision },
  ],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
})

export const { dynamic, dynamicParams, revalidate, generateStaticParams } =
  serwistRoute

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string }> }
) {
  if (isDevOrTest) {
    return new NextResponse(null, { status: 404 })
  }
  return serwistRoute.GET(request, context)
}
