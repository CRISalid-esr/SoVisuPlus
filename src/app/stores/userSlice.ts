import { StateCreator } from 'zustand'
import { Agent } from '@/types/Agent'
import { User } from '@/types/User'
export interface UserSlice {
  connectedUser: User | null // The authenticated user
  currentPerspective: Agent | null
  loading: boolean
  error: string | null | unknown
  fetchConnectedUser: () => Promise<void>
}

export const addUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set,
) => ({
  users: [],
  connectedUser: null,
  loading: true,
  error: null,
  currentPerspective: null,
  fetchConnectedUser: async () => {
    set({ loading: true })
    try {
      const response = await fetch('/api/users/me') // Replace with your API endpoint for the connected user
      const jsonData = await response.json()
      set({ connectedUser: jsonData, currentPerspective: jsonData.person })
    } catch (error) {
      console.error('Failed to fetch connected user', error)
      set({ error, connectedUser: null })
    } finally {
      set({ loading: false })
    }
  },
})
