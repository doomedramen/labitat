import type { SessionOptions } from "iron-session"

export type SessionData = {
  userId?: string
  loggedIn?: boolean
}

export function getSessionOptions(): SessionOptions {
  const secret = process.env.SECRET_KEY
  if (!secret) throw new Error("SECRET_KEY environment variable is not set")
  return {
    password: secret,
    cookieName: "labitat_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  }
}
