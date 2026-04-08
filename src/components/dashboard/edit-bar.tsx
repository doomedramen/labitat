"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditBarProps {
  onDone: () => void
}

export function EditBar({ onDone }: EditBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag to reorder. Click items to edit.
        </p>
        <Button onClick={onDone}>
          <Check className="mr-1.5 h-4 w-4" />
          Done
        </Button>
      </div>
    </div>
  )
}
