"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORTED_BACKGROUNDS } from "@/lib/backgrounds";
import { useBackground } from "@/hooks/use-background";
import { useThemeCookie } from "@/components/theme-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface BackgroundSwitcherProps {
  onSelect?: () => void;
}

export function BackgroundSwitcher({ onSelect }: BackgroundSwitcherProps) {
  const { background, setBackground, scale, setScale, opacity, setOpacity } = useBackground();
  const { resolvedTheme } = useThemeCookie();
  const [showControls, setShowControls] = useState(false);

  function handleChange(id: string) {
    setBackground(id);
    onSelect?.();
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-1.5 p-1">
      {/* Background grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {SORTED_BACKGROUNDS.map((bg) => (
          <DropdownMenuItem
            key={bg.id}
            className={cn(
              "flex flex-col gap-1 rounded-md p-1.5",
              background === bg.id && "bg-accent",
            )}
            onSelect={(e) => {
              e.preventDefault();
              handleChange(bg.id);
            }}
          >
            {/* Preview swatch: 90x90 */}
            <div
              className={cn(
                "h-[90px] w-[90px] shrink-0 overflow-hidden rounded-md border border-border/50",
                bg.className,
              )}
              style={{
                backgroundColor: isDark ? "var(--bg-pattern-base)" : "var(--bg-pattern-base)",
              }}
            />
            {/* Label with checkmark */}
            <div className="flex w-full items-center justify-between">
              <span className="text-xs">{bg.label}</span>
              {background === bg.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </div>

      {/* Controls toggle */}
      {background !== "none" && (
        <>
          <div className="my-1 border-t border-border/50" />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShowControls(!showControls);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-xs">Adjust scale & opacity</span>
          </DropdownMenuItem>

          {/* Scale & Opacity sliders */}
          {showControls && (
            <div className="flex flex-col gap-3 rounded-md border border-border/50 p-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Scale</span>
                  <span className="font-mono text-xs">{parseFloat(scale).toFixed(1)}x</span>
                </div>
                <Slider
                  value={[parseFloat(scale)]}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => setScale(v.toFixed(1))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Opacity</span>
                  <span className="font-mono text-xs">{parseFloat(opacity).toFixed(1)}</span>
                </div>
                <Slider
                  value={[parseFloat(opacity)]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => setOpacity(v.toFixed(2))}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
