import { StateCreator } from 'zustand'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { toQueryString } from '@/utils/query'
import { BaseQuery } from '@/types/BaseQuery'
import { AgentType } from '@/types/IAgent'
import { Concept } from '@/types/Concept'
import { Literal } from '@/types/Literal'
import { ContributionActionParameters } from '@/types/ContributionAction'

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
  halCollectionCodes: string
  areHalCollectionCodesOmitted: boolean
}

// Each badge counts what its own tab would list. The tabs share the search term
// but keep their own column filters, hence one filter set per tab. Counting is
// not paginated, so unlike the other queries this one does not extend BaseQuery.
export interface CountDocumentQuery {
  searchTerm: string
  searchLang: string
  allDocumentsFilters: string
  outsideHalFilters: string
  contributorUid: string | null
  contributorType: AgentType
  requestId: number
  halCollectionCodes: string
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
      outsideHalItems?: number
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
    contributionsTabDirty: boolean
    setContributionsTabDirty: (flag: boolean) => void
    error: string | null | unknown
    fetchDocuments: (obj: DocumentQuery) => Promise<void>
    countDocuments: (obj: CountDocumentQuery) => Promise<void>
    fetchDocumentById: (uid: string) => Promise<void>
    mergeDocuments: (documentUids: string[]) => Promise<void>
    addConcepts: (concepts: Concept[]) => Promise<void>
    removeConcepts: (conceptUids: string[]) => Promise<void>
    modifyTitles: (titles: Literal[]) => Promise<{ success: boolean }>
    modifyAbstracts: (abstracts: Literal[]) => Promise<{ success: boolean }>
    modifyPublicationDate: (
      publicationDate: string | null,
    ) => Promise<{ success: boolean }>
    updateDocumentType: (type: DocumentType) => Promise<void>
    saveContributions: (
      contributions: ContributionActionParameters[],
    ) => Promise<{ success: boolean }>
    unfreezeSelectedDocument: (documentUid: string) => void
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
      outsideHalItems: 0,
    },
    hasFetched: false,
    setHasFetched: (flag: boolean) =>
      set((state) => ({
        document: {
          ...state.document,
          hasFetched: flag,
        },
      })),
    contributionsTabDirty: false,
    setContributionsTabDirty: (flag: boolean) =>
      set((state) => ({
        document: {
          ...state.document,
          contributionsTabDirty: flag,
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
        const { allItems, outsideHalItems } = jsonData

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
                outsideHalItems,
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
      if (documentUids.length < 2) {
        console.error('At least two documents are required to merge')
        return
      }
      try {
        const res = await fetch('/api/documents/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentUids }),
        })
        if (!res.ok) throw new Error('Failed to merge documents')

        const data: { updated: Array<{ uid: string; state: string }> } =
          await res.json()
        set((state) => {
          const updatedDocuments = state.document.documents.map((doc) => {
            const updatedDoc = data.updated.find((d) => d.uid === doc.uid)
            if (updatedDoc) {
              doc.state = updatedDoc.state as DocumentState
            }
            return doc
          })
          // Also update selectedDocument if it's among the merged ones
          const selectedDocument = state.document.selectedDocument
          const selectUpdated = data.updated.find(
            (d) => d.uid === selectedDocument?.uid,
          )
          if (selectedDocument && selectUpdated) {
            selectedDocument.state = selectUpdated.state as DocumentState
          }

          return {
            document: {
              ...state.document,
              documents: updatedDocuments,
              selectedDocument: selectedDocument,
            },
          }
        })

        // optional: setListHasChanged(true) or keep UI as-is until WS refresh
      } catch (error) {
        set((s) => ({
          document: {
            ...s.document,
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
          const updatedDocument = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { subjects: updatedSubjects },
          )

          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
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
    addConcepts: async (concepts: Concept[]) => {
      const documentUid = get().document.selectedDocument?.uid
      if (!documentUid) {
        console.error('Cannot add concepts: no selected document')
        return
      }

      try {
        const response = await fetch(`/api/documents/${documentUid}/concepts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concepts: concepts.map((concept) => Concept.toJson(concept)),
          }),
        })

        if (!response.ok) throw new Error('Failed to add concepts')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state

          const updatedSubjects = doc.subjects.concat(concepts)
          const updatedDocument = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { subjects: updatedSubjects },
          )

          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
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
    modifyTitles: async (titles: Literal[]) => {
      try {
        const documentUid = get().document.selectedDocument?.uid

        if (!documentUid) {
          throw new Error('Cannot modify titles: no selected document')
        }

        const response = await fetch(`/api/documents/${documentUid}/titles`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titles: titles,
          }),
        })

        if (!response.ok) throw new Error('Failed to modify titles')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state

          const updatedDocument = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { titles: titles },
          )

          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
            },
          }
        })
        return { success: true }
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
        return { success: false }
      }
    },
    modifyAbstracts: async (abstracts: Literal[]) => {
      try {
        const documentUid = get().document.selectedDocument?.uid

        if (!documentUid) {
          throw new Error('Cannot modify abstracts: no selected document')
        }

        const response = await fetch(
          `/api/documents/${documentUid}/abstracts`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              abstracts: abstracts,
            }),
          },
        )

        if (!response.ok) throw new Error('Failed to modify abstracts')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state

          const updatedDocument = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { abstracts: abstracts },
          )

          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
            },
          }
        })
        return { success: true }
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
        return { success: false }
      }
    },
    saveContributions: async (
      contributions: ContributionActionParameters[],
    ) => {
      try {
        const documentUid = get().document.selectedDocument?.uid

        if (!documentUid) {
          throw new Error('Cannot save contributions: no selected document')
        }

        const response = await fetch(
          `/api/documents/${documentUid}/contributions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contributions }),
          },
        )

        if (!response.ok) throw new Error('Failed to save contributions')

        // Pessimistic model: do NOT write contribution data. Only flag the
        // document as waiting for the graph round-trip (mirrors the server-side
        // markDocumentsWaitingForUpdate). The Authors tab freezes on this state
        // and unfreezes when the refreshed document comes back as `default`.
        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc || doc.uid !== documentUid) return state
          const updatedDocument = new Document(
            doc.uid,
            doc.documentType,
            doc.oaStatus,
            doc.publicationDate,
            doc.publicationDateStart,
            doc.publicationDateEnd,
            doc.upwOAStatus,
            doc.titles,
            doc.abstracts,
            doc.subjects,
            doc.contributions,
            doc.records,
            DocumentState.waiting_for_update,
            doc.journal,
            doc.volume,
            doc.issue,
            doc.pages,
          )
          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
            },
          }
        })
        return { success: true }
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
        return { success: false }
      }
    },
    // Failure path of the pessimistic model: the graph reported the action
    // failed, so no refreshed document will come back to reset the state —
    // unfreeze in place so the user can retry immediately.
    unfreezeSelectedDocument: (documentUid: string) => {
      set((state) => {
        const doc = state.document.selectedDocument
        if (
          !doc ||
          doc.uid !== documentUid ||
          doc.state !== DocumentState.waiting_for_update
        )
          return state
        const updatedDocument = new Document(
          doc.uid,
          doc.documentType,
          doc.oaStatus,
          doc.publicationDate,
          doc.publicationDateStart,
          doc.publicationDateEnd,
          doc.upwOAStatus,
          doc.titles,
          doc.abstracts,
          doc.subjects,
          doc.contributions,
          doc.records,
          DocumentState.default,
          doc.journal,
          doc.volume,
          doc.issue,
          doc.pages,
        )
        return {
          document: {
            ...state.document,
            selectedDocument: updatedDocument,
          },
        }
      })
    },
    modifyPublicationDate: async (publicationDate: string | null) => {
      try {
        const documentUid = get().document.selectedDocument?.uid

        if (!documentUid) {
          throw new Error(
            'Cannot modify publication date: no selected document',
          )
        }

        const response = await fetch(
          `/api/documents/${documentUid}/publicationDate`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicationDate }),
          },
        )

        if (!response.ok) throw new Error('Failed to modify publication date')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state

          const updatedDocument = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { publicationDate },
          )

          return {
            document: {
              ...state.document,
              selectedDocument: updatedDocument,
            },
          }
        })
        return { success: true }
      } catch (error) {
        set((state) => ({
          document: {
            ...state.document,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
        return { success: false }
      }
    },
    updateDocumentType: async (type: DocumentType) => {
      const documentUid = get().document.selectedDocument?.uid
      if (!documentUid) {
        console.error('Cannot update document type: no selected document')
        return
      }

      try {
        const response = await fetch(`/api/documents/${documentUid}/type`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentType: type }),
        })

        if (!response.ok) throw new Error('Failed to update document type')

        set((state) => {
          const doc = state.document.selectedDocument
          if (!doc) return state
          const updatedDoc = Object.assign(
            Object.create(Object.getPrototypeOf(doc)),
            doc,
            { documentType: type },
          )
          return {
            document: {
              ...state.document,
              selectedDocument: updatedDoc,
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
