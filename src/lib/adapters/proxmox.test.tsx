import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { proxmoxDefinition } from "@/lib/adapters/proxmox"

describe("proxmox definition", () => {
  it("has correct metadata", () => {
    expect(proxmoxDefinition.id).toBe("proxmox")
    expect(proxmoxDefinition.name).toBe("Proxmox")
    expect(proxmoxDefinition.icon).toBe("proxmox")
    expect(proxmoxDefinition.category).toBe("monitoring")
    expect(proxmoxDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(proxmoxDefinition.configFields).toBeDefined()
    expect(proxmoxDefinition.configFields).toHaveLength(3)
    expect(proxmoxDefinition.configFields[0].key).toBe("url")
    expect(proxmoxDefinition.configFields[0].type).toBe("url")
    expect(proxmoxDefinition.configFields[0].required).toBe(true)
    expect(proxmoxDefinition.configFields[1].key).toBe("username")
    expect(proxmoxDefinition.configFields[1].type).toBe("text")
    expect(proxmoxDefinition.configFields[1].required).toBe(true)
    expect(proxmoxDefinition.configFields[2].key).toBe("password")
    expect(proxmoxDefinition.configFields[2].type).toBe("password")
    expect(proxmoxDefinition.configFields[2].required).toBe(true)
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
        if (url.includes("/cluster/resources")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  { type: "node" },
                  { type: "node" },
                  { type: "qemu", status: "running" },
                  { type: "qemu", status: "stopped" },
                  { type: "qemu", status: "running" },
                  { type: "lxc", status: "running" },
                  { type: "lxc", status: "stopped" },
                ],
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await proxmoxDefinition.fetchData!({
        url: "https://proxmox.example.com:8006/",
        username: "root@pam",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.nodes).toBe(2)
      expect(result.vms).toBe(3)
      expect(result.containers).toBe(2)
      expect(result.runningVMs).toBe(2)
      expect(result.runningContainers).toBe(1)
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        proxmoxDefinition.fetchData!({
          url: "https://proxmox.example.com:8006",
          username: "root@pam",
          password: "wrong",
        })
      ).rejects.toThrow("Proxmox login failed: 401")
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
        proxmoxDefinition.fetchData!({
          url: "https://proxmox.example.com:8006",
          username: "root@pam",
          password: "secret",
        })
      ).rejects.toThrow("Proxmox error: 500")
    })

    it("handles empty resources", async () => {
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
        if (url.includes("/cluster/resources")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await proxmoxDefinition.fetchData!({
        url: "https://proxmox.example.com:8006",
        username: "root@pam",
        password: "secret",
      })

      expect(result.nodes).toBe(0)
      expect(result.vms).toBe(0)
      expect(result.containers).toBe(0)
      expect(result.runningVMs).toBe(0)
      expect(result.runningContainers).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = proxmoxDefinition.toPayload!({
        _status: "ok",
        nodes: 2,
        vms: 5,
        containers: 3,
        runningVMs: 4,
        runningContainers: 2,
      })
      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].value).toBe(2)
      expect(payload.stats[0].label).toBe("Nodes")
      expect(payload.stats[1].value).toBe("4/5")
      expect(payload.stats[1].label).toBe("VMs")
      expect(payload.stats[2].value).toBe("2/3")
      expect(payload.stats[2].label).toBe("LXCs")
    })

    it("handles zero values", () => {
      const payload = proxmoxDefinition.toPayload!({
        _status: "ok",
        nodes: 0,
        vms: 0,
        containers: 0,
        runningVMs: 0,
        runningContainers: 0,
      })
      expect(payload.stats[0].value).toBe(0)
      expect(payload.stats[1].value).toBe("0/0")
      expect(payload.stats[2].value).toBe("0/0")
    })
  })
})
