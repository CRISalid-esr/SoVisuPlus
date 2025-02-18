import { StateCreator } from 'zustand'
import { User } from '@/types/User'
import { IAgent } from '@/types/IAgent'
import { Person, PersonJson } from '@/types/Person'

export interface UserSlice {
  user: {
    connectedUser: User | null // The authenticated user
    currentPerspective: IAgent | null
    loading: boolean
    error: string | null | unknown
    fetchConnectedUser: () => Promise<void>
    setPerspective: (perspective: IAgent) => void
    setPerspectiveBySlug: (uid: string) => void
  }
}

export const addUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set,
) => ({
  user: {
    connectedUser: null,
    loading: true,
    error: null,
    currentPerspective: null,
    fetchConnectedUser: async () => {
      set((state) => ({ user: { ...state.user, loading: true } }))
      try {
        const response = await fetch('/api/users/me')
        const jsonUser = await response.json()

        const user = User.fromJsonUser(jsonUser)

        set((state) => ({
          user: {
            ...state.user,
            connectedUser: user,
          },
        }))
      } catch (error) {
        console.error('Failed to fetch connected user', error)
        set((state) => ({
          user: { ...state.user, error, connectedUser: null },
        }))
      } finally {
        set((state) => ({ user: { ...state.user, loading: false } }))
      }
    },
    setPerspective: (perspective: IAgent) => {
      set((state) => ({
        user: { ...state.user, currentPerspective: perspective },
      }))
    },
    setPerspectiveBySlug: async (slug: string) => {
      set((state) => ({ user: { ...state.user, loading: true } }))
      try {
        const response = await fetch(`/api/person/slug/${slug}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch person with slug: ${slug}`)
        }

        const personJson = (await response.json()) as PersonJson
        const person = Person.fromJsonPerson(personJson)

        set((state) => ({
          user: { ...state.user, currentPerspective: person },
        }))
      } catch (error) {
        console.error('Failed to fetch person by uid', error)
        set((state) => ({
          user: {
            ...state.user,
            error,
          },
        }))
      } finally {
        set((state) => ({ user: { ...state.user, loading: false } }))
      }
    },
  },
})
