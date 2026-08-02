"use client";

import * as React from "react";
import { SORTED_PALETTES } from "@/lib/palettes";
import { usePalette } from "@/hooks/use-palette";
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

export function PaletteSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { palette, setPalette } = usePalette();

  function handleChange(value: string) {
    setPalette(value);
    onSelect?.();
  }

  const darkPalettes = SORTED_PALETTES.filter((p) => !LIGHT_PALETTE_IDS.has(p.id));
  const lightPalettes = SORTED_PALETTES.filter((p) => LIGHT_PALETTE_IDS.has(p.id));

  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
      <PaletteGroup label="Dark" palettes={darkPalettes} />
      <DropdownMenuSeparator className="my-2" />
      <PaletteGroup label="Light" palettes={lightPalettes} />
    </DropdownMenuRadioGroup>
  );
}

function PaletteGroup({ label, palettes }: { label: string; palettes: typeof SORTED_PALETTES }) {
  return (
    <>
      <DropdownMenuLabel className="px-2 pb-1 text-[0.66rem] font-semibold tracking-[0.12em] uppercase">
        {label}
      </DropdownMenuLabel>
      <div className="grid grid-cols-2 gap-1">
        {palettes.map((p) => (
          <DropdownMenuRadioItem
            key={p.id}
            value={p.id}
            className="min-h-11 gap-2.5 px-2 py-1.5 pr-7 text-xs"
          >
            <span
              data-palette={p.id}
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-foreground/15"
              aria-hidden
            >
              <span className="size-2.5 rounded-full bg-primary ring-2 ring-card" />
            </span>
            <span className="min-w-0 leading-tight text-wrap">{p.label}</span>
          </DropdownMenuRadioItem>
        ))}
      </div>
    </>
  );
}
