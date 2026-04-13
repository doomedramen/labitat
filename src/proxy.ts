import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, type SessionData } from "@/lib/auth/session";
import { hasAdminUser } from "@/lib/db/admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminExists = await hasAdminUser();

  // Redirect to setup if no admin exists
  if (!adminExists && pathname !== "/setup") {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Redirect away from setup if admin already exists
  if (pathname === "/setup") {
    if (adminExists) {
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, getSessionOptions());
      if (session.loggedIn) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      // Admin exists but not logged in — let them see setup (login page)
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js).*)"],
};
