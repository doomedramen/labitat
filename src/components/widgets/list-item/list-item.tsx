/**
 * Server-compatible ListItem component.
 * Provides slots for leading icon, content, and trailing info.
 * Uses BlockLinkPropagationServer for SSR compatibility.
 */

import { cn } from "@/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { BlockLinkPropagationServer } from "@/components/dashboard/item/block-link-propagation-server";
import type { ListItemProps } from "./types";

export function ListItem({
  title,
  subtitle,
  progress,
  leading: Leading,
  onLeadingClick,
  trailing,
  divider = "·",
  tooltip,
  marquee,
  children,
  className,
}: ListItemProps) {
  const hasProgress = progress != null && progress >= 0;
  const progressPercent = hasProgress ? Math.min(100, Math.max(0, progress)) : 0;

  const renderTrailing = () => {
    if (!trailing || trailing.length === 0) return null;

    const visibleItems = trailing.filter((item) => item.icon || item.text);

    return (
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] whitespace-nowrap text-secondary-foreground/60 tabular-nums">
        {visibleItems.map((item, i) => {
          const accessibleLabel = item.label ?? item.text ?? item.iconTitle;
          const hasIcon = !!item.icon;
          const hasText = !!item.text;
          const Icon = item.icon;

          return (
            <span
              key={i}
              className="flex items-center gap-1"
              {...(accessibleLabel && !hasText
                ? { role: "img" as const, "aria-label": accessibleLabel }
                : {})}
            >
              {hasIcon && Icon && (
                <Icon
                  className="h-2.5 w-2.5 shrink-0 text-secondary-foreground/40"
                  aria-hidden={hasText ? "true" : undefined}
                  title={item.iconTitle}
                />
              )}
              {hasText && <span>{item.text}</span>}
              {i < visibleItems.length - 1 && divider && (
                <span className="mx-0.5 text-secondary-foreground/20">{divider}</span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const inner = children ?? (
    <>
      {onLeadingClick && Leading ? (
        <button
          type="button"
          onClick={onLeadingClick}
          className="shrink-0 cursor-pointer text-secondary-foreground/50 transition-all duration-200 hover:scale-110 hover:text-secondary-foreground/70 active:scale-95"
          aria-label={title}
        >
          <Leading className="h-3 w-3" />
        </button>
      ) : Leading ? (
        <div className="shrink-0 text-secondary-foreground/50 transition-transform duration-200 hover:scale-110">
          <Leading className="h-3 w-3" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {subtitle && (
          <span className="min-w-0 max-w-[40%] truncate text-secondary-foreground/50">
            {subtitle}
          </span>
        )}
        {subtitle && <span className="shrink-0 text-secondary-foreground/20">·</span>}
        <div className="group relative min-w-0 flex-1 overflow-hidden">
          <span
            className={cn(
              "block truncate font-medium transition-all duration-300",
              marquee &&
                "group-hover:animate-marquee group-hover:overflow-visible group-hover:whitespace-nowrap",
            )}
          >
            {title}
          </span>
        </div>
      </div>

      {renderTrailing()}
    </>
  );

  const content = (
    <div
      className={cn(
        "relative flex w-full items-center gap-2 overflow-hidden rounded-md bg-secondary/30 px-2 py-1 text-xs",
        "transition-all duration-200 hover:scale-[1.01] hover:bg-secondary/50 active:scale-[0.99]",
        className,
      )}
    >
      {inner}
      {hasProgress && (
        <div
          className="absolute bottom-0 left-0 h-px bg-primary/50 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 animate-pulse bg-primary/30" />
        </div>
      )}
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <BlockLinkPropagationServer className="w-full">
      <HoverCard>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent side="top" align="center" className="w-auto">
          {tooltip}
        </HoverCardContent>
      </HoverCard>
    </BlockLinkPropagationServer>
  );
}
