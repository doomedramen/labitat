"use client";

import { useState, type ComponentProps } from "react";
import { LogIn, Palette, PencilLine } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { TitleForm } from "./title-form";

interface HeaderProps {
  editMode: boolean;
  canEdit: boolean;
  title: string;
  localTitle: string | null;
  onTitleChange: (title: string | null) => void;
  titleError?: string | null;
  titleSaving?: boolean;
  onToggleEditMode: () => void;
  onSignInClick: () => void;
}

export function Header({
  editMode,
  canEdit,
  title,
  localTitle,
  onTitleChange,
  titleError = null,
  titleSaving = false,
  onToggleEditMode,
  onSignInClick,
}: HeaderProps) {
  const haptic = useWebHaptics();
  const isMobile = useIsMobile();
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const dashboardTitle = localTitle ?? title;

  return (
    <header className="mb-9 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5 sm:mb-11 sm:gap-5">
      {editMode ? (
        <TitleForm
          title={title}
          localTitle={localTitle}
          onTitleChange={onTitleChange}
          error={titleError}
          saving={titleSaving}
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
        {isMobile ? (
          <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
            <DialogTrigger asChild>
              <ThemeButton />
            </DialogTrigger>
            <DialogContent className="inset-x-0 top-auto bottom-0 max-h-[calc(100dvh-var(--safe-area-top)-0.5rem)] max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0">
              <DialogHeader className="border-b border-border px-4 pt-4 pb-3 pr-12">
                <DialogTitle>Choose a theme</DialogTitle>
                <DialogDescription>Applied instantly and saved on this device.</DialogDescription>
              </DialogHeader>
              <div className="safe-area-inset-bottom min-h-0 overflow-y-auto overscroll-contain">
                <PaletteSwitcher presentation="dialog" onSelect={() => setThemeDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ThemeButton />
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
        )}

        {canEdit ? (
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

function ThemeButton(props: ComponentProps<typeof Button>) {
  return (
    <Button {...props} variant="outline" size="sm" aria-label="Theme settings">
      <Palette className="size-3.5" />
      <span className="hidden sm:inline">Theme</span>
    </Button>
  );
}
