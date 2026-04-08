import { create } from "zustand"
import type { GroupWithItems, ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

interface DashboardState {
  // Groups and items structure
  groups: GroupWithItems[]

  // Cached widget data per item (from SSR + client polling)
  widgetData: Record<string, ServiceData | null>

  // Cached ping status per item (from SSR + client polling)
  pingStatus: Record<string, ServiceStatus | null>

  // Actions
  setGroups: (groups: GroupWithItems[]) => void
  setWidgetData: (itemId: string, data: ServiceData | null) => void
  setPingStatus: (itemId: string, status: ServiceStatus | null) => void
  updateItem: (item: ItemRow) => void
  deleteItem: (itemId: string) => void
  addItem: (groupId: string, item: ItemRow) => void
  clearCache: () => void
}

/**
 * Simple in-memory Zustand store for dashboard state.
 * Initial data comes from SSR via props, then client-side
 * SWR polling updates the store with fresh data.
 * No localStorage persistence needed.
 */
export const useDashboardStore = create<DashboardState>()((set) => ({
  groups: [],
  widgetData: {},
  pingStatus: {},

  setGroups: (groups) => set({ groups }),

  setWidgetData: (itemId, data) =>
    set((state) => ({
      widgetData: { ...state.widgetData, [itemId]: data },
    })),

  setPingStatus: (itemId, status) =>
    set((state) => ({
      pingStatus: { ...state.pingStatus, [itemId]: status },
    })),

  updateItem: (updatedItem) =>
    set((state) => ({
      groups: state.groups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item
        ),
      })),
    })),

  deleteItem: (itemId) =>
    set((state) => ({
      groups: state.groups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== itemId),
      })),
      widgetData: Object.fromEntries(
        Object.entries(state.widgetData).filter(([id]) => id !== itemId)
      ),
      pingStatus: Object.fromEntries(
        Object.entries(state.pingStatus).filter(([id]) => id !== itemId)
      ),
    })),

  addItem: (groupId, item) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId
          ? { ...group, items: [...group.items, item] }
          : group
      ),
    })),

  clearCache: () =>
    set({
      groups: [],
      widgetData: {},
      pingStatus: {},
    }),
}))
