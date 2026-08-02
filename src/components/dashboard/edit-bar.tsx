"use client";

import { startTransition } from "react";
import { Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

interface EditBarProps {
  onDone: () => void;
}

export function EditBar({ onDone }: EditBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 pt-3 pb-[max(0.75rem,var(--safe-area-bottom))] shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
        <p className="hidden text-sm text-muted-foreground sm:block">
          Drag to reorder. Select a card to edit it.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-background"
            onClick={() =>
              startTransition(() => {
                onDone(); // Exit edit mode first
                logout();
              })
            }
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <Button onClick={onDone} className="min-w-24">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
