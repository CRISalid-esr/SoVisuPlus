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
  requestId: number
  omittedHalCollectionCodes: string
}

export interface CountDocumentQuery extends BaseQuery {
  searchTerm: string
  page: number
  columnFilters: string
  searchLang: string
  contributorUid: string | null
  contributorType: AgentType
  requestId: number
  omittedHalCollectionCodes: string
}

export interface DocumentSlice {
  document: {
    latestDocumentRequestId?: number
    documents: Array<Document>
    selectedDocument: Document | null
    totalItems?: number
    count: {
      latestCountDocumentsRequestId?: number
      allItems?: number
      incompleteHalRepositoryItems?: number
      loading: boolean
      error: string | null | unknown
    }
    loading: boolean
    hasFetched?: boolean
    error: string | null | unknown
    fetchDocuments: (obj: DocumentQuery) => Promise<void>
    countDocuments: (obj: CountDocumentQuery) => Promise<void>
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
    count: {
      loading: true,
      error: null,
      allItems: 0,
      incompleteHalRepositoryItems: 0,
    },
    hasFetched: false,
    fetchDocuments: async (queryObject: DocumentQuery) => {
      const { requestId, ...rest } = queryObject
      const queryString = toQueryString(rest)

      // Mark the request as the latest before the async call
      set((state) => ({
        document: {
          ...state.document,
          loading: true,
          latestDocumentRequestId: requestId,
        },
      }))

      try {
        const response = await fetch(`/api/documents?${queryString}`)
        const jsonData = await response.json()
        const documents = jsonData.documents.map(Document.fromJson)
        const totalItems = jsonData.totalItems

        set((state) => {
          // Ignore if a newer request was made since this one started
          if (state.document.latestDocumentRequestId !== requestId) return state

          return {
            document: {
              ...state.document,
              documents,
              totalItems,
              error: null,
              loading: false,
            },
          }
        })
      } catch (error) {
        console.error('Failed to fetch documents', error)
        set((state) => {
          if (state.document.latestDocumentRequestId !== requestId) return state

          return {
            document: {
              ...state.document,
              error,
              documents: [],
              loading: false,
            },
          }
        })
      }
    },

    fetchDocumentById: async (uid: string) => {
      set((state) => ({ document: { ...state.document, loading: true } }))

      try {
        const response = await fetch(`/api/documents/${uid}`)
        if (!response.ok) {
          throw new Error('Failed to fetch document')
        }

        const documentJson = await response.json()
        const document: Document = await Document.fromJson(documentJson)

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

    countDocuments: async (queryObject: CountDocumentQuery) => {
      const { requestId, ...rest } = queryObject
      const queryString = toQueryString(rest)

      // Mark the request as the latest before the async call
      set((state) => ({
        document: {
          ...state.document,
          count: {
            ...state.document.count,
            loading: true,
            latestCountDocumentsRequestId: requestId,
          },
        },
      }))

      try {
        const response = await fetch(`/api/documents/count?${queryString}`)
        const jsonData = await response.json()
        const { allItems, incompleteHalRepositoryItems } = jsonData

        set((state) => {
          // Ignore if a newer request was made since this one started
          if (state.document.count.latestCountDocumentsRequestId !== requestId)
            return state

          return {
            document: {
              ...state.document,
              count: {
                ...state.document.count,
                allItems,
                incompleteHalRepositoryItems,
                error: null,
                loading: false,
              },
            },
          }
        })
      } catch (error) {
        console.error('Failed to count documents', error)
        set((state) => {
          if (state.document.count.latestCountDocumentsRequestId !== requestId)
            return state

          return {
            document: {
              ...state.document,
              count: {
                ...state.document.count,
                error,
                loading: false,
              },
            },
          }
        })
      }
    },
  },
})
