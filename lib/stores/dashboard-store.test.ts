import { describe, it, expect, beforeEach } from "vitest"
import { useDashboardStore } from "./dashboard-store"
import type { GroupWithItems, ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

describe("dashboard store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useDashboardStore.setState({
      groups: [],
      widgetData: {},
      pingStatus: {},
    })
  })

  describe("initial state", () => {
    it("should have empty groups array", () => {
      const state = useDashboardStore.getState()
      expect(state.groups).toEqual([])
    })

    it("should have empty widgetData object", () => {
      const state = useDashboardStore.getState()
      expect(state.widgetData).toEqual({})
    })

    it("should have empty pingStatus object", () => {
      const state = useDashboardStore.getState()
      expect(state.pingStatus).toEqual({})
    })
  })

  describe("setGroups", () => {
    it("should update groups", () => {
      const mockGroups: GroupWithItems[] = [
        {
          id: "group-1",
          name: "Media",
          order: 0,
          createdAt: null,
          items: [],
        },
      ]

      useDashboardStore.getState().setGroups(mockGroups)

      const state = useDashboardStore.getState()
      expect(state.groups).toEqual(mockGroups)
    })
  })

  describe("setWidgetData", () => {
    it("should update widget data for specific item", () => {
      const mockData: ServiceData = {
        _status: "ok",
        cpu: 45.2,
        memory: 67.8,
      }

      useDashboardStore.getState().setWidgetData("item-1", mockData)

      const state = useDashboardStore.getState()
      expect(state.widgetData["item-1"]).toEqual(mockData)
    })

    it("should allow setting null widget data", () => {
      useDashboardStore.getState().setWidgetData("item-1", null)

      const state = useDashboardStore.getState()
      expect(state.widgetData["item-1"]).toBeNull()
    })
  })

  describe("setPingStatus", () => {
    it("should update ping status for specific item", () => {
      const mockStatus: ServiceStatus = {
        state: "healthy",
        latencyMs: 120,
      }

      useDashboardStore.getState().setPingStatus("item-1", mockStatus)

      const state = useDashboardStore.getState()
      expect(state.pingStatus["item-1"]).toEqual(mockStatus)
    })
  })

  describe("updateItem", () => {
    const mockGroups: GroupWithItems[] = [
      {
        id: "group-1",
        name: "Media",
        order: 0,
        createdAt: null,
        items: [
          {
            id: "item-1",
            groupId: "group-1",
            label: "Plex",
            href: "http://plex.local",
            iconUrl: "plex",
            order: 0,
            serviceType: null,
            pollingMs: null,
            cleanMode: false,
            createdAt: null,
            serviceUrl: null,
            apiKeyEnc: null,
            configEnc: null,
          },
        ],
      },
    ]

    beforeEach(() => {
      useDashboardStore.getState().setGroups(mockGroups)
    })

    it("should update item properties", () => {
      useDashboardStore.getState().updateItem({
        ...mockGroups[0].items[0],
        label: "Plex Media Server",
        pollingMs: 60000,
      })

      const state = useDashboardStore.getState()
      const updatedItem = state.groups[0].items[0]
      expect(updatedItem.label).toBe("Plex Media Server")
      expect(updatedItem.pollingMs).toBe(60000)
    })

    it("should not affect other items", () => {
      const originalGroups = JSON.parse(JSON.stringify(mockGroups))

      useDashboardStore.getState().updateItem({
        ...mockGroups[0].items[0],
        label: "Updated",
      })

      const state = useDashboardStore.getState()
      expect(state.groups[0].items.length).toBe(1)
      expect(state.groups[0].name).toBe(originalGroups[0].name)
    })
  })

  describe("deleteItem", () => {
    const mockGroups: GroupWithItems[] = [
      {
        id: "group-1",
        name: "Media",
        order: 0,
        createdAt: null,
        items: [
          {
            id: "item-1",
            groupId: "group-1",
            label: "Plex",
            href: "http://plex.local",
            iconUrl: "plex",
            order: 0,
            serviceType: null,
            pollingMs: null,
            cleanMode: false,
            createdAt: null,
            serviceUrl: null,
            apiKeyEnc: null,
            configEnc: null,
          },
          {
            id: "item-2",
            groupId: "group-1",
            label: "Radarr",
            href: "http://radarr.local",
            iconUrl: "radarr",
            order: 1,
            serviceType: null,
            pollingMs: null,
            cleanMode: false,
            createdAt: null,
            serviceUrl: null,
            apiKeyEnc: null,
            configEnc: null,
          },
        ],
      },
    ]

    beforeEach(() => {
      useDashboardStore.getState().setGroups(mockGroups)
      useDashboardStore.getState().setWidgetData("item-1", { _status: "ok" })
      useDashboardStore.getState().setPingStatus("item-1", {
        state: "healthy",
      })
    })

    it("should remove item from groups", () => {
      useDashboardStore.getState().deleteItem("item-1")

      const state = useDashboardStore.getState()
      const itemExists = state.groups.some((g) =>
        g.items.some((i) => i.id === "item-1")
      )
      expect(itemExists).toBe(false)
    })

    it("should remove associated widget data", () => {
      useDashboardStore.getState().deleteItem("item-1")

      const state = useDashboardStore.getState()
      expect(state.widgetData["item-1"]).toBeUndefined()
    })

    it("should remove associated ping status", () => {
      useDashboardStore.getState().deleteItem("item-1")

      const state = useDashboardStore.getState()
      expect(state.pingStatus["item-1"]).toBeUndefined()
    })

    it("should not affect other items", () => {
      useDashboardStore.getState().deleteItem("item-1")

      const state = useDashboardStore.getState()
      const otherItemExists = state.groups.some((g) =>
        g.items.some((i) => i.id === "item-2")
      )
      expect(otherItemExists).toBe(true)
    })
  })

  describe("addItem", () => {
    const mockGroups: GroupWithItems[] = [
      {
        id: "group-1",
        name: "Media",
        order: 0,
        createdAt: null,
        items: [],
      },
    ]

    beforeEach(() => {
      useDashboardStore.getState().setGroups(mockGroups)
    })

    it("should add item to specified group", () => {
      const newItem: ItemRow = {
        id: "item-1",
        groupId: "group-1",
        label: "Sonarr",
        href: "http://sonarr.local",
        iconUrl: "sonarr",
        order: 0,
        serviceType: null,
        pollingMs: null,
        cleanMode: false,
        createdAt: null,
        serviceUrl: null,
        apiKeyEnc: null,
        configEnc: null,
      }

      useDashboardStore.getState().addItem("group-1", newItem)

      const state = useDashboardStore.getState()
      const group = state.groups.find((g) => g.id === "group-1")
      expect(group?.items).toHaveLength(1)
      expect(group?.items[0]).toEqual(newItem)
    })

    it("should not affect other groups", () => {
      const newItem: ItemRow = {
        id: "item-1",
        groupId: "group-1",
        label: "Sonarr",
        href: "http://sonarr.local",
        iconUrl: "sonarr",
        order: 0,
        serviceType: null,
        pollingMs: null,
        cleanMode: false,
        createdAt: null,
        serviceUrl: null,
        apiKeyEnc: null,
        configEnc: null,
      }

      useDashboardStore.getState().addItem("group-1", newItem)

      const state = useDashboardStore.getState()
      expect(state.groups).toHaveLength(1)
    })
  })

  describe("clearCache", () => {
    beforeEach(() => {
      useDashboardStore.getState().setGroups([
        {
          id: "group-1",
          name: "Media",
          order: 0,
          createdAt: null,
          items: [],
        },
      ])
      useDashboardStore.getState().setWidgetData("item-1", { _status: "ok" })
      useDashboardStore.getState().setPingStatus("item-1", {
        state: "healthy",
      })
    })

    it("should reset all cached data", () => {
      useDashboardStore.getState().clearCache()

      const state = useDashboardStore.getState()
      expect(state.groups).toEqual([])
      expect(state.widgetData).toEqual({})
      expect(state.pingStatus).toEqual({})
    })
  })
})
