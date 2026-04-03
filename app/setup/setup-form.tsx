"use client"

import { useActionState } from "react"
import { setupAdmin } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAdmin, null)

  return (
    <form
      action={action}
      className="flex flex-col gap-4"
      data-testid="setup-form"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@home.lab"
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
          autoComplete="new-password"
          minLength={6}
          required
          data-testid="password-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          data-testid="confirm-password-input"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" data-testid="setup-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} data-testid="submit-button">
        {pending ? "Creating Account…" : "Create Admin Account"}
      </Button>
    </form>
  )
}
