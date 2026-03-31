import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { sessionOptions, type SessionData } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect to dashboard if already logged in and visiting /login
  if (pathname === "/login") {
    const response = NextResponse.next()
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    )
    if (session.loggedIn) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login"],
}
