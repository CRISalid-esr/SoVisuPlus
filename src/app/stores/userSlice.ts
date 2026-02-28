import { StateCreator } from 'zustand'
import { User } from '@/types/User'
import { IAgent, IAgentClass } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'

export interface UserSlice {
  user: {
    connectedUser: User | null // The authenticated user
    currentPerspective: IAgent | null
    ownPerspective: boolean // Whether the current perspective is the connected user
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
    ownPerspective: false,
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
            ownPerspective:
              state.user.currentPerspective?.uid === user.person?.uid,
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
        user: {
          ...state.user,
          currentPerspective: perspective,
          ownPerspective:
            state.user.connectedUser?.person?.uid === perspective?.uid,
        },
      }))
    },
    setPerspectiveBySlug: async (slug: string) => {
      set((state) => ({ user: { ...state.user, loading: true } }))

      try {
        let endpoint = ''
        let EntityClass: IAgentClass

        if (slug.startsWith('person:')) {
          endpoint = `/api/person/slug/${slug}`
          EntityClass = Person
        } else if (slug.startsWith('research-structure:')) {
          endpoint = `/api/researchStructures/slug/${slug}`
          EntityClass = ResearchStructure
        } else {
          throw new Error(`Unknown slug type: ${slug}`)
        }

        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error(`Failed to fetch entity with slug: ${slug}`)
        }

        const entityJson = await response.json()
        const entity = EntityClass.fromJson(entityJson)

        set((state) => ({
          user: {
            ...state.user,
            currentPerspective: entity,
            ownPerspective:
              state.user.connectedUser?.person?.uid === entity.uid,
          },
        }))
      } catch (error) {
        console.error('Failed to fetch entity by slug', error)
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
