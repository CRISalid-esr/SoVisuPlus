import { StateCreator } from 'zustand'
import { ResearchStructure } from '@/types/ResearchStructure' // Assuming you have a Prisma model for Person
import { i18n } from '@lingui/core' // Import Lingui

// Define the queryObject interface correctly
export interface QueryObject {
  searchTerm: string
  page: number
}

// Define the state for the ResearchStructureSlice
export interface ResearchStructureSlice {
  researchStructure: {
    researchStructures: ResearchStructure[] // Assuming you have a Prisma model for Person
    loading: boolean
    total: number
    error: string | null | unknown
    fetchResearchStructures: (obj: QueryObject) => Promise<void>
    hasMore: boolean
  }
}

// Define the slice creator function with correct types
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
    fetchResearchStructures: async (queryObject: QueryObject) => {
      // Convert the query object to URL query string
      const queryString = new URLSearchParams(
        Object.entries(queryObject).reduce(
          (acc, [key, value]) => {
            acc[key] = (value as string).toString()
            return acc
          },
          {} as Record<string, string>,
        ),
      ).toString()

      // Set loading state to true
      set((state) => ({
        researchStructure: { ...state.researchStructure, loading: true },
      }))

      try {
        // Fetch data from the API
        const response = await fetch(`/api/researchStructures?${queryString}`, {
          headers: {
            'accept-language': i18n.locale,
          },
        })

        // Handle unsuccessful fetch
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }

        const jsonData = await response.json()
        const { hasMore, researchStructures, total } = jsonData
        // Update the state with the fetched data
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
        // Handle error and update state
        set((state) => ({
          researchStructure: {
            ...state.researchStructure,
            error: error instanceof Error ? error.message : 'Unknown error',
            researchStructures: [],
          },
        }))
      } finally {
        // Reset loading state
        set((state) => ({
          researchStructure: { ...state.researchStructure, loading: false },
        }))
      }
    },
  },
})
