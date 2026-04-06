"use client"

import { useState } from "react"
import type { FieldDef } from "@/lib/adapters/types"
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

type FieldRendererProps = {
  field: FieldDef
  defaultValue?: string
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  checked?: boolean
}

export function FieldRenderer({
  field,
  defaultValue = "",
  disabled,
  onCheckedChange,
  checked,
}: FieldRendererProps) {
  const id = `field-${field.key}`
  const name = `config_${field.key}`
  const [selectValue, setSelectValue] = useState(
    field.type === "select" && field.options
      ? defaultValue || field.options[0]?.value
      : ""
  )

  if (field.type === "select" && field.options) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <Select
          name={name}
          value={selectValue}
          onValueChange={(v) => {
            if (v != null) setSelectValue(v)
          }}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helperText && (
          <p className="text-xs text-muted-foreground">{field.helperText}</p>
        )}
      </div>
    )
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id}>{field.label}</Label>
          {field.helperText && (
            <p className="text-xs text-muted-foreground">{field.helperText}</p>
          )}
        </div>
        <Switch
          id={id}
          name={name}
          checked={checked ?? defaultValue === "true"}
          onCheckedChange={onCheckedChange}
          value="true"
          uncheckedValue="false"
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={id}
        name={name}
        type={
          field.type === "url"
            ? "url"
            : field.type === "password"
              ? "password"
              : field.type === "number"
                ? "number"
                : "text"
        }
        placeholder={field.placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        required={field.required}
        autoComplete={field.type === "password" ? "off" : undefined}
      />
      {field.helperText && (
        <p className="text-xs text-muted-foreground">{field.helperText}</p>
      )}
    </div>
  )
}
