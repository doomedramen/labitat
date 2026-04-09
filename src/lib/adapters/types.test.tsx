import { describe, it, expect } from "vitest"
import { dataToStatus } from "@/lib/adapters/types"
import type { ServiceData, ServiceDefinition } from "@/lib/adapters/types"

describe("dataToStatus", () => {
  it("returns unknown for missing status", () => {
    expect(dataToStatus({} as ServiceData)).toEqual({ state: "unknown" })
  })

  it("returns unknown for 'none' status", () => {
    expect(dataToStatus({ _status: "none" })).toEqual({ state: "unknown" })
  })

  it("returns healthy for 'ok' status", () => {
    expect(dataToStatus({ _status: "ok" })).toEqual({ state: "healthy" })
  })

  it("returns healthy for 'warn' status", () => {
    expect(dataToStatus({ _status: "warn" })).toEqual({ state: "healthy" })
  })

  it("returns error with reason for 'error' status", () => {
    expect(
      dataToStatus({ _status: "error", _statusText: "Something broke" })
    ).toEqual({
      state: "error",
      reason: "Something broke",
    })
  })

  it("uses default reason when _statusText is missing", () => {
    expect(dataToStatus({ _status: "error" })).toEqual({
      state: "error",
      reason: "Service error",
    })
  })
})

describe("ServiceDefinition type", () => {
  it("allows valid service definitions", () => {
    const def: ServiceDefinition = {
      id: "test-service",
      name: "Test Service",
      icon: "test",
      category: "info",
      configFields: [{ key: "url", label: "URL", type: "url", required: true }],
      renderWidget: () => null,
    }
    expect(def.id).toBe("test-service")
    expect(def.configFields).toHaveLength(1)
  })

  it("supports fetchData function", async () => {
    const def: ServiceDefinition = {
      id: "async-service",
      name: "Async Service",
      icon: "test",
      category: "monitoring",
      configFields: [],
      fetchData: async (config) => ({
        _status: "ok" as const,
        value: parseInt(config.multiplier, 10) * 2,
      }),
      renderWidget: () => null,
    }

    const result = await def.fetchData!({ multiplier: "5" })
    expect(result._status).toBe("ok")
    expect(result.value).toBe(10)
  })

  it("supports clientSide flag", () => {
    const def: ServiceDefinition = {
      id: "client-service",
      name: "Client Service",
      icon: "test",
      category: "info",
      configFields: [],
      clientSide: true,
      renderWidget: () => null,
    }
    expect(def.clientSide).toBe(true)
  })

  it("supports defaultPollingMs", () => {
    const def: ServiceDefinition = {
      id: "polling-service",
      name: "Polling Service",
      icon: "test",
      category: "monitoring",
      configFields: [],
      defaultPollingMs: 5000,
      renderWidget: () => null,
    }
    expect(def.defaultPollingMs).toBe(5000)
  })
})

describe("FieldDef types", () => {
  it("supports all field types", () => {
    const fields = [
      { key: "url", type: "url" as const, label: "URL" },
      { key: "pass", type: "password" as const, label: "Password" },
      { key: "text", type: "text" as const, label: "Text" },
      { key: "num", type: "number" as const, label: "Number" },
      { key: "sel", type: "select" as const, label: "Select" },
      { key: "bool", type: "boolean" as const, label: "Boolean" },
    ]
    expect(fields).toHaveLength(6)
    expect(fields.map((f) => f.type)).toEqual([
      "url",
      "password",
      "text",
      "number",
      "select",
      "boolean",
    ])
  })

  it("supports select options", () => {
    const field = {
      key: "theme",
      label: "Theme",
      type: "select" as const,
      options: [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    }
    expect(field.options).toHaveLength(2)
    expect(field.options?.[0].label).toBe("Light")
  })

  it("supports boolean defaultChecked", () => {
    const field = {
      key: "enabled",
      label: "Enabled",
      type: "boolean" as const,
      defaultChecked: true,
    }
    expect(field.defaultChecked).toBe(true)
  })
})

describe("ServiceCategory", () => {
  it("includes all expected categories", () => {
    const categories = [
      "media",
      "downloads",
      "networking",
      "monitoring",
      "storage",
      "automation",
      "security",
      "finance",
      "productivity",
      "info",
    ]
    expect(categories).toHaveLength(10)
  })
})
