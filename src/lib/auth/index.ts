import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type SessionData } from "./session";

export { getSessionOptions, type SessionData };

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}
