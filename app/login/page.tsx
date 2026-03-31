import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const session = await getSession()
  if (session.loggedIn) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <LoginForm />
    </main>
  )
}
