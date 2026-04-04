"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hasAdminUser } from "@/lib/db/admin"
import { getSession } from "@/lib/auth"
import { eq } from "drizzle-orm"
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/rate-limit"

export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return result[0] ?? null
}

type SetupState = { error: string } | null

export async function setupAdmin(
  _: SetupState,
  formData: FormData
): Promise<SetupState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address" }
  }

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  // Check if a user already exists (race condition protection)
  const existing = await getUserByEmail(email)
  if (existing) {
    return { error: "An admin account already exists" }
  }

  const hasUsers = await hasAdminUser()
  if (hasUsers) {
    return { error: "An admin account already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const id = nanoid()

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    role: "admin",
  })

  // Auto-login after setup
  const session = await getSession()
  session.loggedIn = true
  session.userId = id
  await session.save()

  redirect("/")
}

type LoginState = { error: string } | null

export async function login(
  _: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Rate limit by IP
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown"
  const ipLimit = checkRateLimit(`ip:${ip}`)
  if (!ipLimit.allowed) {
    const mins = Math.ceil((ipLimit.retryAfterMs ?? 0) / 60000)
    return { error: `Too many attempts. Try again in ${mins} minute(s).` }
  }

  // Rate limit by email (account lockout)
  const emailLimit = checkRateLimit(`email:${email}`)
  if (!emailLimit.allowed) {
    const mins = Math.ceil((emailLimit.retryAfterMs ?? 0) / 60000)
    return { error: `This account is locked. Try again in ${mins} minute(s).` }
  }

  const user = await getUserByEmail(email)

  // Always run bcrypt to prevent timing attacks
  const dummyHash =
    "$2b$12$invalidhashpaddinginvalidhashpaddinginvalidhashpadding00"
  const hashToCompare = user ? user.passwordHash : dummyHash
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordMatch) {
    recordFailedAttempt(`ip:${ip}`)
    recordFailedAttempt(`email:${email}`)
    return { error: "Invalid email or password" }
  }

  // Reset rate limits on successful login
  resetRateLimit(`ip:${ip}`)
  resetRateLimit(`email:${email}`)

  const session = await getSession()
  session.loggedIn = true
  session.userId = user.id
  await session.save()

  redirect("/")
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  redirect("/")
}
