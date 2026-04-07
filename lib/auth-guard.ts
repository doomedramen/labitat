import { getSession } from "@/lib/auth"

export async function requireAuth(): Promise<void> {
  const session = await getSession()
  if (!session.loggedIn) throw new Error("Unauthorized")
}
