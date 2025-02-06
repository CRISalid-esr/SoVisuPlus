import { StateCreator } from 'zustand'
import { User } from '@/types/User'
import { IAgent } from '@/types/IAgent'

export interface UserSlice {
  user: {
    connectedUser: User | null // The authenticated user
    currentPerspective: IAgent | null
    loading: boolean
    error: string | null | unknown
    fetchConnectedUser: () => Promise<void>
    setPerspective: (perspective: IAgent) => void
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
      console.log('Setting perspective', perspective)
      set((state) => ({
        user: { ...state.user, currentPerspective: perspective },
      }))
    },
  },
})
