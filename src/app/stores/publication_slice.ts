import { StateCreator } from 'zustand'
import { Publication } from '@prisma/client'

export interface PublicationSlice {
  publication: {
    publications: Publication[]
    loading: boolean
    error: string | null | unknown
    fetchPublications: () => Promise<void>
  }
}

export const addPublicationSlice: StateCreator<
  PublicationSlice,
  [],
  [],
  PublicationSlice
> = (set) => ({
  publication: {
    publications: [],
    loading: true,
    error: null,
    fetchPublications: async () => {
      set((state) => ({ publication: { ...state.publication, loading: true } }))
      try {
        const response = await fetch('/api/publications') // Replace with your API endpoint
        const jsonData: Publication[] = await response.json()
        set((state) => ({ publication: { ...state.publication, publications: jsonData } }))
      } catch (error) {
        console.error('Failed to fetch publications', error)
        set((state) => ({ publication: { ...state.publication, error, publications: [] } }))
      } finally {
        set((state) => ({ publication: { ...state.publication, loading: false } }))
      }
    },
  },
})
