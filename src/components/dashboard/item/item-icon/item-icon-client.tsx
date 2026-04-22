"use client";

import { ItemIcon as ItemIconBase } from "./item-icon";

interface ItemIconProps {
  iconUrl: string | null;
  label: string;
  serviceIcon?: string | null;
}

/**
 * Client wrapper for ItemIcon.
 * The base component now handles error states internally.
 */
export function ItemIconClient({ iconUrl, label, serviceIcon }: ItemIconProps) {
  return <ItemIconBase iconUrl={iconUrl} label={label} serviceIcon={serviceIcon} />;
}
