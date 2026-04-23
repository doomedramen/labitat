"use client";

import { useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";

import { createItem, updateItem, getItemConfig } from "@/actions/items";
import { getAllServices } from "@/lib/adapters";
import type { ServiceDefinition } from "@/lib/adapters";
import type { WidgetPayload } from "@/lib/adapters/widget-types";
import type { ItemWithCache, GroupWithItems } from "@/lib/types";
import {
  WidgetDisplayProvider,
  useWidgetDisplay,
} from "@/components/dashboard/item/widget-display-context";
import { EditableStatGrid } from "@/components/dashboard/item/editable-stat-grid";
import { parseStatCardOrder, type StatCardOrder } from "@/hooks/use-stat-card-order";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { fetchServiceData } from "@/actions/services";
import { liveStore } from "@/lib/live-store";

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
    />
  );
}

const itemSchema = z.object({
  label: z.string().min(1, "Label is required."),
  href: urlSchema,
  iconUrl: urlSchema,
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
              role="searchbox"
              aria-label="Search services"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {!query && (
              <button
                type="button"
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
                    role="option"
                    aria-selected={value === s.id}
                    tabIndex={activeIndex === optIndex ? 0 : -1}
                    ref={(el) => {
                      if (activeIndex === optIndex && el) el.scrollIntoView({ block: "nearest" });
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
  const services = getAllServices();
  const [serviceType, setServiceType] = useState(item?.serviceType ?? "");
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [statDisplayMode, setStatDisplayMode] = useState<"icon" | "label">(
    (item?.statDisplayMode as "icon" | "label") ?? "label",
  );
  const [localStatCardOrder, setLocalStatCardOrder] = useState<StatCardOrder | null>(
    parseStatCardOrder(item?.statCardOrder),
  );
  // TanStack React Form captures `onSubmit` config early; use a ref so we always
  // serialize the latest stat card order, even if the handler is memoized.
  const localStatCardOrderRef = useRef<StatCardOrder | null>(localStatCardOrder);
  useEffect(() => {
    localStatCardOrderRef.current = localStatCardOrder;
  }, [localStatCardOrder]);
  const selectedService = services.find((s) => s.id === serviceType);

  const form = useForm({
    defaultValues: {
      label: item?.label ?? "",
      href: item?.href ?? "",
      iconUrl: item?.iconUrl ?? "",
      pollingMs: item?.pollingMs ? item.pollingMs / 1000 : 10,
    },
    validators: {
      onChange: itemSchema,
      onChangeAsync: async ({ value }) => {
        const result = itemSchema.safeParse(value);
        if (!result.success) {
          return {
            fields: result.error.flatten().fieldErrors,
          };
        }
        return undefined;
      },
      onChangeAsyncDebounceMs: 300,
      onBlur: itemSchema,
    },
    onSubmit: async ({ value }) => {
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
        if (latestOrder) {
          formData.append("statCardOrder", JSON.stringify(latestOrder));
        }

        // Add config fields
        Object.entries(configFields).forEach(([key, val]) => {
          formData.append(`config_${key}`, val);
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
        toast.error(item ? "Failed to update item" : "Failed to create item");
        haptic.trigger("error");
      }
    },
  });

  // Sync state when item changes (including when switching from edit to new)
  useEffect(() => {
    setServiceType(item?.serviceType ?? "");
    setStatDisplayMode((item?.statDisplayMode as "icon" | "label") ?? "label");
    setLocalStatCardOrder(parseStatCardOrder(item?.statCardOrder));
    form.reset({
      label: item?.label ?? "",
      href: item?.href ?? "",
      iconUrl: item?.iconUrl ?? "",
      pollingMs: item?.pollingMs ? item.pollingMs / 1000 : 10,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is a stable reference from useForm
  }, [item?.id, item, open]);

  // Reset form when dialog closes, or initialize when dialog opens with item
  useEffect(() => {
    if (!open) {
      // Dialog closing - reset state
      setServiceType("");
      setConfigFields({});
      setStatDisplayMode("label");
      setLocalStatCardOrder(null);
      form.reset({
        label: "",
        href: "",
        iconUrl: "",
        pollingMs: 10,
      });
    } else if (item) {
      // Dialog opening with item - ensure statCardOrder is synced
      setLocalStatCardOrder(parseStatCardOrder(item.statCardOrder));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is a stable reference from useForm
  }, [open, item]);

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

  // Load config when editing an existing item
  useEffect(() => {
    if (item?.id) {
      setConfigLoading(true);
      getItemConfig(item.id)
        .then((stored) => {
          if (selectedService) {
            const merged = { ...stored };
            for (const field of selectedService.configFields) {
              if (field.type === "boolean" && merged[field.key] === undefined) {
                merged[field.key] = field.defaultChecked ? "true" : "false";
              }
            }
            setConfigFields(merged);
          } else {
            setConfigFields(stored);
          }
        })
        .finally(() => setConfigLoading(false));
    } else {
      // New item — apply defaults for the selected service
      if (selectedService) {
        const defaults: Record<string, string> = {};
        for (const field of selectedService.configFields) {
          if (field.type === "boolean") {
            defaults[field.key] = field.defaultChecked ? "true" : "false";
          }
        }
        setConfigFields(defaults);
      } else {
        setConfigFields({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, serviceType]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent key={item?.id ?? "new"} className="max-h-[80vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{item ? "Edit Item" : "New Item"}</DialogTitle>
              <DialogDescription>
                {item
                  ? "Update the item configuration."
                  : "Add a new service or link to your dashboard."}
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

              <form.Field name="iconUrl">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Icon URL</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="https://cdn.jsdelivr.net/gh/selfhst/icons/png/service.png"
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

              {/* Service type */}
              <div className="space-y-2">
                <Label htmlFor={comboboxId}>Service Type</Label>
                <ServiceCombobox
                  services={services}
                  value={serviceType}
                  onChange={(id) => setServiceType(id)}
                />
              </div>

              {/* Service config fields */}
              {selectedService && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">{selectedService.name} Config</p>
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
                                  setConfigFields((prev) => ({
                                    ...prev,
                                    [field.key]: checked ? "true" : "false",
                                  }))
                                }
                              />
                            </div>
                          ) : field.type === "select" && field.options ? (
                            <Select
                              value={fieldValue ?? ""}
                              onValueChange={(v) =>
                                setConfigFields((prev) => ({
                                  ...prev,
                                  [field.key]: v,
                                }))
                              }
                            >
                              <SelectTrigger>
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
                          ) : field.type === "url" ? (
                            <form.Field
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic config fields are not in the form schema
                              name={`config_${field.key}` as any}
                              defaultValue={fieldValue ?? ""}
                              validators={{
                                onChange: ({ value }) =>
                                  value && !isValidUrl(value)
                                    ? "Must be a valid URL (e.g., example.com or https://example.com)"
                                    : undefined,
                                onChangeAsyncDebounceMs: 300,
                                onBlur: ({ value }) =>
                                  value && !isValidUrl(value)
                                    ? "Must be a valid URL (e.g., example.com or https://example.com)"
                                    : undefined,
                              }}
                            >
                              {(configField) => {
                                const isInvalid =
                                  configField.state.meta.isTouched &&
                                  !configField.state.meta.isValid;
                                return (
                                  <div className="space-y-1">
                                    <Input
                                      id={`config_${field.key}`}
                                      type="text"
                                      value={configField.state.value}
                                      onChange={(e) => {
                                        configField.handleChange(e.target.value);
                                        setConfigFields((prev) => ({
                                          ...prev,
                                          [field.key]: e.target.value,
                                        }));
                                      }}
                                      onBlur={configField.handleBlur}
                                      placeholder={field.placeholder}
                                      aria-invalid={isInvalid || undefined}
                                    />
                                    {isInvalid && (
                                      <p className="text-xs text-destructive">
                                        {formatErrors(configField.state.meta.errors)}
                                      </p>
                                    )}
                                  </div>
                                );
                              }}
                            </form.Field>
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
                                onChange={(e) =>
                                  setConfigFields((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
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

              {/* Polling interval */}
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

              {/* Stat display mode - only for widgets using toPayload, not custom renderWidget */}
              {selectedService && !selectedService.renderWidget && (
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="statDisplayMode" className="leading-snug">
                    Stat card icons
                    <span className="block text-xs font-normal text-muted-foreground">
                      Show icons instead of labels
                    </span>
                  </Label>
                  <Switch
                    id="statDisplayMode"
                    checked={statDisplayMode === "icon"}
                    onCheckedChange={(checked) => setStatDisplayMode(checked ? "icon" : "label")}
                  />
                </div>
              )}

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
                      Drag to reorder · Drop into the unused area to hide
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{item ? "Update" : "Create"}</Button>
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
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (fetchedRef.current) return; // only once per open
    fetchedRef.current = true;

    const cached = live?.widgetData ?? null;
    if (cached) {
      const payload = adapter.toPayload ? adapter.toPayload(cached) : null;
      if (payload) {
        setPreview({ status: "idle", payload: withPlaceholderValues(payload) });
        return;
      }
    }

    setPreview({ status: "loading" });
    fetchServiceData(itemId)
      .then((data) => {
        const existing = liveStore.getSnapshot(itemId);
        liveStore.updateFromSse(itemId, {
          widgetData: data,
          pingStatus: existing?.pingStatus ?? null,
          fetchedAt: Date.now(),
        });

        const payload = adapter.toPayload ? adapter.toPayload(data) : null;
        if (!payload) {
          setPreview({ status: "error" });
          return;
        }

        setPreview({ status: "idle", payload: withPlaceholderValues(payload) });
      })
      .catch(() => setPreview({ status: "error" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per dialog open
  }, []);

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
      }}
    >
      <StatCardEditor payload={preview.payload} />
    </WidgetDisplayProvider>
  );
}
