import { StateCreator } from 'zustand'
import { Person } from '@/types/Person'

export interface queryObject {
  searchTerm: string
  page: number
}

export interface PersonSlice {
  person: {
    people: Person[]
    loading: boolean
    total: number
    error: string | null | unknown
    fetchPeople: (obj: Record<string, string>) => Promise<void>
    hasMore: boolean
  }
}

export const addPersonSlice: StateCreator<PersonSlice, [], [], PersonSlice> = (
  set,
) => ({
  person: {
    people: [],
    loading: true,
    hasMore: true,
    total: 0,
    error: null,
    fetchPeople: async (queryObject: Record<string, string>) => {
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
        const response = await fetch(`/api/people?${queryString}`) // Replace with your API endpoint
        const jsonData = await response.json()
        const hasMore = jsonData.hasMore
        const people = jsonData.people
        const total = jsonData.total
        set((state) => ({
          person: {
            ...state.person,
            people: people,
            hasMore,
            total,
            error: null, // Reset error state
          },
        }))
      } catch (error) {
        console.error('Failed to fetch people', error)
        set((state) => ({
          person: {
            ...state.person,
            error,
            people: [],
          },
        }))
      } finally {
        set((state) => ({ person: { ...state.person, loading: false } }))
      }
    },
  },
})
