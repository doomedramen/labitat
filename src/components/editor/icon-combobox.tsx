"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { ItemIcon } from "@/components/dashboard/item/item-icon/item-icon";
import type { IconOption } from "@/lib/icon-catalog";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 12;

function mergeIcons(primary: IconOption[], fallback: IconOption[]) {
  const bySlug = new Map(fallback.map((icon) => [icon.slug, icon]));
  for (const icon of primary) bySlug.set(icon.slug, icon);
  return [...bySlug.values()];
}

function isIconOption(value: unknown): value is IconOption {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<IconOption>;
  return typeof candidate.name === "string" && typeof candidate.slug === "string";
}

interface IconComboboxProps {
  id: string;
  value: string;
  fallbackIcons: IconOption[];
  invalid?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function IconCombobox({
  id,
  value,
  fallbackIcons,
  invalid,
  onChange,
  onBlur,
}: IconComboboxProps) {
  const [open, setOpen] = useState(false);
  const [icons, setIcons] = useState(fallbackIcons);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const catalogRequestedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!open || catalogRequestedRef.current) return;
    catalogRequestedRef.current = true;
    setLoading(true);

    const controller = new AbortController();
    fetch("/api/icons", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Icon catalog unavailable");
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("Invalid icon catalog");
        const remoteIcons = payload.filter(isIconOption);
        if (remoteIcons.length > 0) setIcons(mergeIcons(remoteIcons, fallbackIcons));
      })
      .catch(() => {
        // The built-in service icons remain available when the remote catalog is offline.
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [fallbackIcons, open]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const results = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query || /^(https?:\/\/|\/)/i.test(query)) return fallbackIcons.slice(0, MAX_RESULTS);

    return icons
      .filter(
        (icon) =>
          icon.name.toLowerCase().includes(query) || icon.slug.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(query) || a.slug.startsWith(query);
        const bStarts = b.name.toLowerCase().startsWith(query) || b.slug.startsWith(query);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);
  }, [fallbackIcons, icons, value]);

  function select(icon: IconOption) {
    onChange(icon.slug);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && results[activeIndex]) {
      event.preventDefault();
      select(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-2 shadow-xs",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50",
          invalid && "border-destructive ring-destructive/20",
        )}
      >
        <div aria-hidden="true" className="shrink-0">
          <ItemIcon key={value} iconUrl={value || null} label={value || "Icon"} size="sm" />
        </div>
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search icons, e.g. Plex"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading ? (
          <Loader2
            aria-label="Loading icon catalog"
            className="size-4 animate-spin text-muted-foreground"
          />
        ) : (
          <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
      </div>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Icons"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {results.length > 0 ? (
            results.map((icon, index) => (
              <button
                key={icon.slug}
                type="button"
                role="option"
                aria-label={icon.name}
                aria-selected={value === icon.slug}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(icon)}
                onMouseMove={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeIndex === index && "bg-accent",
                )}
              >
                <span aria-hidden="true">
                  <ItemIcon iconUrl={icon.slug} label={icon.name} size="sm" />
                </span>
                <span className="min-w-0 flex-1 truncate">{icon.name}</span>
                <span className="truncate text-xs text-muted-foreground">{icon.slug}</span>
              </button>
            ))
          ) : (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matching icons. You can still use this as a custom URL.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
