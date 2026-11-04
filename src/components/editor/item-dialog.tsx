"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { formatErrors } from "@/lib/utils";
import { urlSchema, isValidUrl } from "@/lib/url-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCombobox } from "@/components/editor/icon-combobox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";

import { createItem, updateItem, getItemConfig } from "@/actions/items";
import { getAllServices } from "@/lib/adapters";
import type { ServiceDefinition } from "@/lib/adapters";
import type { IconOption } from "@/lib/icon-catalog";
import type { WidgetPayload } from "@/lib/adapters/widget-types";
import type { ServiceData } from "@/lib/adapters/types";
import type { ItemWithCache, GroupWithItems } from "@/lib/types";
import {
  WidgetDisplayProvider,
  useWidgetDisplay,
} from "@/components/dashboard/item/widget-display-context";
import { EditableStatGrid } from "@/components/dashboard/item/editable-stat-grid";
import { parseStatCardOrder, type StatCardOrder } from "@/hooks/use-stat-card-order";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { fetchServiceData } from "@/actions/services";

/**
 * Stat card editor that only shows stat cards for reordering.
 * Excludes list items (streams, downloads) to prevent dialog overflow.
 */
function StatCardEditor({ payload }: { payload: WidgetPayload }) {
  const displaySettings = useWidgetDisplay();

  if (payload.loading || payload.error || payload.stats.length === 0) {
    return null;
  }

  return (
    <EditableStatGrid
      items={payload.stats}
      order={displaySettings?.statCardOrder ?? null}
      onOrderChange={displaySettings?.onOrderChange ?? (() => {})}
      displayMode={displaySettings?.statDisplayMode ?? "label"}
      defaultActiveIds={displaySettings?.defaultActiveIds}
    />
  );
}

const iconSchema = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (/^https?:\/\//i.test(trimmed)) return isValidUrl(trimmed);
    return /^[a-z0-9][a-z0-9._-]*$/i.test(trimmed);
  },
  { message: "Choose an icon name or enter a valid image URL." },
);

const itemSchema = z.object({
  label: z.string().min(1, "Label is required."),
  href: urlSchema,
  iconUrl: iconSchema,
  pollingMs: z.number().min(1, "Must be at least 1 second."),
});

// ── Service type combobox ─────────────────────────────────────────────────────

const comboboxId = "service-type-combobox";

function ServiceCombobox({
  services,
  value,
  onChange,
}: {
  services: ServiceDefinition[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = query
    ? sorted.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  // Build flat option list for keyboard nav (includes "None" when not searching)
  const options = !query ? [{ id: "", name: "None (link only)" }, ...filtered] : filtered;

  const selectedName =
    value === "" ? "None (link only)" : (services.find((s) => s.id === value)?.name ?? value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      triggerRef.current?.focus();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < options.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < options.length) {
      e.preventDefault();
      select(options[activeIndex].id);
    }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        ref={triggerRef}
        role="combobox"
        id={comboboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${comboboxId}-listbox`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
          "ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
          "hover:bg-accent/50",
        )}
      >
        <span className={value === "" ? "text-muted-foreground" : ""}>{selectedName}</span>
        <svg
          className="h-4 w-4 shrink-0 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m7 15 5 5 5-5" />
          <path d="m7 9 5-5 5 5" />
        </svg>
      </button>

      {open && (
        <div
          id={`${comboboxId}-listbox`}
          role="listbox"
          aria-label="Service types"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="p-1">
            <input
              autoFocus
              className="flex h-8 w-full rounded-sm bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search services..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${comboboxId}-listbox`}
              aria-activedescendant={
                activeIndex >= 0 && activeIndex < options.length
                  ? `${comboboxId}-option-${activeIndex}`
                  : undefined
              }
              aria-label="Search services"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {!query && (
              <button
                type="button"
                id={`${comboboxId}-option-0`}
                tabIndex={-1}
                role="option"
                aria-selected={value === ""}
                onClick={() => select("")}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === "" && "bg-accent/50 font-medium",
                )}
              >
                None (link only)
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No results</p>
            ) : (
              filtered.map((s, i) => {
                const optIndex = !query ? i + 1 : i;
                return (
                  <button
                    key={s.id}
                    type="button"
                    id={`${comboboxId}-option-${optIndex}`}
                    role="option"
                    aria-selected={value === s.id}
                    tabIndex={-1}
                    ref={(el) => {
                      if (activeIndex === optIndex && el) el.scrollIntoView?.({ block: "nearest" });
                    }}
                    onClick={() => select(s.id)}
                    className={cn(
                      "w-full px-2 py-1.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      value === s.id && "bg-accent/50 font-medium",
                      activeIndex === optIndex && "bg-accent/30",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithCache | null;
  groupId: string;
  onGroupsChanged: (groups: GroupWithItems[]) => void;
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  groupId,
  onGroupsChanged,
}: ItemDialogProps) {
  const haptic = useWebHaptics();
  const services = useMemo(() => getAllServices(), []);
  const fallbackIcons: IconOption[] = useMemo(
    () =>
      services
        .filter((service): service is ServiceDefinition & { icon: string } => Boolean(service.icon))
        .map((service) => ({ name: service.name, slug: service.icon })),
    [services],
  );
  const [serviceType, setServiceType] = useState(item?.serviceType ?? "");
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const storedConfigKeysRef = useRef(new Set<string>());
  const editedConfigKeysRef = useRef(new Set<string>());
  function editConfigField(key: string, value: string) {
    editedConfigKeysRef.current.add(key);
    setConfigFields((prev) => ({ ...prev, [key]: value }));
  }
  const [configLoading, setConfigLoading] = useState(!!item?.serviceType);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [statDisplayMode, setStatDisplayMode] = useState<"icon" | "label">(
    (item?.statDisplayMode as "icon" | "label") ?? "label",
  );
  const initialStatCardOrder = parseStatCardOrder(item?.statCardOrder);
  const [localStatCardOrder, setLocalStatCardOrderState] = useState<StatCardOrder | null>(
    initialStatCardOrder,
  );
  // Keep a synchronous ref for submit serialization so we don't race `useEffect`.
  const localStatCardOrderRef = useRef<StatCardOrder | null>(initialStatCardOrder);
  const setLocalStatCardOrder = (next: StatCardOrder | null) => {
    localStatCardOrderRef.current = next;
    setLocalStatCardOrderState(next);
  };
  const selectedService = services.find((s) => s.id === serviceType);

  const form = useForm({
    defaultValues: {
      label: item?.label ?? "",
      href: item?.href ?? "",
      iconUrl: item?.iconUrl ?? "",
      pollingMs: item?.pollingMs ? item.pollingMs / 1000 : 10,
    },
    validators: { onSubmit: itemSchema },
    onSubmit: async ({ value }) => {
      if (savingRef.current || configLoading || configError) return;
      for (const field of selectedService?.configFields ?? []) {
        const fieldValue = configFields[field.key]?.trim();
        if (
          (field.required && !fieldValue && (!item || serviceType !== item.serviceType)) ||
          (field.type === "url" && fieldValue && !isValidUrl(fieldValue))
        ) {
          setSaveError(`Check ${field.label}.`);
          document.getElementById(`config_${field.key}`)?.focus();
          return;
        }
      }
      savingRef.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        const formData = new FormData();
        formData.append("label", value.label);
        formData.append("href", value.href);
        formData.append("iconUrl", value.iconUrl);
        formData.append("pollingMs", String(value.pollingMs * 1000));
        formData.append("serviceType", serviceType);
        formData.append("displayMode", "label");
        formData.append("statDisplayMode", statDisplayMode);

        // Add stat card order
        const latestOrder = localStatCardOrderRef.current;
        formData.append("statCardOrder", JSON.stringify(latestOrder));

        // Add config fields
        Object.entries(configFields).forEach(([key, val]) => {
          if (
            !item ||
            serviceType !== item.serviceType ||
            storedConfigKeysRef.current.has(key) ||
            editedConfigKeysRef.current.has(key)
          ) {
            formData.append(`config_${key}`, val);
          }
        });

        if (item) {
          const updated = await updateItem(item.id, formData);
          onGroupsChanged(updated);
        } else {
          const updated = await createItem(groupId, formData);
          onGroupsChanged(updated);
        }
        haptic.trigger("success");
        onOpenChange(false);
      } catch {
        setSaveError("Could not save. Your changes are still here; try again.");
        haptic.trigger("error");
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
  });

  // Only a new editing session resets a draft, never a background server render.
  useEffect(() => {
    if (!open) return;
    setServiceType(item?.serviceType ?? "");
    setStatDisplayMode((item?.statDisplayMode as "icon" | "label") ?? "label");
    setLocalStatCardOrder(parseStatCardOrder(item?.statCardOrder));
    setSaveError(null);
    form.reset({
      label: item?.label ?? "",
      href: item?.href ?? "",
      iconUrl: item?.iconUrl ?? "",
      pollingMs: (item?.pollingMs ?? 10000) / 1000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item ID and open define the draft session
  }, [item?.id, open]);

  // Auto-set label based on service type when creating a new item
  useEffect(() => {
    // Only for new items (no existing item)
    if (item) return;

    if (selectedService) {
      const currentLabel = form.getFieldValue("label");
      // Set label to service name if no label is defined
      if (!currentLabel || currentLabel === "") {
        form.setFieldValue("label", selectedService.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when serviceType changes
  }, [item, serviceType]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setConfigError(null);
    storedConfigKeysRef.current.clear();
    editedConfigKeysRef.current.clear();
    const defaults: Record<string, string> = {};
    if (item?.serviceType === serviceType && item.serviceUrl) defaults.url = item.serviceUrl;
    for (const field of selectedService?.configFields ?? []) {
      if (field.type === "boolean") defaults[field.key] = field.defaultChecked ? "true" : "false";
    }
    if (!item || serviceType !== item.serviceType || !selectedService) {
      setConfigFields(defaults);
      setConfigLoading(false);
      return;
    }
    setConfigLoading(true);
    setConfigFields({});
    getItemConfig(item.id)
      .then((stored) => {
        if (!cancelled) {
          storedConfigKeysRef.current = new Set(Object.keys(stored));
          setConfigFields({ ...defaults, ...stored });
        }
      })
      .catch(() => {
        if (!cancelled) setConfigError("Could not load the saved connection. Retry before saving.");
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedService follows serviceType
  }, [open, item?.id, serviceType, loadRetry]);

  function requestClose(next: boolean) {
    if (!savingRef.current) onOpenChange(next);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          key={item?.id ?? "new"}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{item ? "Edit Item" : "New Item"}</DialogTitle>
              <DialogDescription>
                Changes apply when you {item ? "update" : "create"} this item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Basic fields */}
              <form.Field name="label">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Label</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="My Service"
                        aria-invalid={isInvalid || undefined}
                      />
                      {isInvalid && (
                        <p className="text-sm text-destructive">
                          {formatErrors(field.state.meta.errors)}
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              <form.Field name="href">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>URL</Label>
                      <p className="text-xs text-muted-foreground">
                        The address opened when you select the card.
                      </p>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="https://service.example.org"
                        aria-invalid={isInvalid || undefined}
                      />
                      {isInvalid && (
                        <p className="text-sm text-destructive">
                          {formatErrors(field.state.meta.errors)}
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Appearance</summary>
                <div className="pt-3">
                  <form.Field name="iconUrl">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && field.state.meta.errors.length > 0;
                      return (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Icon</Label>
                          <IconCombobox
                            id={field.name}
                            value={field.state.value}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
                            fallbackIcons={fallbackIcons}
                            invalid={isInvalid}
                          />
                          <p className="text-xs text-muted-foreground">
                            Search the selfh.st icon library by name, or paste a custom image URL.
                          </p>
                          {isInvalid && (
                            <p className="text-sm text-destructive">
                              {formatErrors(field.state.meta.errors)}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>
                </div>
              </details>

              {/* Service type */}
              <div className="space-y-2">
                <Label htmlFor={comboboxId}>Service Type</Label>
                <ServiceCombobox
                  services={services}
                  value={serviceType}
                  onChange={(id) => {
                    setServiceType(id);
                    setLocalStatCardOrder(null);
                  }}
                />
              </div>

              {/* Service config fields */}
              {selectedService && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Connection</p>
                  <p className="text-xs text-muted-foreground">
                    Used by Labitat to fetch data from {selectedService.name}.
                  </p>
                  {configError && (
                    <div role="alert" className="text-sm text-destructive">
                      {configError}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setLoadRetry((value) => value + 1)}
                      >
                        Retry connection load
                      </Button>
                    </div>
                  )}
                  {configLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading config...
                    </div>
                  ) : (
                    selectedService.configFields.map((field) => {
                      const fieldValue = configFields[field.key];
                      return (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={`config_${field.key}`}>{field.label}</Label>
                          {field.type === "boolean" ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`config_${field.key}`}
                                checked={fieldValue === "true"}
                                onCheckedChange={(checked) =>
                                  editConfigField(field.key, checked ? "true" : "false")
                                }
                              />
                            </div>
                          ) : field.type === "select" && field.options ? (
                            <Select
                              value={fieldValue ?? ""}
                              onValueChange={(v) => editConfigField(field.key, v)}
                            >
                              <SelectTrigger id={`config_${field.key}`}>
                                <SelectValue placeholder={field.placeholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="space-y-1">
                              <Input
                                id={`config_${field.key}`}
                                type={
                                  field.type === "password"
                                    ? "password"
                                    : field.type === "number"
                                      ? "number"
                                      : "text"
                                }
                                value={fieldValue ?? ""}
                                onChange={(e) => editConfigField(field.key, e.target.value)}
                                placeholder={field.placeholder}
                              />
                            </div>
                          )}
                          {field.helperText && (
                            <p className="text-xs text-muted-foreground">{field.helperText}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Refresh settings</summary>
                <div className="pt-3">
                  <form.Field name="pollingMs">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && field.state.meta.errors.length > 0;
                      return (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Polling Interval (seconds)</Label>
                          <Input
                            id={field.name}
                            value={String(field.state.value)}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              field.handleChange(typeof val === "number" ? val : 0);
                            }}
                            onBlur={field.handleBlur}
                            type="number"
                            placeholder="10"
                            aria-invalid={isInvalid || undefined}
                          />
                          {isInvalid && (
                            <p className="text-sm text-destructive">
                              {formatErrors(field.state.meta.errors)}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>
                </div>
              </details>

              {/* Stat card layout preview - only for widgets using toPayload, not custom renderWidget */}
              {selectedService &&
                !selectedService.renderWidget &&
                open &&
                item &&
                serviceType === item.serviceType &&
                selectedService.toPayload && (
                  <div className="space-y-2">
                    <Label>Stat Card Layout</Label>
                    <p className="text-xs text-muted-foreground">
                      Up to 4 shown by default. Add from Unused, hide, or reorder.
                    </p>
                    <ItemDialogPreview
                      open={open}
                      itemId={item.id}
                      adapter={selectedService}
                      statDisplayMode={statDisplayMode}
                      statCardOrder={localStatCardOrder}
                      onOrderChange={setLocalStatCardOrder}
                    />
                  </div>
                )}

              {selectedService &&
                !selectedService.renderWidget &&
                open &&
                !item &&
                selectedService.toPayload && (
                  <div className="space-y-2">
                    <Label>Stat Card Layout</Label>
                    <p className="text-xs text-muted-foreground">Save item first to preview</p>
                  </div>
                )}
            </div>
            {saveError && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {saveError}
              </p>
            )}
            <DialogFooter className="sticky -bottom-4 bg-popover">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => requestClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || configLoading || !!configError}>
                {saving ? "Saving…" : item ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

type PreviewState =
  | { status: "idle"; payload: WidgetPayload }
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" };

function withPlaceholderValues(payload: WidgetPayload): WidgetPayload {
  return {
    ...payload,
    stats: payload.stats.map((s) => ({ ...s, value: "--" })),
    downloads: undefined,
    streams: undefined,
    customComponent: undefined,
    loading: false,
    error: null,
  };
}

function ItemDialogPreview({
  open,
  itemId,
  adapter,
  statDisplayMode,
  statCardOrder,
  onOrderChange,
}: {
  open: boolean;
  itemId: string;
  adapter: ServiceDefinition;
  statDisplayMode: "icon" | "label";
  statCardOrder: StatCardOrder | null;
  onOrderChange: (order: StatCardOrder | null) => void;
}) {
  const live = useItemLive(itemId);

  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    function payloadFor(data: ServiceData | null) {
      if (!data || data._status === "error") return null;
      try {
        return adapter.toPayload ? withPlaceholderValues(adapter.toPayload(data)) : null;
      } catch {
        return null;
      }
    }
    const cachedPayload = payloadFor(live?.widgetData ?? null);
    if (cachedPayload) {
      setPreview({ status: "idle", payload: cachedPayload });
      return;
    }
    setPreview({ status: "loading" });
    fetchServiceData(itemId)
      .then((data) => {
        if (cancelled) return;
        const payload = payloadFor(data);
        setPreview(payload ? { status: "idle", payload } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on a new preview session, not every live update
  }, [open, itemId, adapter]);

  if (!open) return null;

  if (preview.status === "empty") {
    return <p className="text-xs text-muted-foreground">Save item first to preview</p>;
  }

  if (preview.status === "error") {
    return <p className="text-xs text-muted-foreground">Preview unavailable</p>;
  }

  if (preview.status === "loading") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-secondary/50" />
          ))}
        </div>
        <div className="h-16 rounded-md bg-secondary/30" />
      </div>
    );
  }

  return (
    <WidgetDisplayProvider
      value={{
        statDisplayMode,
        statCardOrder,
        editMode: true,
        itemId,
        onOrderChange,
        defaultActiveIds: preview.payload.defaultActiveIds,
      }}
    >
      <StatCardEditor payload={preview.payload} />
    </WidgetDisplayProvider>
  );
}
