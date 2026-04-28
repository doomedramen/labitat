"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hasAdminUser } from "@/lib/db/admin";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

type SetupState = { error: string } | null;

export async function setupAdmin(_: SetupState, formData: FormData): Promise<SetupState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address" };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: "An admin account already exists" };
  }

  const hasUsers = await hasAdminUser();
  if (hasUsers) {
    return { error: "An admin account already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = nanoid();

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    role: "admin",
  });

  const session = await getSession();
  session.loggedIn = true;
  session.userId = id;
  await session.save();

  redirect("/");
}

type LoginState = { error: string } | null;

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await getUserByEmail(email);

  // Real bcrypt hash of a dummy password — ensures consistent timing whether the user exists or not
  const dummyHash = "$2b$12$KICHgWshYqLVNz3OHsBQ2OzWOf3Vx8vXHGKf0y3Xl7RPNqQlF9qTu";
  const hashToCompare = user ? user.passwordHash : dummyHash;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    return { error: "Invalid email or password" };
  }

  const session = await getSession();
  session.loggedIn = true;
  session.userId = user.id;
  await session.save();

  redirect("/");
}

export async function logout() {
  "use server";

  const session = await getSession();
  session.destroy();
  await session.save();
  revalidatePath("/");
  redirect("/");
}
