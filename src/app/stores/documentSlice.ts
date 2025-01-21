import { StateCreator } from 'zustand'
import { Document } from '@prisma/client'

export interface DocumentSlice {
  document: {
    documents: Document[]
    loading: boolean
    error: string | null | unknown
    fetchDocuments: () => Promise<void>
  }
}

export const addDocumentSlice: StateCreator<
  DocumentSlice,
  [],
  [],
  DocumentSlice
> = (set) => ({
  document: {
    documents: [],
    loading: true,
    error: null,
    fetchDocuments: async () => {
      set((state) => ({ document: { ...state.document, loading: true } }))
      try {
        const response = await fetch('/api/documents') // Replace with your API endpoint
        const jsonData: Document[] = await response.json()
        set((state) => ({
          document: { ...state.document, documents: jsonData },
        }))
      } catch (error) {
        console.error('Failed to fetch documents', error)
        set((state) => ({
          document: { ...state.document, error, documents: [] },
        }))
      } finally {
        set((state) => ({ document: { ...state.document, loading: false } }))
      }
    },
  },
})
