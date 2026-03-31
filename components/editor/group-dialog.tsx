"use client"

import { useTransition, useState } from "react"
import { createGroup, updateGroup } from "@/actions/groups"
import type { GroupRow } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type GroupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupRow | null
}

export function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = group !== null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateGroup(group.id, formData)
        } else {
          await createGroup(formData)
        }
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent data-testid="group-dialog">
        <DialogHeader>
          <DialogTitle data-testid="group-dialog-title">
            {isEdit ? "Edit group" : "Add group"}
          </DialogTitle>
        </DialogHeader>

        {/* key forces inputs to reset when switching between add/edit */}
        <form
          key={group?.id ?? "new"}
          id="group-dialog-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                name="name"
                defaultValue={group?.name ?? ""}
                placeholder="e.g. Media, Networking…"
                autoFocus
                required
                data-testid="group-name-input"
              />
            </div>
            {error && (
              <p
                className="text-sm text-destructive"
                data-testid="group-dialog-error"
              >
                {error}
              </p>
            )}
          </div>
        </form>

        <DialogFooter showCloseButton>
          <Button
            form="group-dialog-form"
            type="submit"
            disabled={isPending}
            data-testid="group-dialog-submit"
          >
            {isPending ? "Saving…" : isEdit ? "Save" : "Add group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
