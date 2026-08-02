"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { SORTED_PALETTES } from "@/lib/palettes";
import { usePalette } from "@/hooks/use-palette";
import { cn } from "@/lib/utils";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const LIGHT_PALETTE_IDS = new Set([
  "light",
  "catppuccin_latte",
  "nord_light",
  "solarized_light",
  "rose_pine_dawn",
  "gruvbox_light",
]);

export function PaletteSwitcher({
  onSelect,
  presentation = "menu",
}: {
  onSelect?: () => void;
  presentation?: "menu" | "dialog";
}) {
  const { palette, setPalette } = usePalette();

  function handleChange(value: string) {
    setPalette(value);
    onSelect?.();
  }

  const darkPalettes = SORTED_PALETTES.filter((p) => !LIGHT_PALETTE_IDS.has(p.id));
  const lightPalettes = SORTED_PALETTES.filter((p) => LIGHT_PALETTE_IDS.has(p.id));

  if (presentation === "dialog") {
    return (
      <div role="radiogroup" aria-label="Theme" className="p-3">
        <PaletteGroup
          label="Dark"
          palettes={darkPalettes}
          selectedPalette={palette}
          onSelect={handleChange}
        />
        <div className="my-3 h-px bg-border" />
        <PaletteGroup
          label="Light"
          palettes={lightPalettes}
          selectedPalette={palette}
          onSelect={handleChange}
        />
      </div>
    );
  }

  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
      <PaletteGroup label="Dark" palettes={darkPalettes} />
      <DropdownMenuSeparator className="my-2" />
      <PaletteGroup label="Light" palettes={lightPalettes} />
    </DropdownMenuRadioGroup>
  );
}

function PaletteGroup({
  label,
  palettes,
  selectedPalette,
  onSelect,
}: {
  label: string;
  palettes: typeof SORTED_PALETTES;
  selectedPalette?: string;
  onSelect?: (palette: string) => void;
}) {
  return (
    <>
      <DropdownMenuLabel className="px-2 pb-1 text-[0.66rem] font-semibold tracking-[0.12em] uppercase">
        {label}
      </DropdownMenuLabel>
      <div className="grid grid-cols-2 gap-1">
        {palettes.map((p) => {
          const content = (
            <>
              <span
                data-palette={p.id}
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-foreground/15"
                aria-hidden
              >
                <span className="size-2.5 rounded-full bg-primary ring-2 ring-card" />
              </span>
              <span className="min-w-0 leading-tight text-wrap">{p.label}</span>
            </>
          );

          if (onSelect) {
            const selected = selectedPalette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "relative flex min-h-12 items-center gap-2.5 rounded-lg px-2 py-2 pr-8 text-left text-xs outline-none transition-colors",
                  "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  "active:bg-accent active:text-accent-foreground",
                  selected && "bg-accent/70 text-accent-foreground",
                )}
              >
                {content}
                {selected && <CheckIcon className="absolute right-2 size-4" aria-hidden="true" />}
              </button>
            );
          }

          return (
            <DropdownMenuRadioItem
              key={p.id}
              value={p.id}
              className="min-h-11 gap-2.5 px-2 py-1.5 pr-7 text-xs"
            >
              {content}
            </DropdownMenuRadioItem>
          );
        })}
      </div>
    </>
  );
}
