import { db } from "./index";
import { users } from "./schema";

/** Check whether at least one user exists in the database */
export async function hasAdminUser(): Promise<boolean> {
  try {
    const result = await db.select({ count: users.id }).from(users).limit(1);
    return result.length > 0;
  } catch {
    // Table might not exist yet if migrations haven't run
    return false;
  }
}
