import { type NextRequest, NextResponse } from "next/server"

// Cache icons for 24 h on the server, allow browsers to serve stale for 7 days
// while revalidating in the background.
const CACHE_MAX_AGE = 60 * 60 * 24 // 24 h
const CACHE_SWR = 60 * 60 * 24 * 7 // 7 days

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")
  if (!raw) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("Only http/https URLs are allowed", { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(raw, {
      // Next.js data cache — avoids re-fetching the same icon on every request
      next: { revalidate: CACHE_MAX_AGE },
    })
  } catch {
    return new NextResponse("Failed to fetch icon", { status: 502 })
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status })
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png"
  const buffer = await upstream.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_SWR}`,
    },
  })
}
