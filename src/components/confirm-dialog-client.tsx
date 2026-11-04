"use client";

import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
}

export function ConfirmDialogClient({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = "destructive",
}: ConfirmDialogClientProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pendingRef.current) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async (event) => {
              event.preventDefault();
              if (pendingRef.current) return;
              pendingRef.current = true;
              setPending(true);
              setError(null);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch {
                setError("Could not complete this action. Try again.");
              } finally {
                pendingRef.current = false;
                setPending(false);
              }
            }}
            className={
              variant === "destructive"
                ? "text-background bg-destructive hover:bg-destructive/90"
                : ""
            }
          >
            {pending ? "Working…" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
