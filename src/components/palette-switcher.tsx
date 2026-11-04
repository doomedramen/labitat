"use client";

import { PALETTES } from "@/lib/palettes";
import { usePalette } from "@/hooks/use-palette";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";

export function PaletteSwitcher({
  onSelect,
  presentation = "menu",
}: {
  onSelect?: () => void;
  presentation?: "menu" | "dialog";
}) {
  const { palette, setPalette } = usePalette();
  function select(value: string) {
    setPalette(value);
    onSelect?.();
  }
  if (presentation === "dialog")
    return (
      <div className="grid grid-cols-2 gap-3 p-4" role="group" aria-label="Theme">
        {PALETTES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={palette === option.id}
            onClick={() => select(option.id)}
            className="min-h-12 rounded-lg border border-border bg-card px-4 text-sm aria-pressed:border-primary aria-pressed:bg-accent"
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={select} aria-label="Theme">
      {PALETTES.map((option) => (
        <DropdownMenuRadioItem key={option.id} value={option.id} className="min-h-10 gap-2">
          {option.id === "light" ? <Sun size={16} /> : <Moon size={16} />}
          {option.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
