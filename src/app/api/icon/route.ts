import { type NextRequest, NextResponse } from "next/server";

// Cache icons for 24 h on the server, allow browsers to serve stale for 7 days
// while revalidating in the background.
const CACHE_MAX_AGE = 60 * 60 * 24; // 24 h
const CACHE_SWR = 60 * 60 * 24 * 7; // 7 days
const FETCH_TIMEOUT_MS = 5000; // 5 second timeout

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: CACHE_MAX_AGE },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("Only http/https URLs are allowed", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(raw, FETCH_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new NextResponse("Icon fetch timed out", { status: 504 });
    }
    return new NextResponse("Failed to fetch icon", { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_SWR}`,
    },
  });
}
