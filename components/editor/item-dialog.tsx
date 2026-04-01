"use client"

import { useTransition, useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
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
  ComboboxSeparator,
} from "@/components/ui/combobox"
import { CheckIcon } from "lucide-react"
import { FieldRenderer } from "./field-renderer"

type ItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingItem: ItemRow | null
  groupId: string | null
}

export function ItemDialog({
  open,
  onOpenChange,
  existingItem,
  groupId,
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
  const isEdit = existingItem !== null

  // Separate services into general widgets and service widgets
  const allServices = getAllServices()
  const generalWidgets = allServices.filter(
    (s) =>
      s.clientSide ||
      [
        "openmeteo",
        "openweathermap",
        "datetime",
        "glances",
        "logo",
        "search",
      ].includes(s.id)
  )
  const serviceWidgets = allServices.filter(
    (s) =>
      !s.clientSide &&
      ![
        "openmeteo",
        "openweathermap",
        "datetime",
        "glances",
        "logo",
        "search",
      ].includes(s.id)
  )

  // Grouped structure for Combobox with groups
  const groupedItems = [
    { value: "general", items: generalWidgets },
    { value: "services", items: serviceWidgets },
  ].filter((g) => g.items.length > 0)

  // Initialize state when dialog opens
  useEffect(() => {
    if (!open) return

    const init = async () => {
      // Convert service type ID to service object
      const service = existingItem?.serviceType
        ? allServices.find((s) => s.id === existingItem.serviceType) || null
        : null
      setSelectedService(service)
      setConfigValues({})
      setBooleanValues({})
      setIsLoadingConfig(false)

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
  }, [
    open,
    existingItem?.id,
    existingItem?.serviceType,
    existingItem,
    allServices,
  ])

  const serviceDef = selectedService

  // Auto-update label when service changes (for new items only)
  useEffect(() => {
    if (!open || isEdit || !selectedService) return
    // Auto-fill label with service name if label is empty or matches previous service name
    const labelInput = document.getElementById("item-label") as HTMLInputElement
    const currentLabel = (existingItem as ItemRow | null)?.label ?? ""
    if (
      labelInput &&
      (!labelInput.value || labelInput.value === currentLabel)
    ) {
      labelInput.value = selectedService.name
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

    // Debug: log form data on client
    console.log("=== CLIENT: formData ===")
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value)
    }
    console.log("========================")

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateItem(existingItem.id, formData)
        } else {
          await createItem(groupId, formData)
        }
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
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
                required
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
              <Label htmlFor="item-icon">Icon</Label>
              <Input
                id="item-icon"
                name="iconUrl"
                defaultValue={existingItem?.iconUrl ?? ""}
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
                itemToStringLabel={(s) => s.name}
                autoHighlight
              >
                <ComboboxInput
                  placeholder="None (link only)"
                  disabled={isPending || isLoadingConfig}
                  showTrigger
                  showClear
                />
                <ComboboxContent>
                  <ComboboxList>
                    {(group, index) => (
                      <>
                        {index === 0 && (
                          <ComboboxItem value={undefined}>
                            None (link only)
                          </ComboboxItem>
                        )}
                        <ComboboxGroup>
                          <ComboboxLabel>
                            {group.value === "general"
                              ? "General Widgets"
                              : "Service Widgets"}
                          </ComboboxLabel>
                          <ComboboxCollection>
                            {(service: ServiceDefinition) => (
                              <ComboboxItem key={service.id} value={service}>
                                <CheckIcon
                                  className={cn(
                                    "size-4",
                                    selectedService?.id === service.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {service.name}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxGroup>
                        {index < groupedItems.length - 1 && (
                          <ComboboxSeparator />
                        )}
                      </>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>No service found</ComboboxEmpty>
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
                <Label htmlFor="item-polling">Polling Interval (ms)</Label>
                <Input
                  id="item-polling"
                  name="pollingMs"
                  type="number"
                  defaultValue={
                    existingItem?.pollingMs ??
                    serviceDef.defaultPollingMs ??
                    10000
                  }
                  placeholder={String(serviceDef.defaultPollingMs ?? 10000)}
                  data-testid="item-polling-input"
                />
                <p className="text-xs text-muted-foreground">
                  How often to refresh data (default:{" "}
                  {serviceDef.defaultPollingMs ?? 10000}ms)
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
