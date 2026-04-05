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

// ── Service status ──────────────────────────────────────────────────────────────

export type ServiceStatus =
  | { state: "unknown" }
  | { state: "healthy"; latencyMs?: number }
  | { state: "reachable" } // HTTP 200 but no service adapter
  | { state: "unreachable"; reason: string } // Network error (timeout, refused, DNS)
  | { state: "error"; reason: string; httpStatus?: number } // HTTP 4xx/5xx or adapter error

// Convert legacy ServiceData._status to new ServiceStatus
export function dataToStatus(data: ServiceData): ServiceStatus {
  const status = data._status

  if (!status || status === "none") {
    return { state: "unknown" }
  }

  if (status === "ok") {
    return { state: "healthy" }
  }

  if (status === "warn") {
    return { state: "healthy" } // Warn is still healthy, just with caveats
  }

  if (status === "error") {
    return {
      state: "error",
      reason: data._statusText || "Service error",
    }
  }

  return { state: "unknown" }
}

// ── Service data ──────────────────────────────────────────────────────────────

export type ServiceData = {
  _status?: "ok" | "warn" | "error" | "none"
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
  fetchData?: (config: Record<string, string>) => Promise<TData>
  Widget: FC<TData> // Widget receives the data returned by fetchData
  clientSide?: boolean // Widget handles its own data fetching/updates client-side
}

// ── Registry type ─────────────────────────────────────────────────────────────

export type ServiceRegistry = Record<string, ServiceDefinition<ServiceData>>
