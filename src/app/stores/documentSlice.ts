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
    listHasChanged: boolean
    selectedDocumentHasChanged: boolean
    setListHasChanged: (flag: boolean) => void
    setSelectedDocumentHasChanged: (flag: boolean) => void
    hasFetched?: boolean
    setHasFetched: (flag: boolean) => void // To force a re-fetch
    error: string | null | unknown
    fetchDocuments: (obj: DocumentQuery) => Promise<void>
    countDocuments: (obj: CountDocumentQuery) => Promise<void>
    fetchDocumentById: (uid: string) => Promise<void>
    mergeDocuments: (documentUids: string[]) => Promise<void>
    removeConcepts: (conceptUids: string[]) => Promise<void>
  }
}

export const addDocumentSlice: StateCreator<
  DocumentSlice,
  [],
  [],
  DocumentSlice
> = (set, get): DocumentSlice => ({
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
    setHasFetched: (flag: boolean) =>
      set((state) => ({
        document: {
          ...state.document,
          hasFetched: flag,
        },
      })),
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
    listHasChanged: false,
    setListHasChanged: (flag: boolean) =>
      set((state) => ({
        document: {
          ...state.document,
          listHasChanged: flag,
        },
      })),
    selectedDocumentHasChanged: false,
    setSelectedDocumentHasChanged: (flag: boolean) =>
      set((state) => ({
        document: {
          ...state.document,
          selectedDocumentHasChanged: flag,
        },
      })),

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
    mergeDocuments: async (documentUids: string[]) => {
      try {
        const response = await fetch('/api/documents/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentUids }),
        })

        if (!response.ok) throw new Error('Failed to merge documents')
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
      }
    },
    removeConcepts: async (conceptUids: string[]) => {
      const documentUid = get().document.selectedDocument?.uid
      if (!documentUid) {
        console.error('Cannot remove concepts: no selected document')
        return
      }

      try {
        const response = await fetch(`/api/documents/${documentUid}/concepts`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conceptUids }),
        })

        if (!response.ok) throw new Error('Failed to delete concepts')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state

          const updatedSubjects = doc.subjects.filter(
            (c) => !conceptUids.includes(c.uid),
          )

          return {
            document: {
              ...state.document,
              selectedDocument: {
                ...doc,
                subjects: updatedSubjects,
              } as Document,
            },
          }
        })
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
      }
    },
  },
})
