"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeCookie } from "@/components/theme-provider";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeCookie();

  return (
    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>
        <Sun className="mr-2 h-3.5 w-3.5" />
        Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>
        <Moon className="mr-2 h-3.5 w-3.5" />
        Dark
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>
        System
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}
