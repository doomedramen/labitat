"use client"

import type { FieldDef } from "@/lib/adapters/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type FieldRendererProps = {
  field: FieldDef
  defaultValue?: string
  disabled?: boolean
}

export function FieldRenderer({
  field,
  defaultValue = "",
  disabled,
}: FieldRendererProps) {
  const id = `field-${field.key}`
  const name = `config_${field.key}`

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
          value="true"
          defaultChecked={defaultValue === "true"}
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
