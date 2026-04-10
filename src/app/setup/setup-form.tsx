"use client"

import { useActionState } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { setupAdmin } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatErrors } from "@/lib/utils"

const setupSchema = z
  .object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(setupAdmin, null)

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onChange: setupSchema,
      onBlur: setupSchema,
    },
    onSubmit: async ({ value }) => {
      const formData = new FormData()
      formData.append("email", value.email)
      formData.append("password", value.password)
      formData.append("confirmPassword", value.confirmPassword)
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
                  {formatErrors(field.state.meta.errors)}
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
                placeholder="At least 6 characters"
                autoComplete="new-password"
                aria-invalid={isInvalid || undefined}
              />
              {isInvalid && (
                <p className="text-sm text-destructive">
                  {formatErrors(field.state.meta.errors)}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>
      <form.Field name="confirmPassword">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Confirm Password</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                aria-invalid={isInvalid || undefined}
              />
              {isInvalid && (
                <p className="text-sm text-destructive">
                  {formatErrors(field.state.meta.errors)}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : "Create Admin Account"}
      </Button>
    </form>
  )
}
