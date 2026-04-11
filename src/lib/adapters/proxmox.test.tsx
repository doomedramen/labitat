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
    expect(proxmoxDefinition.configFields).toHaveLength(4)
    expect(proxmoxDefinition.configFields[0].key).toBe("url")
    expect(proxmoxDefinition.configFields[0].type).toBe("url")
    expect(proxmoxDefinition.configFields[0].required).toBe(true)
    expect(proxmoxDefinition.configFields[1].key).toBe("username")
    expect(proxmoxDefinition.configFields[1].type).toBe("text")
    expect(proxmoxDefinition.configFields[1].required).toBe(true)
    expect(proxmoxDefinition.configFields[2].key).toBe("password")
    expect(proxmoxDefinition.configFields[2].type).toBe("password")
    expect(proxmoxDefinition.configFields[2].required).toBe(true)
    expect(proxmoxDefinition.configFields[3].key).toBe("node")
    expect(proxmoxDefinition.configFields[3].type).toBe("text")
    expect(proxmoxDefinition.configFields[3].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("handles network errors", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(new TypeError("Network request failed"))
      )
      await expect(
        proxmoxDefinition.fetchData!({
          url: "https://example.com",
          username: "root@pam",
          password: "test",
        })
      ).rejects.toThrow()
    })

    it("handles timeout errors", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(
          new DOMException("The operation was aborted", "AbortError")
        )
      )
      await expect(
        proxmoxDefinition.fetchData!({
          url: "https://example.com",
          username: "root@pam",
          password: "test",
        })
      ).rejects.toThrow()
    })

    it("throws when URL is missing", async () => {
      await expect(
        proxmoxDefinition.fetchData!({
          url: "",
          username: "root@pam",
          password: "test",
        })
      ).rejects.toThrow()
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
                  {
                    type: "node",
                    cpu: 0.5,
                    maxcpu: 4,
                    mem: 4000000000,
                    maxmem: 16000000000,
                  },
                  {
                    type: "node",
                    cpu: 0.3,
                    maxcpu: 4,
                    mem: 3000000000,
                    maxmem: 16000000000,
                  },
                  {
                    type: "qemu",
                    status: "running",
                    cpu: 1.0,
                    maxcpu: 2,
                    mem: 2000000000,
                    maxmem: 8000000000,
                  },
                  {
                    type: "qemu",
                    status: "stopped",
                    cpu: 0,
                    maxcpu: 2,
                    mem: 0,
                    maxmem: 8000000000,
                  },
                  {
                    type: "qemu",
                    status: "running",
                    cpu: 0.5,
                    maxcpu: 2,
                    mem: 1000000000,
                    maxmem: 8000000000,
                  },
                  {
                    type: "lxc",
                    status: "running",
                    cpu: 0.2,
                    maxcpu: 1,
                    mem: 500000000,
                    maxmem: 4000000000,
                  },
                  {
                    type: "lxc",
                    status: "stopped",
                    cpu: 0,
                    maxcpu: 1,
                    mem: 0,
                    maxmem: 4000000000,
                  },
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
      expect(result.cpuUsage).toBeGreaterThan(0)
      expect(result.memoryUsage).toBeGreaterThan(0)
      expect(result.memoryUsed).toBeDefined()
      expect(result.memoryTotal).toBeDefined()
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
      expect(result.cpuUsage).toBe(0)
      expect(result.memoryUsage).toBe(0)
      expect(result.memoryUsed).toBe("0 B")
      expect(result.memoryTotal).toBe("0 B")
    })

    it("filters by node when specified", async () => {
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
                  {
                    type: "node",
                    node: "pve1",
                    cpu: 0.5,
                    maxcpu: 4,
                    mem: 4000000000,
                    maxmem: 16000000000,
                  },
                  {
                    type: "node",
                    node: "pve2",
                    cpu: 0.3,
                    maxcpu: 4,
                    mem: 3000000000,
                    maxmem: 16000000000,
                  },
                  {
                    type: "qemu",
                    node: "pve1",
                    status: "running",
                    cpu: 1.0,
                    maxcpu: 2,
                    mem: 2000000000,
                    maxmem: 8000000000,
                  },
                  {
                    type: "qemu",
                    node: "pve2",
                    status: "running",
                    cpu: 0.5,
                    maxcpu: 2,
                    mem: 1000000000,
                    maxmem: 8000000000,
                  },
                  {
                    type: "lxc",
                    node: "pve1",
                    status: "running",
                    cpu: 0.2,
                    maxcpu: 1,
                    mem: 500000000,
                    maxmem: 4000000000,
                  },
                ],
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await proxmoxDefinition.fetchData!({
        url: "https://proxmox.example.com:8006",
        username: "root@pam",
        password: "secret",
        node: "pve1",
      })

      expect(result._status).toBe("ok")
      expect(result.nodes).toBe(1)
      expect(result.vms).toBe(1)
      expect(result.containers).toBe(1)
      expect(result.runningVMs).toBe(1)
      expect(result.runningContainers).toBe(1)
      // CPU/memory should only come from pve1 node
      expect(result.cpuUsage).toBeGreaterThan(0)
      expect(result.memoryUsage).toBeGreaterThan(0)
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
        cpuUsage: 45.5,
        memoryUsage: 62.3,
        memoryUsed: "12.5 GB",
        memoryTotal: "32.0 GB",
      })
      expect(payload.stats).toHaveLength(5)
      expect(payload.stats[0].value).toBe(2)
      expect(payload.stats[0].label).toBe("Nodes")
      expect(payload.stats[1].value).toBe("4/5")
      expect(payload.stats[1].label).toBe("VMs")
      expect(payload.stats[2].value).toBe("2/3")
      expect(payload.stats[2].label).toBe("LXCs")
      expect(payload.stats[3].value).toBe("45.5%")
      expect(payload.stats[3].label).toBe("CPU")
      expect(payload.stats[4].value).toBe("62.3%")
      expect(payload.stats[4].label).toBe("Memory")
      expect(payload.stats[4].tooltip).toBe("12.5 GB / 32.0 GB")
    })

    it("handles zero values", () => {
      const payload = proxmoxDefinition.toPayload!({
        _status: "ok",
        nodes: 0,
        vms: 0,
        containers: 0,
        runningVMs: 0,
        runningContainers: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        memoryUsed: "0 B",
        memoryTotal: "0 B",
      })
      expect(payload.stats[0].value).toBe(0)
      expect(payload.stats[1].value).toBe("0/0")
      expect(payload.stats[2].value).toBe("0/0")
      expect(payload.stats[3].value).toBe("0.0%")
      expect(payload.stats[4].value).toBe("0.0%")
    })
  })
})
