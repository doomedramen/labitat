"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORTED_BACKGROUNDS } from "@/lib/backgrounds";
import { useBackground } from "@/hooks/use-background";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

interface BackgroundSwitcherProps {
  onSelect?: () => void;
}

export function BackgroundSwitcher({ onSelect }: BackgroundSwitcherProps) {
  const { background, setBackground, scale, setScale, opacity, setOpacity } = useBackground();

  function handleChange(id: string) {
    setBackground(id);
    onSelect?.();
  }

  const showControls = background !== "none";

  return (
    <div className="flex flex-col p-1">
      {/* Scale & Opacity sliders - shown at top when a background is selected */}
      {showControls && (
        <>
          <div className="flex flex-col gap-3 rounded-md border border-border/50 p-2">
            <div className="flex flex-col gap-1.5" data-testid="scale-control">
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
            <div className="flex flex-col gap-1.5" data-testid="opacity-control">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <span className="font-mono text-xs">{parseFloat(opacity).toFixed(2)}</span>
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
          <div className="my-1 border-t border-border/50" />
        </>
      )}

      {/* Scrollable background list */}
      <div className="max-h-[400px] overflow-y-auto">
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
              />
              {/* Label with checkmark */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs">{bg.label}</span>
                {background === bg.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </div>
    </div>
  );
}
