import { getSession } from "./index";
import { env } from "@/lib/env";

/** Enforce edit authorization in server actions. Public mode bypasses the session check. */
export async function requireAuth(): Promise<string> {
  if (!env.AUTH_ENABLED) return "public-access";

  const session = await getSession();
  if (!session.loggedIn || !session.userId) {
    throw new Error("Unauthorized");
  }
  return session.userId;
}

/** Check if user is authenticated (no redirect) */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.loggedIn;
}

/** Check whether this request may mutate dashboard configuration. */
export async function hasEditAccess(): Promise<boolean> {
  if (!env.AUTH_ENABLED) return true;
  return isAuthenticated();
}
