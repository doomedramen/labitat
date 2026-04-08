import { render, screen } from "@testing-library/react"
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

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <proxmoxDefinition.Widget
          nodes={2}
          vms={5}
          containers={3}
          runningVMs={4}
          runningContainers={2}
        />
      )
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("4/5")).toBeInTheDocument()
      expect(screen.getByText("2/3")).toBeInTheDocument()
      expect(screen.getByText("Nodes")).toBeInTheDocument()
      expect(screen.getByText("VMs")).toBeInTheDocument()
      expect(screen.getByText("LXCs")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <proxmoxDefinition.Widget
          nodes={0}
          vms={0}
          containers={0}
          runningVMs={0}
          runningContainers={0}
        />
      )
      expect(screen.getByText("0")).toBeInTheDocument()
      expect(screen.getAllByText("0/0")).toHaveLength(2)
    })
  })
})
