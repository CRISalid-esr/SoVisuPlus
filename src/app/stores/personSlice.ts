import { StateCreator } from 'zustand'
import { Person } from '@/types/Person'
import { i18n } from '@lingui/core'
import { toQueryString } from '@/utils/query'
import { BaseQuery } from '@/types/BaseQuery'

export interface PeopleByNameQuery extends BaseQuery {
  searchTerm: string
  page: number
}

export interface PersonSlice {
  person: {
    people: Person[]
    loading: boolean
    total: number
    error: string | null | unknown
    fetchPeopleByName: (obj: PeopleByNameQuery) => Promise<void>
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
    fetchPeopleByName: async (queryObject: PeopleByNameQuery) => {
      const queryString = toQueryString(queryObject)
      set((state) => ({ person: { ...state.person, loading: true } }))
      try {
        const response = await fetch(`/api/people?${queryString}`, {
          headers: {
            'accept-language': i18n.locale,
          },
        })
        const jsonData = await response.json()
        const hasMore = jsonData.hasMore
        const people = jsonData.people
        const total = jsonData.total
        set((state) => ({
          person: {
            ...state.person,
            people:
              Number(queryObject.page) === 1
                ? people
                : [...state.person.people, ...people],
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
