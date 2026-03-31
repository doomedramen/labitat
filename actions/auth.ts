"use server"

import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"
import { loadConfig } from "@/lib/config"

type LoginState = { error: string } | null

export async function login(
  _: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const config = loadConfig()

  // Always run bcrypt.compare to prevent timing attacks even on email mismatch
  const emailMatch = email === config.auth.email
  const hashToCompare = emailMatch
    ? config.auth.passwordHash
    : "$2b$12$invalidhashpaddinginvalidhashpaddinginvalidhashpadding00"
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!emailMatch || !passwordMatch) {
    return { error: "Invalid email or password" }
  }

  const session = await getSession()
  session.loggedIn = true
  session.userId = "admin"
  await session.save()

  redirect("/")
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  redirect("/login")
}
