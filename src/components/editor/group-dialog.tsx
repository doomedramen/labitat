"use client"

import React from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { formatErrors } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createGroup, updateGroup } from "@/actions/groups"
import { toast } from "sonner"
import type { GroupWithCache } from "@/lib/types"

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required."),
})

interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupWithCache | null
}

export function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
  const form = useForm({
    defaultValues: {
      name: group?.name ?? "",
    },
    validators: {
      onChange: groupSchema,
      onBlur: groupSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const formData = new FormData()
        formData.append("name", value.name)
        if (group) {
          await updateGroup(group.id, formData)
        } else {
          await createGroup(formData)
        }
        onOpenChange(false)
      } catch {
        toast.error(group ? "Failed to update group" : "Failed to create group")
      }
    },
  })

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.setFieldValue("name", group?.name ?? "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is a stable reference from useForm
  }, [open, group?.name])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <DialogHeader>
              <DialogTitle>{group ? "Edit Group" : "New Group"}</DialogTitle>
              <DialogDescription>
                {group
                  ? "Update the group name."
                  : "Create a new group to organize your items."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <form.Field name="name">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Name</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="My Services"
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{group ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
