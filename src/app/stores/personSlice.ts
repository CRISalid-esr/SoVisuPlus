import { StateCreator } from 'zustand'
import { Person } from '@prisma/client' // Assuming you have a Prisma model for Person

export interface queryObject {
  searchTerm: string
  page: number
}

export interface PersonSlice {
  person: {
    persons: Person[]
    loading: boolean
    total: number
    error: string | null | unknown
    fetchPersons: (obj: Record<string, string>) => Promise<void>
    hasMore: boolean
  }
}

export const addPersonSlice: StateCreator<PersonSlice, [], [], PersonSlice> = (
  set,
) => ({
  person: {
    persons: [],
    loading: true,
    hasMore: true,
    total: 0,
    error: null,
    fetchPersons: async (queryObject: Record<string, string>) => {
      const queryString = new URLSearchParams(
        Object.entries(queryObject).reduce(
          (acc, [key, value]) => {
            acc[key] = value.toString()
            return acc
          },
          {} as Record<string, string>,
        ),
      ).toString()
      set((state) => ({ person: { ...state.person, loading: true } }))
      try {
        const response = await fetch(`/api/persons?${queryString}`) // Replace with your API endpoint
        const jsonData = await response.json()
        const hasMore = jsonData.hasMore
        const persons = jsonData.persons
        const total = jsonData.total
        set((state) => ({
          person: {
            ...state.person,
            persons,
            hasMore,
            total,
            error: null, // Reset error state
          },
        }))
      } catch (error) {
        console.error('Failed to fetch persons', error)
        set((state) => ({
          person: {
            ...state.person,
            error,
            persons: [],
          },
        }))
      } finally {
        set((state) => ({ person: { ...state.person, loading: false } }))
      }
    },
  },
})
