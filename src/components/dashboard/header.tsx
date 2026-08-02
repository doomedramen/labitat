"use client";

import { LogIn, Palette, PencilLine } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { TitleForm } from "./title-form";

interface HeaderProps {
  editMode: boolean;
  isLoggedIn: boolean;
  title: string;
  localTitle: string | null;
  onTitleChange: (title: string | null) => void;
  onToggleEditMode: () => void;
  onSignInClick: () => void;
}

export function Header({
  editMode,
  isLoggedIn,
  title,
  localTitle,
  onTitleChange,
  onToggleEditMode,
  onSignInClick,
}: HeaderProps) {
  const haptic = useWebHaptics();
  const dashboardTitle = localTitle ?? title;

  return (
    <header className="mb-9 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5 sm:mb-11 sm:gap-5">
      {editMode ? (
        <TitleForm
          title={title}
          localTitle={localTitle}
          onTitleChange={onTitleChange}
          onExitEdit={onToggleEditMode}
        />
      ) : (
        <div className="min-w-0">
          <p className="mb-0.5 text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Dashboard
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]">
            {dashboardTitle}
          </h1>
        </div>
      )}

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Theme settings">
              <Palette className="size-3.5" />
              <span className="hidden sm:inline">Theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[min(32rem,75vh)] w-72 overflow-y-auto p-2"
          >
            <div className="px-1.5 pt-1 pb-2">
              <p className="text-sm font-semibold tracking-tight">Choose a theme</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Applied instantly and saved on this device.
              </p>
            </div>
            <PaletteSwitcher />
          </DropdownMenuContent>
        </DropdownMenu>

        {isLoggedIn ? (
          !editMode ? (
            <Button
              size="sm"
              onClick={() => {
                onToggleEditMode();
                haptic.trigger("light");
              }}
            >
              <PencilLine className="size-3.5" />
              Edit
            </Button>
          ) : null
        ) : (
          <Button variant="outline" size="sm" onClick={onSignInClick}>
            <LogIn className="size-3.5" />
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
