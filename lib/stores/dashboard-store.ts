import { create } from "zustand"
import { persist, type StorageValue } from "zustand/middleware"
import type { GroupWithItems, ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

interface DashboardState {
  // Groups and items structure
  groups: GroupWithItems[]

  // Cached widget data per item
  widgetData: Record<string, ServiceData | null>

  // Cached ping status per item
  pingStatus: Record<string, ServiceStatus | null>

  // Last successful update timestamp
  lastUpdated: number | null

  // Hydration flag to prevent SSR mismatch
  _hasHydrated: boolean

  // Actions
  setGroups: (groups: GroupWithItems[]) => void
  setWidgetData: (itemId: string, data: ServiceData | null) => void
  setPingStatus: (itemId: string, status: ServiceStatus | null) => void
  updateItem: (item: ItemRow) => void
  deleteItem: (itemId: string) => void
  addItem: (groupId: string, item: ItemRow) => void
  setHasHydrated: () => void
  clearCache: () => void
}

// Custom storage to handle serialization of complex types
const storage = {
  getItem: (name: string): StorageValue<DashboardState> | null => {
    try {
      const str = localStorage.getItem(name)
      if (!str) return null
      return JSON.parse(str)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<DashboardState>): void => {
    localStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      groups: [],
      widgetData: {},
      pingStatus: {},
      lastUpdated: null,
      _hasHydrated: false,

      setGroups: (groups) =>
        set({ groups, lastUpdated: Date.now() }),

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

      setHasHydrated: () => set({ _hasHydrated: true }),

      clearCache: () =>
        set({
          groups: [],
          widgetData: {},
          pingStatus: {},
          lastUpdated: null,
        }),
    }),
    {
      name: "labitat-dashboard-cache",
      storage,
      // Only persist specific fields
      partialize: (state) =>
        ({
          groups: state.groups,
          widgetData: state.widgetData,
          pingStatus: state.pingStatus,
          lastUpdated: state.lastUpdated,
          _hasHydrated: state._hasHydrated,
          // Exclude methods from persisted state
        }) as DashboardState,
      // Rehydration callback
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated()
        }
      },
    }
  )
)
