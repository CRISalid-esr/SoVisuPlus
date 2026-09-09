import { StateCreator } from 'zustand'
import { User } from '@/types/User'
import { IAgent, IAgentClass } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { OrganizationUnit } from '@/types/OrganizationUnit'

export interface UserSlice {
  user: {
    // The authenticated user
    connectedUser: User | null
    currentPerspective: IAgent | null
    // Whether the current perspective is the connected user
    ownPerspective: boolean
    loading: boolean
    error: string | null | unknown
    fetchConnectedUser: () => Promise<void>
    refreshPerspective: () => Promise<void>
    setPerspective: (perspective: IAgent) => void
    setPerspectiveBySlug: (uid: string) => void
    addPersonIdentifier: (
      personUid: string,
      type: string,
      value: string,
    ) => Promise<{ success: boolean; conflict?: boolean }>
    removePersonIdentifier: (
      personUid: string,
      type: string,
    ) => Promise<{ success: boolean }>
  }
}

export const addUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set,
  get,
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
    refreshPerspective: async () => {
      const { ownPerspective, currentPerspective, fetchConnectedUser } =
        get().user
      if (ownPerspective) {
        await fetchConnectedUser()
        return
      }
      if (!currentPerspective?.slug) return
      try {
        const isPersonPerspective = currentPerspective.type === 'person'
        const endpoint = isPersonPerspective
          ? `/api/person/slug/${currentPerspective.slug}`
          : `/api/organizations/slug/${currentPerspective.slug}`
        const response = await fetch(endpoint)
        if (!response.ok) return
        const json = await response.json()
        const entity = isPersonPerspective
          ? Person.fromJson(json)
          : OrganizationUnit.fromJson(json)
        set((state) => ({
          user: { ...state.user, currentPerspective: entity },
        }))
      } catch (error) {
        console.error('Failed to refresh perspective', error)
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
    // Add-only: a value change is a remove-then-add. A 409 means an identifier
    // of that type already exists and must be removed first (conflict flag).
    addPersonIdentifier: async (
      personUid: string,
      type: string,
      value: string,
    ) => {
      try {
        const response = await fetch(
          `/api/person/${personUid}/identifiers/${type}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          },
        )
        if (!response.ok) {
          return { success: false, conflict: response.status === 409 }
        }
        await get().user.refreshPerspective()
        return { success: true }
      } catch (error) {
        console.error('Failed to add identifier', error)
        return { success: false }
      }
    },
    removePersonIdentifier: async (personUid: string, type: string) => {
      try {
        const response = await fetch(
          `/api/person/${personUid}/identifiers/${type}`,
          { method: 'DELETE' },
        )
        if (!response.ok) return { success: false }
        await get().user.refreshPerspective()
        return { success: true }
      } catch (error) {
        console.error('Failed to remove identifier', error)
        return { success: false }
      }
    },
    setPerspectiveBySlug: async (slug: string) => {
      set((state) => ({ user: { ...state.user, loading: true } }))

      try {
        let endpoint = ''
        let EntityClass: IAgentClass

        if (slug.startsWith('person:')) {
          endpoint = `/api/person/slug/${slug}`
          EntityClass = Person
        } else if (slug.startsWith('org:')) {
          endpoint = `/api/organizations/slug/${slug}`
          EntityClass = OrganizationUnit
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
