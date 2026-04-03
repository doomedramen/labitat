"use client"

import { CheckIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth"

type EditBarProps = {
  onAddGroup: () => void
  onDone: () => void
}

export function EditBar({ onAddGroup, onDone }: EditBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-popover/95 px-6 py-3 backdrop-blur-sm"
      data-testid="edit-bar"
    >
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onAddGroup}
          data-testid="add-group-button"
        >
          <PlusIcon data-icon="inline-start" />
          Add group
        </Button>
        <form action={logout}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            data-testid="logout-button"
          >
            Sign out
          </Button>
        </form>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:block">
          Press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            E
          </kbd>{" "}
          to exit
        </span>
        <Button size="sm" onClick={onDone} data-testid="done-button">
          <CheckIcon data-icon="inline-start" />
          Done
        </Button>
      </div>
    </div>
  )
}
