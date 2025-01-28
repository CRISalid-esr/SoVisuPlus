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

interface FindPeopleResponse {
  hasMore: boolean
  people: Person[]
  total: number
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

        const { hasMore, people, total } =
          (await response.json()) as FindPeopleResponse

        set((state) => {
          const reinit = Number(queryObject.page) === 1

          let updatedPeople = people

          if (!reinit) {
            // Push data to a transient map to avoid duplicates
            const combinedPeopleMap = new Map<string, Person>([
              ...state.person.people.map((person): [string, Person] => [
                person.uid,
                person,
              ]),
              ...people.map((person): [string, Person] => [person.uid, person]),
            ])
            updatedPeople = Array.from(combinedPeopleMap.values())
          }

          return {
            person: {
              ...state.person,
              people: updatedPeople,
              hasMore,
              total,
              error: null,
            },
          }
        })
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
