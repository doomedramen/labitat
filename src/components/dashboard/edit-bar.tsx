"use client";

import { startTransition } from "react";
import { Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { OverlayPortal } from "@/components/ui/overlay-portal";

interface EditBarProps {
  onDone: () => void;
}

export function EditBar({ onDone }: EditBarProps) {
  return (
    <OverlayPortal slot="bottom">
      <div className="pointer-events-auto w-full border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
        <div className="flex w-full items-center justify-between">
          <p className="text-sm text-muted-foreground">Drag to reorder. Click items to edit.</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="dark:!bg-background bg-background"
              onClick={() => startTransition(() => logout())}
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
            <Button onClick={onDone}>
              <Check className="mr-1.5 h-4 w-4" />
              Done
            </Button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
