import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LoginPage() {
  const session = await getSession()
  if (session.loggedIn) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
