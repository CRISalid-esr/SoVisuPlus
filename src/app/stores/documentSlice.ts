import { StateCreator } from 'zustand'
import { Document } from '@prisma/client'
import { toQueryString } from '@/utils/query'
import { BaseQuery } from '@/types/BaseQuery'

export interface DocumentQuery extends BaseQuery {
  searchTerm: string
  page: number
  pageSize: number
  columnFilters: string
  searchLang: string
  sorting: string
}

export interface DocumentSlice {
  document: {
    documents: Document[]
    totalItems?: number
    loading: boolean
    error: string | null | unknown
    fetchDocuments: (obj: DocumentQuery) => Promise<void>
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
    totalItems: 0,
    fetchDocuments: async (queryObject: DocumentQuery) => {
      const queryString = toQueryString(queryObject)
      set((state) => ({ document: { ...state.document, loading: true } }))
      try {
        const response = await fetch(`/api/documents?${queryString}`)
        const jsonData = await response.json()
        const documents: Document[] = jsonData.documents
        const totalItems = jsonData.totalItems
        set((state) => ({
          document: {
            ...state.document,
            documents: documents,
            totalItems,
            error: null,
          },
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
