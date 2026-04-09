import type { FC } from "react"
import type { WidgetPayload } from "./widget-types"

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
  defaultChecked?: boolean // for 'boolean' type — initial checked state
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

/**
 * Base type for all widget data.
 * Every adapter's TData extends this.
 * _status and _statusText are optional — adapters set them to indicate health.
 */
export type ServiceData = {
  _status?: "ok" | "warn" | "error" | "none"
  _statusText?: string
  [key: string]: unknown
}

// ── Service definition ─────────────────────────────────────────────────────────

/**
 * Unified service adapter definition.
 *
 * ## How adapters work:
 *
 * ### Server-side adapter (most common)
 * - Define `fetchData(config)` → returns `TData`
 * - Define `toPayload(data)` → returns `WidgetPayload`
 * - Server calls fetchData, caches result, sends to client
 * - Client SWR revalidates by calling the server action
 * - WidgetContainer renders the payload
 *
 * ### Client-side adapter
 * - Set `clientSide: true`
 * - Widget handles its own data fetching (e.g., client API calls)
 * - `fetchData` is optional — if provided, called once for initial config
 *
 * ### Custom widget (Pipes, Search, DateTime, Matrix Rain)
 * - Define `renderWidget(data)` → returns custom JSX
 * - Bypasses WidgetContainer for fully custom UI
 *
 * ### Static link (no adapter)
 * - No `fetchData`, no `toPayload`, no `renderWidget`
 * - Just an icon + label + href
 */
export type ServiceDefinition<TData extends ServiceData = ServiceData> = {
  id: string
  name: string
  icon: string // selfh.st slug or full URL
  category: ServiceCategory
  configFields: FieldDef[]
  defaultPollingMs?: number

  /**
   * Server-side data fetcher.
   * Receives decrypted config, returns typed data.
   * Omit for client-side widgets or static links.
   */
  fetchData?: (config: Record<string, string>) => Promise<TData>

  /**
   * Mark as client-side widget.
   * Widget handles its own data fetching.
   */
  clientSide?: boolean

  /**
   * Convert fetched data to standardized widget payload.
   * WidgetContainer renders this automatically.
   * Use this for standard stat grids + optional lists.
   */
  toPayload?: (data: TData) => WidgetPayload

  /**
   * Custom widget renderer.
   * For fully custom UI that bypasses WidgetContainer (e.g. Matrix Rain, Pipes, Search).
   * If both toPayload and renderWidget are defined, renderWidget takes precedence.
   */
  renderWidget?: FC<TData>
}

// ── Registry type ─────────────────────────────────────────────────────────────

export type ServiceRegistry = Record<string, ServiceDefinition<ServiceData>>
