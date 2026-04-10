import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { proxmoxBackupServerDefinition } from "@/lib/adapters/proxmox-backup-server"

describe("proxmox-backup-server definition", () => {
  it("has correct metadata", () => {
    expect(proxmoxBackupServerDefinition.id).toBe("proxmox-backup-server")
    expect(proxmoxBackupServerDefinition.name).toBe("Proxmox Backup Server")
    expect(proxmoxBackupServerDefinition.icon).toBe("proxmox-backup-server")
    expect(proxmoxBackupServerDefinition.category).toBe("storage")
    expect(proxmoxBackupServerDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(proxmoxBackupServerDefinition.configFields).toBeDefined()
    expect(proxmoxBackupServerDefinition.configFields).toHaveLength(3)
    expect(proxmoxBackupServerDefinition.configFields[0].key).toBe("url")
    expect(proxmoxBackupServerDefinition.configFields[0].type).toBe("url")
    expect(proxmoxBackupServerDefinition.configFields[0].required).toBe(true)
    expect(proxmoxBackupServerDefinition.configFields[1].key).toBe("username")
    expect(proxmoxBackupServerDefinition.configFields[1].type).toBe("text")
    expect(proxmoxBackupServerDefinition.configFields[1].required).toBe(true)
    expect(proxmoxBackupServerDefinition.configFields[2].key).toBe("password")
    expect(proxmoxBackupServerDefinition.configFields[2].type).toBe("password")
    expect(proxmoxBackupServerDefinition.configFields[2].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/access/ticket")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ticket: "ticket123", CSRFPreventionToken: "csrf123" },
              }),
          })
        }
        if (url.includes("/datastore") && !url.includes("/snapshots")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  { store: "ds1", used: 500000000000, total: 1000000000000 },
                  { store: "ds2", used: 200000000000, total: 500000000000 },
                ],
              }),
          })
        }
        if (url.includes("/snapshots")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [{}, {}, {}, {}, {}],
              }),
          })
        }
        if (url.includes("/status")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  cpu: 0.35, // 35% CPU
                  memory: { used: 8000000000, total: 32000000000 },
                },
              }),
          })
        }
        if (url.includes("/tasks")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [{}, {}, {}], // 3 failed tasks
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await proxmoxBackupServerDefinition.fetchData!({
        url: "https://pbs.example.com:8007/",
        username: "root@pam",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.datastores).toBe(2)
      expect(result.snapshots).toBe(10) // 5 per datastore
      expect(result.usedSpace).toBe("651.9 GB")
      expect(result.totalSpace).toBe("1.4 TB")
      expect(result.usagePercent).toBeCloseTo(46.7, 0)
      expect(result.cpuUsage).toBeCloseTo(35, 0)
      expect(result.memoryUsage).toBeCloseTo(25, 0)
      expect(result.failedTasks).toBe(3)
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        proxmoxBackupServerDefinition.fetchData!({
          url: "https://pbs.example.com:8007",
          username: "root@pam",
          password: "wrong",
        })
      ).rejects.toThrow("PBS login failed: 401")
    })

    it("throws on API error after login", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/access/ticket")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ticket: "ticket123", CSRFPreventionToken: "csrf123" },
              }),
          })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        proxmoxBackupServerDefinition.fetchData!({
          url: "https://pbs.example.com:8007",
          username: "root@pam",
          password: "secret",
        })
      ).rejects.toThrow("PBS error: 500")
    })

    it("handles empty datastores", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/access/ticket")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ticket: "ticket123", CSRFPreventionToken: "csrf123" },
              }),
          })
        }
        if (url.includes("/datastore")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          })
        }
        if (url.includes("/status")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: {} }),
          })
        }
        if (url.includes("/tasks")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await proxmoxBackupServerDefinition.fetchData!({
        url: "https://pbs.example.com:8007",
        username: "root@pam",
        password: "secret",
      })

      expect(result.datastores).toBe(0)
      expect(result.snapshots).toBe(0)
      expect(result.usedSpace).toBe("0 B")
      expect(result.totalSpace).toBe("0 B")
      expect(result.usagePercent).toBe(0)
      expect(result.cpuUsage).toBe(0)
      expect(result.memoryUsage).toBe(0)
      expect(result.failedTasks).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = proxmoxBackupServerDefinition.toPayload!({
        _status: "ok",
        datastores: 2,
        snapshots: 15,
        usedSpace: "651.6 GB",
        totalSpace: "1.4 TB",
        usagePercent: 46.7,
        cpuUsage: 35.2,
        memoryUsage: 25.0,
        memoryUsed: "8.0 GB",
        memoryTotal: "32.0 GB",
        failedTasks: 3,
      })
      expect(payload.stats).toHaveLength(6)
      expect(payload.stats[0].value).toBe(2)
      expect(payload.stats[0].label).toBe("Stores")
      expect(payload.stats[1].value).toBe(15)
      expect(payload.stats[1].label).toBe("Snaps")
      expect(payload.stats[2].value).toBe("46.7%")
      expect(payload.stats[2].label).toBe("Usage")
      expect(payload.stats[2].tooltip).toBe("651.6 GB / 1.4 TB")
      expect(payload.stats[3].value).toBe("3")
      expect(payload.stats[3].label).toBe("Failed")
      expect(payload.stats[4].value).toBe("35.2%")
      expect(payload.stats[4].label).toBe("CPU")
      expect(payload.stats[5].value).toBe("25.0%")
      expect(payload.stats[5].label).toBe("Memory")
    })

    it("caps failed tasks at 99+", () => {
      const payload = proxmoxBackupServerDefinition.toPayload!({
        _status: "ok",
        datastores: 2,
        snapshots: 15,
        usedSpace: "651.6 GB",
        totalSpace: "1.4 TB",
        usagePercent: 46.7,
        cpuUsage: 35.2,
        memoryUsage: 25.0,
        memoryUsed: "8.0 GB",
        memoryTotal: "32.0 GB",
        failedTasks: 150,
      })
      expect(payload.stats[3].value).toBe("99+")
    })

    it("handles zero values", () => {
      const payload = proxmoxBackupServerDefinition.toPayload!({
        _status: "ok",
        datastores: 0,
        snapshots: 0,
        usedSpace: "0 B",
        totalSpace: "0 B",
        usagePercent: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        memoryUsed: "0 B",
        memoryTotal: "0 B",
        failedTasks: 0,
      })
      expect(payload.stats[0].value).toBe(0)
      expect(payload.stats[1].value).toBe(0)
      expect(payload.stats[2].value).toBe("0.0%")
      expect(payload.stats[3].value).toBe("0")
      expect(payload.stats[4].value).toBe("0.0%")
      expect(payload.stats[5].value).toBe("0.0%")
    })
  })
})
