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
        const jsonData = await response.json()
        set((state) => ({
          user: {
            ...state.user,
            connectedUser: jsonData,
            currentPerspective: jsonData.person,
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
  },
})
