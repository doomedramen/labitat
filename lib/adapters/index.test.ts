import { describe, it, expect } from "vitest"
import { getService, getAllServices, registry } from "@/lib/adapters"

describe("service registry", () => {
  it("has at least 20 registered services", () => {
    const count = Object.keys(registry).length
    expect(count).toBeGreaterThanOrEqual(20)
  })

  it("returns a service by ID", () => {
    const service = getService("radarr")
    expect(service).toBeDefined()
    expect(service?.id).toBe("radarr")
  })

  it("returns undefined for unknown service", () => {
    expect(getService("nonexistent-service")).toBeUndefined()
  })

  it("all services have required fields", () => {
    const services = getAllServices()
    for (const service of services) {
      expect(service.id).toBeDefined()
      expect(service.name).toBeDefined()
      expect(service.icon).toBeDefined()
      expect(service.category).toBeDefined()
      expect(service.configFields).toBeDefined()
      expect(service.Widget).toBeDefined()
    }
  })

  it("all service IDs are unique", () => {
    const services = getAllServices()
    const ids = services.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  it("all service IDs are lowercase and hyphen-separated", () => {
    const services = getAllServices()
    for (const service of services) {
      expect(service.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it("sensitive config fields are marked as password", () => {
    const services = getAllServices()
    for (const service of services) {
      const sensitiveFields = service.configFields.filter(
        (f) =>
          f.key.toLowerCase().includes("key") ||
          f.key.toLowerCase().includes("token") ||
          f.key.toLowerCase().includes("password") ||
          f.key.toLowerCase().includes("secret")
      )
      for (const field of sensitiveFields) {
        expect(field.type).toBe("password")
      }
    }
  })
})
