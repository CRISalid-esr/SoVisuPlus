import { StateCreator } from 'zustand'
import { ResearchStructure } from '@/types/ResearchStructure' // Assuming you have a Prisma model for Person
import { i18n } from '@lingui/core'
import { BaseQuery } from '@/types/BaseQuery'
import { toQueryString } from '@/utils/query' // Import Lingui

// Define the queryObject interface correctly
export interface ResearchStructuresByNameQuery extends BaseQuery {
  searchTerm: string
  searchLang: string
}

export interface ResearchStructureSlice {
  researchStructure: {
    researchStructures: ResearchStructure[] // Assuming you have a Prisma model for Person
    loading: boolean
    total: number
    error: string | null | unknown
    fetchResearchStructuresByName: (
      obj: ResearchStructuresByNameQuery,
    ) => Promise<void>
    hasMore: boolean
  }
}

export const addResearchStructureSlice: StateCreator<
  ResearchStructureSlice, // The type of the state
  [], // Middlewares (if any)
  [], // Additional options (if any)
  ResearchStructureSlice // The slice being created
> = (set) => ({
  researchStructure: {
    researchStructures: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: true,
    fetchResearchStructuresByName: async (
      queryObject: ResearchStructuresByNameQuery,
    ) => {
      const queryString = toQueryString(queryObject)

      set((state) => ({
        researchStructure: { ...state.researchStructure, loading: true },
      }))

      try {
        const response = await fetch(`/api/researchStructures?${queryString}`, {
          headers: {
            'accept-language': i18n.locale,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }

        const jsonData = await response.json()
        const { hasMore, researchStructures, total } = jsonData

        set((state) => ({
          researchStructure: {
            ...state.researchStructure,
            researchStructures:
              Number(queryObject.page) === 1
                ? researchStructures
                : [
                    ...state.researchStructure.researchStructures,
                    ...researchStructures,
                  ],
            hasMore,
            total,
            error: null, // Reset error state
          },
        }))
      } catch (error) {
        set((state) => ({
          researchStructure: {
            ...state.researchStructure,
            error: error instanceof Error ? error.message : 'Unknown error',
            researchStructures: [],
          },
        }))
      } finally {
        set((state) => ({
          researchStructure: { ...state.researchStructure, loading: false },
        }))
      }
    },
  },
})
