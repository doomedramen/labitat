"use client"

import { useTransition, useState, useEffect, useRef } from "react"
import { createItem, updateItem, getItemConfig } from "@/actions/items"
import type { ItemRow } from "@/lib/types"
import type { ServiceDefinition, FieldDef } from "@/lib/adapters/types"
import { getAllServices } from "@/lib/adapters"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox"
import { FieldRenderer } from "./field-renderer"

type ItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingItem: ItemRow | null
  groupId: string | null
  onSuccess?: (item: ItemRow, isNew: boolean) => void
  onError?: (error: string) => void
}

export function ItemDialog({
  open,
  onOpenChange,
  existingItem,
  groupId,
  onSuccess,
  onError,
}: ItemDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] =
    useState<ServiceDefinition | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>(
    {}
  )
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [showIcon, setShowIcon] = useState(existingItem?.iconUrl !== "none")
  const labelInputRef = useRef<HTMLInputElement>(null)
  const isEdit = existingItem !== null

  // Separate services into general widgets and service widgets, sorted alphabetically
  const allServices = getAllServices()
  const generalIds = [
    "openmeteo",
    "openweathermap",
    "datetime",
    "glances",
    "logo",
    "search",
  ]
  const generalWidgets = allServices
    .filter((s) => s.clientSide || generalIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const serviceWidgets = allServices
    .filter((s) => !s.clientSide && !generalIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const groupedItems = [
    { value: "general", items: generalWidgets },
    { value: "services", items: serviceWidgets },
  ].filter((g) => g.items.length > 0)

  // Clear error state and initialize when dialog opens
  const handleOpenChange = (open: boolean) => {
    setError(null)
    onOpenChange(open)
  }

  useEffect(() => {
    if (!open) return

    const init = async () => {
      // Convert service type ID to service object
      const services = getAllServices()
      const service = existingItem?.serviceType
        ? services.find((s) => s.id === existingItem.serviceType) || null
        : null
      setSelectedService(service)
      setConfigValues({})
      setBooleanValues({})
      setIsLoadingConfig(false)
      setShowIcon(existingItem?.iconUrl !== "none")

      // Load decrypted config when editing an existing item
      if (existingItem?.id && existingItem?.serviceType) {
        setIsLoadingConfig(true)
        try {
          const config = await getItemConfig(existingItem.id)
          setConfigValues(config)
          // Initialize boolean values from config
          const bools: Record<string, boolean> = {}
          for (const [key, value] of Object.entries(config)) {
            if (value === "true" || value === "false") {
              bools[key] = value === "true"
            }
          }
          setBooleanValues(bools)
        } catch {
          setConfigValues({})
        } finally {
          setIsLoadingConfig(false)
        }
      }
    }
    init()
  }, [open, existingItem?.id, existingItem?.serviceType, existingItem?.iconUrl])

  const serviceDef = selectedService

  // Auto-update label when service changes (for new items only)
  useEffect(() => {
    if (!open || isEdit || !selectedService) return
    const currentLabel = labelInputRef.current?.value ?? ""
    const previousLabel = (existingItem as ItemRow | null)?.label ?? ""
    if (!currentLabel || currentLabel === previousLabel) {
      labelInputRef.current!.value = selectedService.name
    }
  }, [open, isEdit, selectedService, existingItem])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!groupId) return
    const formData = new FormData(e.currentTarget)
    setError(null)

    // Add boolean values from state (switches might not submit when unchanged)
    for (const [key, value] of Object.entries(booleanValues)) {
      formData.set(`config_${key}`, value ? "true" : "false")
    }

    const optimisticItem: ItemRow = {
      id: existingItem?.id ?? crypto.randomUUID(),
      groupId: groupId!,
      label: (formData.get("label") as string) || "",
      href: (formData.get("href") as string) || null,
      iconUrl: (formData.get("iconUrl") as string) || null,
      serviceType: (formData.get("serviceType") as string) || null,
      serviceUrl: null,
      apiKeyEnc: null,
      configEnc: null,
      pollingMs: (() => {
        const v = formData.get("pollingMs") as string
        return v ? parseInt(v) * 1000 : 10000
      })(),
      order: existingItem?.order ?? 0,
      createdAt: null,
    }
    onSuccess?.(optimisticItem, !isEdit)
    handleOpenChange(false)

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateItem(existingItem.id, formData)
        } else {
          await createItem(groupId, formData)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong"
        setError(message)
        onError?.(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" data-testid="item-dialog">
        <DialogHeader>
          <DialogTitle data-testid="item-dialog-title">
            {isEdit ? "Edit item" : "Add item"}
          </DialogTitle>
        </DialogHeader>

        <form
          key={existingItem?.id ?? "new"}
          id="item-dialog-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-label">Label</Label>
              <Input
                id="item-label"
                name="label"
                defaultValue={existingItem?.label ?? ""}
                placeholder="e.g. Sonarr"
                autoFocus
                ref={labelInputRef}
                data-testid="item-label-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="item-href">URL</Label>
              <Input
                id="item-href"
                name="href"
                type="url"
                defaultValue={existingItem?.href ?? ""}
                placeholder="https://sonarr.home.lab"
                data-testid="item-href-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="item-show-icon"
                  checked={showIcon}
                  onCheckedChange={(v) => setShowIcon(!!v)}
                />
                <Label htmlFor="item-show-icon">Show icon</Label>
              </div>
              {showIcon ? (
                <>
                  <Input
                    id="item-icon"
                    name="iconUrl"
                    defaultValue={
                      existingItem?.iconUrl === "none"
                        ? ""
                        : (existingItem?.iconUrl ?? "")
                    }
                    placeholder="sonarr  or  https://…/icon.svg"
                    data-testid="item-icon-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a{" "}
                    <a
                      href="https://selfh.st/icons"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      selfh.st
                    </a>{" "}
                    slug or a full image URL
                  </p>
                </>
              ) : (
                <input type="hidden" name="iconUrl" value="none" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="item-service">Service Type</Label>
              {/* Hidden input for form submission */}
              <input
                type="hidden"
                name="serviceType"
                value={selectedService?.id ?? ""}
                data-testid="item-service-type-hidden"
              />
              <Combobox
                value={selectedService}
                onValueChange={(v) => setSelectedService(v || null)}
                items={groupedItems}
                itemToStringLabel={(s) => s?.name ?? ""}
                itemToStringValue={(s) => s?.id ?? ""}
                autoHighlight
              >
                <ComboboxInput
                  placeholder="None (link only)"
                  disabled={isPending || isLoadingConfig}
                  showTrigger
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>No service found</ComboboxEmpty>
                  <ComboboxList>
                    {(group) => (
                      <ComboboxGroup key={group.value} items={group.items}>
                        <ComboboxLabel>
                          {group.value === "general"
                            ? "General Widgets"
                            : "Service Widgets"}
                        </ComboboxLabel>
                        <ComboboxCollection>
                          {(service: ServiceDefinition) => (
                            <ComboboxItem key={service.id} value={service}>
                              {service.name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxGroup>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <p className="text-xs text-muted-foreground">
                Select a service to show live data on this card
              </p>
            </div>

            {serviceDef && serviceDef.configFields.length > 0 && (
              <div
                className="mt-2 border-t pt-4"
                data-testid="item-service-config"
              >
                <h4 className="mb-3 text-sm font-medium">
                  Service Configuration
                </h4>
                <div className="flex flex-col gap-4">
                  {serviceDef.configFields.map((field: FieldDef) => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      defaultValue={configValues[field.key] ?? ""}
                      disabled={isPending || isLoadingConfig}
                      checked={
                        field.type === "boolean"
                          ? (booleanValues[field.key] ?? false)
                          : undefined
                      }
                      onCheckedChange={
                        field.type === "boolean"
                          ? (checked: boolean) =>
                              setBooleanValues((prev) => ({
                                ...prev,
                                [field.key]: checked,
                              }))
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {serviceDef && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-polling">Polling Interval (seconds)</Label>
                <Input
                  id="item-polling"
                  name="pollingMs"
                  type="number"
                  min="1"
                  defaultValue={Math.round(
                    (existingItem?.pollingMs ??
                      serviceDef.defaultPollingMs ??
                      10000) / 1000
                  )}
                  placeholder={String(
                    Math.round((serviceDef.defaultPollingMs ?? 10000) / 1000)
                  )}
                  data-testid="item-polling-input"
                />
                <p className="text-xs text-muted-foreground">
                  How often to refresh data (default:{" "}
                  {Math.round((serviceDef.defaultPollingMs ?? 10000) / 1000)}s)
                </p>
              </div>
            )}

            {error && (
              <p
                className="text-sm text-destructive"
                data-testid="item-dialog-error"
              >
                {error}
              </p>
            )}
          </div>
        </form>

        <DialogFooter showCloseButton>
          <Button
            form="item-dialog-form"
            type="submit"
            disabled={isPending}
            data-testid="item-dialog-submit"
          >
            {isPending ? "Saving…" : isEdit ? "Save" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
