import { StateCreator } from 'zustand'

export interface DashboardSlice {
  dashboard: {
    // Selected publication year range — feeds the charts, the start/end
    // selectors and the WordStream (applied live, no separate "applied" copy)
    yearRange: [number, number]
    // The perspective the current range was initialised for
    yearRangePerspectiveUid: string | null
    setYearRange: (range: [number, number]) => void
    // Set the range only when the perspective differs from the stored one,
    // otherwise preserve the existing selection (across navigation)
    initYearRangeForPerspective: (uid: string, range: [number, number]) => void
  }
}

const DEFAULT_START_YEAR = 2010

export const addDashboardSlice: StateCreator<
  DashboardSlice,
  [],
  [],
  DashboardSlice
> = (set, get) => ({
  dashboard: {
    yearRange: [DEFAULT_START_YEAR, new Date().getUTCFullYear()],
    yearRangePerspectiveUid: null,
    setYearRange: (range) => {
      set((state) => ({
        dashboard: { ...state.dashboard, yearRange: range },
      }))
    },
    initYearRangeForPerspective: (uid, range) => {
      if (get().dashboard.yearRangePerspectiveUid === uid) return
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          yearRange: range,
          yearRangePerspectiveUid: uid,
        },
      }))
    },
  },
})
