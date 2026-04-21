"use client";

import { Palette, LogIn, Image } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { BackgroundSwitcher } from "@/components/background-switcher";
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
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      {editMode ? (
        <TitleForm
          title={title}
          localTitle={localTitle}
          onTitleChange={onTitleChange}
          onExitEdit={onToggleEditMode}
        />
      ) : (
        <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
      )}

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <div className="rounded-lg">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Palette className="h-4 w-4" />
                <span className="sr-only">Theme settings</span>
              </Button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <PaletteSwitcher />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <div className="rounded-lg">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Image className="h-4 w-4" />
                <span className="sr-only">Background settings</span>
              </Button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end" className="w-[240px]">
            <BackgroundSwitcher />
          </DropdownMenuContent>
        </DropdownMenu>

        {isLoggedIn ? (
          !editMode ? (
            <div className="rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onToggleEditMode();
                  haptic.trigger("light");
                }}
              >
                Edit
              </Button>
            </div>
          ) : null
        ) : (
          <div className="rounded-lg">
            <Button variant="outline" size="sm" onClick={onSignInClick}>
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              Sign in
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
