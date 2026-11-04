"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaletteSwitcher } from "@/components/palette-switcher";
export function ThemePicker() {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button variant="ghost" size="icon" aria-label="Theme settings">
      <Palette size={16} />
    </Button>
  );
  return mobile ? (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-none">
        <DialogHeader>
          <DialogTitle>Choose a theme</DialogTitle>
          <DialogDescription>Applied instantly and saved on this device.</DialogDescription>
        </DialogHeader>
        <PaletteSwitcher presentation="dialog" onSelect={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <PaletteSwitcher />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
