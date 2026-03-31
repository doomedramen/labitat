import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { sessionOptions, type SessionData } from "./session"

export { sessionOptions, type SessionData }

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
