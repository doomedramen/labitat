import type { FC } from "react"

// ── Field types ───────────────────────────────────────────────────────────────

export type FieldType =
  | "url"
  | "password"
  | "text"
  | "number"
  | "select"
  | "boolean"

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: { label: string; value: string }[] // for 'select' type
}

// ── Service categories ─────────────────────────────────────────────────────────

export type ServiceCategory =
  | "media"
  | "downloads"
  | "networking"
  | "monitoring"
  | "storage"
  | "automation"
  | "security"
  | "finance"
  | "productivity"
  | "info"

// ── Service data ──────────────────────────────────────────────────────────────

export type ServiceData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  [key: string]: unknown
}

// ── Service definition ─────────────────────────────────────────────────────────

export type ServiceDefinition<TData extends ServiceData = ServiceData> = {
  id: string
  name: string
  icon: string // selfh.st slug or full URL
  category: ServiceCategory
  configFields: FieldDef[]
  defaultPollingMs?: number
  fetchData: (config: Record<string, string>) => Promise<TData>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Widget: FC<any> // Widget receives the data returned by fetchData
}

// ── Registry type ─────────────────────────────────────────────────────────────

export type ServiceRegistry = Record<string, ServiceDefinition<ServiceData>>
