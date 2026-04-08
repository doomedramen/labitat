import type { IronSession } from "iron-session"
import { env } from "@/lib/env"

export interface SessionData {
  loggedIn: boolean
  userId: string
}

export function getSessionOptions() {
  const secret = env.SECRET_KEY
  if (!secret || secret.length < 32) {
    throw new Error(
      "SECRET_KEY must be at least 32 characters. " +
        "Set it via: export SECRET_KEY=$(openssl rand -base64 32)"
    )
  }

  return {
    cookieName: "labitat-session",
    password: secret,
    cookieOptions: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    },
  } as const
}

export type LabitatSession = IronSession<SessionData>
