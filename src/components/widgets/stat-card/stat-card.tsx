/**
 * Server-compatible StatCard component.
 * Renders a stat card with value, label, and optional icon/tooltip.
 * When sortable+editMode are true, delegates to StatCardSortable (client).
 */

import { cn } from "@/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { BlockLinkPropagation } from "@/components/dashboard/item/block-link-propagation";
import { StatCardSortable } from "./stat-card-sortable";
import type { StatCardProps } from "./types";

export function StatCard({
  id,
  value,
  label,
  icon,
  tooltip,
  valueClassName,
  displayMode = "label",
  sortable = false,
  editMode = false,
}: StatCardProps) {
  const showIcon = displayMode === "icon" && icon;
  const showLabel = displayMode === "label";
  const effectiveTooltip = showIcon ? (tooltip ?? label) : undefined;

  const content = (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground select-none",
        "transition-all duration-200 hover:scale-105 hover:bg-secondary/80 active:scale-95",
      )}
    >
      <span
        className={cn("font-medium tabular-nums", valueClassName ?? "text-secondary-foreground")}
      >
        {value}
      </span>
      {showIcon && icon && (
        <div className="mt-0.5 text-secondary-foreground/50">
          {(() => {
            const Icon = icon;
            return <Icon className="h-3 w-3" />;
          })()}
        </div>
      )}
      {showLabel ? (
        <span className="text-secondary-foreground/60">{label}</span>
      ) : !showIcon && effectiveTooltip ? (
        <span className="sr-only">{effectiveTooltip}</span>
      ) : null}
    </div>
  );

  // SSR path: no sortable, no editMode — render directly
  if (!sortable || !editMode) {
    if (effectiveTooltip) {
      return (
        <BlockLinkPropagation>
          <HoverCard>
            <HoverCardTrigger asChild>{content}</HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="w-auto">
              {effectiveTooltip}
            </HoverCardContent>
          </HoverCard>
        </BlockLinkPropagation>
      );
    }
    return content;
  }

  // Client path: sortable + editMode — use dnd-kit hooks
  return (
    <StatCardSortable
      id={id}
      sortable
      editMode
      displayMode={displayMode}
      value={value}
      label={label}
      icon={icon}
      tooltip={tooltip}
      valueClassName={valueClassName}
    />
  );
}
