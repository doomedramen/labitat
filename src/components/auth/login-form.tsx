"use client"

import { useActionState } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { login } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null)

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
      onBlur: loginSchema,
    },
    onSubmit: async ({ value }) => {
      const formData = new FormData()
      formData.append("email", value.email)
      formData.append("password", value.password)
      await formAction(formData)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field name="email">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="email"
                placeholder="admin@example.org"
                autoComplete="email"
                aria-invalid={isInvalid || undefined}
              />
              {isInvalid && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>
      <form.Field name="password">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Password</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={isInvalid || undefined}
              />
              {isInvalid && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>
      {state?.error && (
        <p data-testid="login-error" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  )
}
