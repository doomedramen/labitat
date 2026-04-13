"use client";

import { SORTED_PALETTES } from "@/lib/palettes";
import { usePalette } from "@/hooks/use-palette";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

export function PaletteSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { palette, setPalette } = usePalette();

  function handleChange(value: string) {
    setPalette(value);
    onSelect?.();
  }

  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
      {SORTED_PALETTES.map((p) => (
        <DropdownMenuRadioItem key={p.id} value={p.id} onSelect={(e) => e.preventDefault()}>
          {p.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
