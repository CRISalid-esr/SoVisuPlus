import { StateCreator } from 'zustand'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Harvesting } from '@/types/Harvesting'

export interface HarvestingSlice {
  harvesting: {
    harvestings: Record<
      string,
      Partial<Record<BibliographicPlatform, Harvesting>>
    >
    initializeHarvesting: (personUid: string) => void
    startHarvesting: (
      personUid: string,
      platform: BibliographicPlatform,
    ) => void

    stopHarvesting: (personUid: string, platform: BibliographicPlatform) => void
    incrementPlatformCount: (
      personUid: string,
      platform: BibliographicPlatform,
      status: 'created' | 'updated' | 'unchanged' | 'deleted',
    ) => void
    triggerHarvestings: (
      personUid: string,
      platforms: BibliographicPlatform[],
    ) => Promise<void>
  }
}

export const addHarvestingSlice: StateCreator<
  HarvestingSlice,
  [],
  [],
  HarvestingSlice
> = (set) => ({
  harvesting: {
    harvestings: {},

    initializeHarvesting: (personUid: string) => {
      const platforms = Object.values(BibliographicPlatform)
      const entries = Object.fromEntries(
        platforms.map((platform) => [
          platform,
          new Harvesting(personUid, platform, 'not_performed'),
        ]),
      )

      set((state) => ({
        harvesting: {
          ...state.harvesting,
          harvestings: {
            ...state.harvesting.harvestings,
            [personUid]: entries,
          },
        },
      }))
    },

    startHarvesting: (personUid: string, platform: BibliographicPlatform) => {
      set((state) => {
        const harvesting = state.harvesting.harvestings[personUid]?.[platform]
        if (!harvesting) return state

        const update: Partial<Harvesting> = {
          status: 'running',
          result: {
            created: 0,
            updated: 0,
            unchanged: 0,
            deleted: 0,
          },
        }

        return {
          harvesting: {
            ...state.harvesting,
            harvestings: {
              ...state.harvesting.harvestings,
              [personUid]: {
                ...state.harvesting.harvestings[personUid],
                [platform]: {
                  ...harvesting,
                  ...update,
                },
              },
            },
          },
        }
      })
    },
    stopHarvesting: (personUid: string, platform: BibliographicPlatform) => {
      set((state) => {
        const harvesting = state.harvesting.harvestings[personUid]?.[platform]
        if (!harvesting) return state

        const update: Partial<Harvesting> = {
          status: 'completed',
        }

        return {
          harvesting: {
            ...state.harvesting,
            harvestings: {
              ...state.harvesting.harvestings,
              [personUid]: {
                ...state.harvesting.harvestings[personUid],
                [platform]: {
                  ...harvesting,
                  ...update,
                },
              },
            },
          },
        }
      })
    },

    incrementPlatformCount: (
      personUid: string,
      platform: BibliographicPlatform,
      status: 'created' | 'updated' | 'unchanged' | 'deleted',
    ) => {
      set((state) => {
        const harvesting = state.harvesting.harvestings[personUid]?.[platform]
        if (!harvesting) return state

        const update: Partial<Harvesting> = {
          result: {
            ...harvesting.result,
            [status]: (harvesting.result[status] || 0) + 1,
          },
        }

        return {
          harvesting: {
            ...state.harvesting,
            harvestings: {
              ...state.harvesting.harvestings,
              [personUid]: {
                ...state.harvesting.harvestings[personUid],
                [platform]: {
                  ...harvesting,
                  ...update,
                },
              },
            },
          },
        }
      })
    },

    triggerHarvestings: async (
      personUid: string,
      platforms: BibliographicPlatform[],
    ) => {
      set((state) => {
        const existing = state.harvesting.harvestings[personUid] ?? {}

        const updated = { ...existing }
        for (const platform of platforms) {
          const current: Harvesting =
            existing[platform] ??
            new Harvesting(personUid, platform, 'not_performed')
          updated[platform] = {
            ...current,
            status: 'pending',
            result: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
          }
        }

        return {
          harvesting: {
            ...state.harvesting,
            harvestings: {
              ...state.harvesting.harvestings,
              [personUid]: updated,
            },
          },
        }
      })

      // Send request to backend
      try {
        const response = await fetch('/api/documents/harvestings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personUid, platforms }),
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error || 'Failed to trigger harvesting')
        }
      } catch (err) {
        console.error('Error triggering harvesting', err)

        set((state) => {
          const existing = state.harvesting.harvestings[personUid] ?? {}
          const updated = { ...existing }

          for (const platform of platforms) {
            const current = existing[platform]
            if (!current) continue
            updated[platform] = {
              ...current,
              status: 'failed',
            }
          }

          return {
            harvesting: {
              ...state.harvesting,
              harvestings: {
                ...state.harvesting.harvestings,
                [personUid]: updated,
              },
            },
          }
        })
      }
    },
  },
})
