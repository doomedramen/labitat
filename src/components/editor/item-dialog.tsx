"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createItem, updateItem, getItemConfig } from "@/actions/items"
import { getAllServices } from "@/lib/adapters"
import type { ItemRow } from "@/lib/types"

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemRow | null
  groupId: string
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  groupId,
}: ItemDialogProps) {
  const services = getAllServices()
  const [serviceType, setServiceType] = useState(item?.serviceType ?? "")
  const [configFields, setConfigFields] = useState<Record<string, string>>({})
  const selectedService = services.find((s) => s.id === serviceType)

  // Sync serviceType when item changes, then load config
  useEffect(() => {
    setServiceType(item?.serviceType ?? "")
  }, [item?.id, item?.serviceType])

  // Load config when editing an existing item
  useEffect(() => {
    if (item?.id) {
      getItemConfig(item.id).then((stored) => {
        if (selectedService) {
          const merged = { ...stored }
          for (const field of selectedService.configFields) {
            if (field.type === "boolean" && merged[field.key] === undefined) {
              merged[field.key] = field.defaultChecked ? "true" : "false"
            }
          }
          setConfigFields(merged)
        } else {
          setConfigFields(stored)
        }
      })
    } else {
      // New item — apply defaults for the selected service
      if (selectedService) {
        const defaults: Record<string, string> = {}
        for (const field of selectedService.configFields) {
          if (field.type === "boolean") {
            defaults[field.key] = field.defaultChecked ? "true" : "false"
          }
        }
        setConfigFields(defaults)
      } else {
        setConfigFields({})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, serviceType])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          key={item?.id ?? "new"}
          className="max-h-[80vh] overflow-y-auto"
        >
          <form
            action={async (formData) => {
              if (item) {
                await updateItem(item.id, formData)
              } else {
                await createItem(groupId, formData)
              }
              onOpenChange(false)
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
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  defaultValue={item?.label ?? ""}
                  placeholder="My Service"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="href">URL</Label>
                <Input
                  id="href"
                  name="href"
                  defaultValue={item?.href ?? ""}
                  placeholder="https://service.example.org"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  name="iconUrl"
                  defaultValue={item?.iconUrl ?? ""}
                  placeholder="https://cdn.jsdelivr.net/gh/selfhst/icons/png/service.png"
                />
              </div>

              {/* Service type */}
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select
                  name="serviceType"
                  value={serviceType || "none"}
                  onValueChange={(v) => setServiceType(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (link only)</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service config fields */}
              {selectedService && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {selectedService.name} Config
                  </p>
                  {selectedService.configFields.map((field) => {
                    const fieldValue = configFields[field.key]
                    return (
                      <div key={field.key} className="space-y-1">
                        <Label htmlFor={`config_${field.key}`}>
                          {field.label}
                        </Label>
                        {field.type === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`config_${field.key}`}
                              name={`config_${field.key}`}
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
                            <input
                              type="hidden"
                              name={`config_${field.key}`}
                              value={fieldValue ?? ""}
                            />
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
                        ) : (
                          <Input
                            id={`config_${field.key}`}
                            name={`config_${field.key}`}
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
                            required={field.required}
                          />
                        )}
                        {field.helperText && (
                          <p className="text-xs text-muted-foreground">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Polling interval */}
              <div className="space-y-2">
                <Label htmlFor="pollingMs">Polling Interval (seconds)</Label>
                <Input
                  id="pollingMs"
                  name="pollingMs"
                  type="number"
                  defaultValue={
                    item?.pollingMs ? String(item.pollingMs / 1000) : "10"
                  }
                  placeholder="10"
                />
              </div>

              {/* Clean mode */}
              <div className="flex items-center gap-2">
                <Switch
                  id="cleanMode"
                  name="cleanMode"
                  defaultChecked={item?.cleanMode ?? false}
                />
                <Label htmlFor="cleanMode">Clean mode (minimal display)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{item ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
