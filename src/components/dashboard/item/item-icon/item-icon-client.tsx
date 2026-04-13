"use client";

import { useState } from "react";
import { ItemIcon as ItemIconServer } from "./item-icon";

interface ItemIconProps {
  iconUrl: string | null;
  label: string;
  serviceIcon?: string | null;
}

/**
 * Client wrapper that adds error state handling for image loading.
 * Delegates to server component for rendering.
 */
export function ItemIconClient({ iconUrl, label, serviceIcon }: ItemIconProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <ItemIconServer
      iconUrl={iconUrl}
      label={label}
      serviceIcon={serviceIcon}
      onError={() => setHasError(true)}
    />
  );
}
