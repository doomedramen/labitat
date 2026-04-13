import { getSession } from "./index";

/** Require authenticated user in server actions. Throws if not logged in. */
export async function requireAuth(): Promise<string> {
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
