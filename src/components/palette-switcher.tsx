"use client";

import * as React from "react";
import { SORTED_PALETTES } from "@/lib/palettes";
import { usePalette } from "@/hooks/use-palette";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ThemeEditor } from "@/components/theme-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PaletteSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { palette, setPalette } = usePalette();
  const [editorOpen, setEditorOpen] = React.useState(false);

  function handleChange(value: string) {
    setPalette(value);
    onSelect?.();
    if (value === "custom") {
      setEditorOpen(true);
    }
  }

  return (
    <>
      <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
        {SORTED_PALETTES.map((p) => (
          <DropdownMenuRadioItem key={p.id} value={p.id} onSelect={(e) => e.preventDefault()}>
            {p.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Theme</DialogTitle>
          </DialogHeader>
          <ThemeEditor />
        </DialogContent>
      </Dialog>
    </>
  );
}
