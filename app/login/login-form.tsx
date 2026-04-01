"use client"

import { useActionState } from "react"
import { login } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <form
      action={action}
      className="flex flex-col gap-4"
      data-testid="login-form"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="email-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="password-input"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" data-testid="login-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} data-testid="submit-button">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
