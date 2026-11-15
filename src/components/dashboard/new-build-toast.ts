"use client";

import { toast } from "sonner";

/** One persistent prompt per page: Labitat was redeployed while this tab stayed open. */
export function showNewBuildToast() {
  toast.info("Labitat has been updated", {
    id: "labitat-new-build",
    description: "Reload to keep saving changes.",
    duration: Infinity,
    action: { label: "Reload", onClick: () => window.location.reload() },
  });
}
