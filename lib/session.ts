import type { SessionOptions } from "iron-session"

export type SessionData = {
  userId?: string
  loggedIn?: boolean
}

export function getSessionOptions(): SessionOptions {
  return {
    password: process.env.SECRET_KEY ?? "",
    cookieName: "labitat_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  }
}
