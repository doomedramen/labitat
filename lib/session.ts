import type { SessionOptions } from "iron-session"
import { env } from "./env"

export type SessionData = {
  userId?: string
  loggedIn?: boolean
}

export const sessionOptions: SessionOptions = {
  password: env.SECRET_KEY,
  cookieName: "labitat_session",
  cookieOptions: {
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
}
