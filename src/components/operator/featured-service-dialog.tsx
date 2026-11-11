"use client";

import { useState } from "react";
import { updateFeaturedService } from "@/actions/settings";
import { serviceActivityKind } from "@/lib/service-activity";
import type { GroupWithItems } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FeaturedServiceDialog({
  groups,
  featuredServiceId,
  onClose,
}: {
  groups: GroupWithItems[];
  featuredServiceId: string | null;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState(featuredServiceId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const options = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => serviceActivityKind(item.serviceType)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Featured service</DialogTitle>
          <DialogDescription>
            Pin a download or streaming service to the top of its group with its activity visible.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            setError(false);
            try {
              await updateFeaturedService(selection || null);
              onClose();
            } catch {
              setError(true);
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="grid gap-2 text-sm">
            Service
            <select
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
              value={selection}
              disabled={saving}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">None</option>
              {options.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              Could not save the featured service. Try again.
            </p>
          )}
          <Button type="submit" disabled={saving || selection === (featuredServiceId ?? "")}>
            {saving ? "Saving…" : "Save featured service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
