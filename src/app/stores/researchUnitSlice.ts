import { StateCreator } from 'zustand'
import { ResearchUnit, ResearchUnitJson } from '@/types/ResearchUnit' // Assuming you have a Prisma model for Person
import { i18n } from '@lingui/core'
import { BaseQuery } from '@/types/BaseQuery'
import { toQueryString } from '@/utils/query'

export interface ResearchUnitsByNameQuery extends BaseQuery {
  searchTerm: string
  includeExternal?: boolean
}

const defaultResearchUnitsByNameQuery: ResearchUnitsByNameQuery = {
  searchTerm: '',
  page: 1,
  includeExternal: false,
}

export interface ResearchUnitSlice {
  researchUnit: {
    researchUnits: ResearchUnit[]
    loading: boolean
    total: number
    error: string | null | unknown
    fetchResearchUnitsByName: (obj: ResearchUnitsByNameQuery) => Promise<void>
    hasMore: boolean
  }
}

export const addResearchUnitSlice: StateCreator<
  ResearchUnitSlice, // The type of the state
  [], // Middlewares (if any)
  [], // Additional options (if any)
  ResearchUnitSlice // The slice being created
> = (set) => ({
  researchUnit: {
    researchUnits: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: true,
    fetchResearchUnitsByName: async (queryObject: ResearchUnitsByNameQuery) => {
      const mergedQueryObject = {
        ...defaultResearchUnitsByNameQuery,
        ...queryObject,
      }
      const queryString = toQueryString(mergedQueryObject)

      set((state) => ({
        researchUnit: { ...state.researchUnit, loading: true },
      }))

      try {
        const response = await fetch(`/api/researchUnits?${queryString}`, {
          headers: {
            'accept-language': i18n.locale,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }

        const jsonData = (await response.json()) as {
          hasMore: boolean
          researchUnits: ResearchUnitJson[]
          total: number
        }
        const { hasMore, researchUnits, total } = jsonData

        set((state) => {
          const reinit = Number(queryObject.page) === 1
          let updatedResearchUnits = researchUnits.map(ResearchUnit.fromJson)

          if (!reinit) {
            // Push data to a transient map to avoid duplicates
            const combinedResearchUnitMap = new Map<string, ResearchUnit>([
              ...state.researchUnit.researchUnits.map(
                (rs): [string, ResearchUnit] => [rs.uid, rs],
              ),
              ...researchUnits.map((rs): [string, ResearchUnit] => [
                rs.uid,
                ResearchUnit.fromJson(rs),
              ]),
            ])
            updatedResearchUnits = Array.from(combinedResearchUnitMap.values())
          }

          return {
            researchUnit: {
              ...state.researchUnit,
              researchUnits: updatedResearchUnits,
              hasMore,
              total,
              error: null,
            },
          }
        })
      } catch (error) {
        set((state) => ({
          researchUnit: {
            ...state.researchUnit,
            error: error instanceof Error ? error.message : 'Unknown error',
            researchUnits: [],
          },
        }))
      } finally {
        set((state) => ({
          researchUnit: { ...state.researchUnit, loading: false },
        }))
      }
    },
  },
})
