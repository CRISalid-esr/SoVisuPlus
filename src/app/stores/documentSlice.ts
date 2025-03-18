import { StateCreator } from 'zustand'
import { Document } from '@/types/Document'
import { toQueryString } from '@/utils/query'
import { BaseQuery } from '@/types/BaseQuery'
import { AgentType } from '@/types/IAgent'

export interface DocumentQuery extends BaseQuery {
  searchTerm: string
  page: number
  pageSize: number
  columnFilters: string
  searchLang: string
  sorting: string
  contributorUid: string | null
  contributorType: AgentType
}

export interface DocumentSlice {
  document: {
    documents: Array<Document>
    selectedDocument: Document | null
    totalItems?: number
    loading: boolean
    hasFetched?: boolean
    error: string | null | unknown
    fetchDocuments: (obj: DocumentQuery) => Promise<void>
    fetchDocumentById: (uid: string) => Promise<void>
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
    selectedDocument: null,
    totalItems: 0,
    hasFetched: false,
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
            documents,
            totalItems,
            error: null,
            loading: false, // ✅ Ensure loading is false here
          },
        }))
      } catch (error) {
        console.error('Failed to fetch documents', error)
        set((state) => ({
          document: { ...state.document, error, documents: [], loading: false },
        }))
      }
    },

    fetchDocumentById: async (uid: string) => {
      set((state) => ({ document: { ...state.document, loading: true } }))

      try {
        const response = await fetch(`/api/documents/${uid}`)
        if (!response.ok) {
          throw new Error('Failed to fetch document')
        }

        const document: Document = await Document.fromJsonDocument(
          await response.json(),
        )

        set((state) => ({
          document: {
            ...state.document,
            selectedDocument: document,
            error: null,
            loading: false,
            hasFetched: true,
          },
        }))
      } catch (error) {
        console.error('❌ Failed to fetch document by ID', error)
        set((state) => ({
          document: {
            ...state.document,
            error,
            selectedDocument: null,
            loading: false,
            hydrated: true,
          },
        }))
      }
    },
  },
})
