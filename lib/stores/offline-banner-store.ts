import { create } from "zustand"

interface OfflineBannerState {
  /** User dismissed the offline banner while actually offline */
  dismissedWhileOffline: boolean
  setDismissedWhileOffline: (value: boolean) => void
}

export const useOfflineBannerStore = create<OfflineBannerState>()((set) => ({
  dismissedWhileOffline: false,
  setDismissedWhileOffline: (value) => set({ dismissedWhileOffline: value }),
}))
