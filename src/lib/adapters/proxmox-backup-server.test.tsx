import { render, screen } from "@testing-library/react"
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
      expect(result.snapshots).toBe(5)
      expect(result.usedSpace).toBe("651.9 GB")
      expect(result.totalSpace).toBe("1.4 TB")
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
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <proxmoxBackupServerDefinition.Widget
          datastores={2}
          snapshots={15}
          usedSpace="651.6 GB"
          totalSpace="1.4 TB"
        />
      )
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("15")).toBeInTheDocument()
      expect(screen.getByText("651.6 GB")).toBeInTheDocument()
      expect(screen.getByText("1.4 TB")).toBeInTheDocument()
      expect(screen.getByText("Stores")).toBeInTheDocument()
      expect(screen.getByText("Snaps")).toBeInTheDocument()
      expect(screen.getByText("Used")).toBeInTheDocument()
      expect(screen.getByText("Total")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <proxmoxBackupServerDefinition.Widget
          datastores={0}
          snapshots={0}
          usedSpace="0 B"
          totalSpace="0 B"
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(2)
      expect(screen.getAllByText("0 B")).toHaveLength(2)
    })
  })
})
