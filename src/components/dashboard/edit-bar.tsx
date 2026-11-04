"use client";

import { Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditBarProps {
  onDone: (signOut?: boolean) => void | Promise<void>;
  showSignOut?: boolean;
  pending?: boolean;
}

export function EditBar({ onDone, showSignOut = true, pending = false }: EditBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 pt-3 pb-[max(0.75rem,var(--safe-area-bottom))] shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Moves save automatically. Use Edit to change an item.
        </p>
        <div className="flex items-center gap-2">
          {showSignOut && (
            <Button
              variant="outline"
              className="bg-background"
              disabled={pending}
              onClick={() => void onDone(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}
          <Button onClick={() => void onDone()} className="min-w-24" disabled={pending}>
            <Check className="h-4 w-4" />
            {pending ? "Saving…" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}
