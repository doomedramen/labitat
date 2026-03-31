"use client"

import { useTransition, useState, useEffect } from "react"
import { createItem, updateItem, getItemConfig } from "@/actions/items"
import type { ItemRow } from "@/lib/types"
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
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { CheckIcon } from "lucide-react"
import { FieldRenderer } from "./field-renderer"

type ItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemRow | null
  groupId: string | null
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  groupId,
}: ItemDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<
    (typeof services)[number] | null
  >(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const isEdit = item !== null

  const services = getAllServices()
  const serviceDef = selectedService

  // Initialize state when dialog opens
  useEffect(() => {
    if (!open) return

    const init = async () => {
      // Convert service type ID to service object
      const service = item?.serviceType
        ? services.find((s) => s.id === item.serviceType) || null
        : null
      setSelectedService(service)
      setConfigValues({})
      setIsLoadingConfig(false)

      // Load decrypted config when editing an existing item
      if (item?.id && item?.serviceType) {
        setIsLoadingConfig(true)
        try {
          const config = await getItemConfig(item.id)
          setConfigValues(config)
        } catch {
          setConfigValues({})
        } finally {
          setIsLoadingConfig(false)
        }
      }
    }
    init()
  }, [open, item?.id, item?.serviceType, item])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!groupId) return
    const formData = new FormData(e.currentTarget)
    setError(null)

    // Debug: log form data on client
    console.log("=== CLIENT: formData ===")
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value)
    }
    console.log("========================")

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateItem(item.id, formData)
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
          key={item?.id ?? "new"}
          id="item-dialog-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-label">Label</Label>
              <Input
                id="item-label"
                name="label"
                defaultValue={item?.label ?? ""}
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
                defaultValue={item?.href ?? ""}
                placeholder="https://sonarr.home.lab"
                data-testid="item-href-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="item-icon">Icon</Label>
              <Input
                id="item-icon"
                name="iconUrl"
                defaultValue={item?.iconUrl ?? ""}
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
                items={services}
                itemToStringValue={(s) => s.name}
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
                    <ComboboxEmpty>No service found</ComboboxEmpty>
                    <ComboboxItem value={undefined}>
                      None (link only)
                    </ComboboxItem>
                    {services
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((s) => (
                        <ComboboxItem key={s.id} value={s}>
                          <CheckIcon
                            className={cn(
                              "size-4",
                              selectedService?.id === s.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {s.name}
                        </ComboboxItem>
                      ))}
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
                  {serviceDef.configFields.map((field) => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      defaultValue={configValues[field.key] ?? ""}
                      disabled={isPending || isLoadingConfig}
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
                    item?.pollingMs ?? serviceDef.defaultPollingMs ?? 10000
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
