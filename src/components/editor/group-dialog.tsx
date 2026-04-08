"use client"

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
import type { GroupWithCache } from "@/lib/types"

interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupWithCache | null
}

export function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
  async function handleSubmit(formData: FormData) {
    if (group) {
      await updateGroup(group.id, formData)
    } else {
      await createGroup(formData)
    }
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form action={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{group ? "Edit Group" : "New Group"}</DialogTitle>
              <DialogDescription>
                {group
                  ? "Update the group name."
                  : "Create a new group to organize your items."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={group?.name ?? ""}
                  placeholder="My Services"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{group ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
