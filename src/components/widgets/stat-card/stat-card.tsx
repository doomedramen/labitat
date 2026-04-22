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
        // Base card container
        "flex h-full flex-col items-center justify-center",
        "rounded-xl px-2 py-2.5 text-center",
        // Background with subtle gradient
        "bg-gradient-to-b from-secondary/90 to-secondary/70",
        // Border
        "border border-border/30",
        // Text colors
        "text-secondary-foreground select-none",
        // Transitions and interactions
        "transition-all duration-200 ease-out",
        "hover:from-secondary hover:to-secondary/80",
        "hover:border-border/50 hover:shadow-sm",
        "hover:scale-[1.02] hover:-translate-y-0.5",
        "active:scale-[0.98] active:translate-y-0",
      )}
    >
      {/* Value with prominent styling */}
      <span
        className={cn(
          "text-sm font-bold tabular-nums tracking-tight",
          "transition-colors duration-200",
          valueClassName ?? "text-secondary-foreground",
        )}
      >
        {value}
      </span>

      {/* Icon display */}
      {showIcon && icon && (
        <div className="mt-1 text-secondary-foreground/60 transition-colors duration-200 hover:text-secondary-foreground/80">
          {(() => {
            const Icon = icon;
            return <Icon className="h-3.5 w-3.5" />;
          })()}
        </div>
      )}

      {/* Label display */}
      {showLabel ? (
        <span
          className={cn(
            "text-[11px] font-medium mt-0.5",
            "text-secondary-foreground/60",
            "transition-colors duration-200",
          )}
        >
          {label}
        </span>
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
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>{content}</HoverCardTrigger>
            <HoverCardContent
              side="top"
              align="center"
              className={cn(
                "w-auto px-3 py-2",
                "bg-popover/95 backdrop-blur-sm",
                "border border-border/50 shadow-lg rounded-xl",
                "text-xs",
              )}
            >
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
