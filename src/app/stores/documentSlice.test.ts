import { create } from 'zustand'
import {
  addDocumentSlice,
  CountDocumentQuery,
  DocumentQuery,
  DocumentSlice,
} from './documentSlice'
import { toQueryString } from '@/utils/query'
import { DocumentState as DbDocumentState, OAStatus } from '@prisma/client' // for 'waiting_for_update'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'

jest.mock('@/utils/query', () => ({
  toQueryString: jest.fn().mockReturnValue('mockQueryString'),
}))

global.fetch = jest.fn()

const createTestStore = () => {
  return create<DocumentSlice>((set, get, store) =>
    addDocumentSlice(set, get, store),
  )
}

const makeDoc = (
  uid: string,
  state: DbDocumentState = DbDocumentState.default,
): Document =>
  new Document(
    uid,
    DocumentType.JournalArticle,
    OAStatus.GREEN,
    '2024-01-01',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    OAStatus.DIAMOND,
    [new Literal(`Title ${uid}`, 'en')],
    [],
    [], // subjects
    [], // contributions
    [], // records
    state,
  )

describe('addDocumentSlice', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    // Create the store before each test
    useStore = createTestStore()
  })

  afterEach(() => {
    jest.clearAllMocks() // Clear mocks after each test
  })

  it('should fetch documents successfully', async () => {
    const mockDocuments = [
      {
        uid: 'mock-uid-1',
        documentType: 'JournalArticle',
        oaStatus: 'GREEN',
        publicationDate: '2022-01-01',
        publicationDateStart: '2022-01-01T00:00:00.000Z',
        publicationDateEnd: '2022-01-01T23:59:59.000Z',
        upwOAStatus: 'DIAMOND',
        titles: [{ value: 'Mock Title', language: 'en' }],
        abstracts: [{ value: 'Mock abstract', language: 'en' }],
        subjects: [],
        contributions: [
          {
            person: {
              uid: 'person-1',
              external: true,
              email: null,
              displayName: 'Jane Doe',
              firstName: 'Jane',
              lastName: 'Doe',
              identifiers: [],
              memberships: [],
              type: 'person',
              slug: null,
              normalizedName: 'jane doe',
            },
            roles: ['author'],
            affiliations: [],
          },
        ],
        records: [],
      },
    ]
    const mockTotalItems = 2

    // Mock the response of fetch
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        documents: mockDocuments,
        totalItems: mockTotalItems,
      }),
    })

    const queryObject: DocumentQuery = {
      searchTerm: 'test',
      page: 1,
      pageSize: 10,
      columnFilters: '',
      searchLang: 'en',
      sorting: '',
      contributorUid: null,
      contributorType: 'person',
      requestId: 1,
      halCollectionCodes: '["ABC","DEF"]',
      areHalCollectionCodesOmitted: false,
    }

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments(queryObject)

    // Check if the state was updated correctly
    const state = useStore.getState().document
    expect(state.loading).toBe(false)
    expect(state.documents).toMatchObject(mockDocuments)
    expect(state.totalItems).toBe(mockTotalItems)
    expect(state.error).toBeNull()
    const queryObjectWithoutRequestId = Object.fromEntries(
      Object.entries(queryObject).filter(([key]) => key !== 'requestId'),
    )
    expect(toQueryString).toHaveBeenCalledWith(queryObjectWithoutRequestId)
    expect(fetch).toHaveBeenCalledWith('/api/documents?mockQueryString') // Ensure fetch was called with the right URL
  })

  it('should handle error while fetching documents', async () => {
    const mockError = new Error('Failed to fetch')

    // Mock the response of fetch to simulate an error
    ;(fetch as jest.Mock).mockRejectedValueOnce(mockError)

    const queryObject: DocumentQuery = {
      searchTerm: 'test',
      page: 1,
      pageSize: 10,
      columnFilters: '',
      searchLang: 'en',
      sorting: '',
      contributorUid: null,
      contributorType: 'person',
      requestId: 1,
      halCollectionCodes: '["ABC","DEF"]',
      areHalCollectionCodesOmitted: false,
    }

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments(queryObject)

    // Check if the state was updated correctly in case of error
    const state = useStore.getState().document
    expect(state.loading).toBe(false)
    expect(state.documents).toEqual([])
    expect(state.error).toBe(mockError)
  })

  it('should count documents successfully', async () => {
    const mockAllItems = 1
    const mockIncompleteHalRepositoryItems = 1

    // Mock the response of fetch
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        allItems: mockAllItems,
        incompleteHalRepositoryItems: mockIncompleteHalRepositoryItems,
      }),
    })

    const queryObject: CountDocumentQuery = {
      searchTerm: 'test',
      page: 1,
      columnFilters: '',
      searchLang: 'en',
      contributorUid: null,
      contributorType: 'person',
      requestId: 1,
      halCollectionCodes: '["ABC","DEF"]',
    }

    // Call the countDocuments method
    await useStore.getState().document.countDocuments(queryObject)

    // Check if the state was updated correctly
    const state = useStore.getState().document
    expect(state.count.loading).toBe(false)
    expect(state.count.allItems).toBe(mockAllItems)
    expect(state.count.incompleteHalRepositoryItems).toBe(
      mockIncompleteHalRepositoryItems,
    )
    expect(state.count.error).toBeNull()
    const queryObjectWithoutRequestId = Object.fromEntries(
      Object.entries(queryObject).filter(([key]) => key !== 'requestId'),
    )
    expect(toQueryString).toHaveBeenCalledWith(queryObjectWithoutRequestId)
    expect(fetch).toHaveBeenCalledWith('/api/documents/count?mockQueryString') // Ensure fetch was called with the right URL
  })

  it('should handle error while counting documents', async () => {
    const mockError = new Error('Failed to fetch')

    // Mock the response of fetch to simulate an error
    ;(fetch as jest.Mock).mockRejectedValueOnce(mockError)

    const queryObject: CountDocumentQuery = {
      searchTerm: 'test',
      page: 1,
      columnFilters: '',
      searchLang: 'en',
      contributorUid: null,
      contributorType: 'person',
      requestId: 1,
      halCollectionCodes: '["ABC","DEF"]',
    }

    // Call the countDocuments method
    await useStore.getState().document.countDocuments(queryObject)

    // Check if the state was updated correctly in case of error
    const state = useStore.getState().document
    expect(state.count.loading).toBe(false)
    expect(state.count.error).toBe(mockError)
  })
})

describe('addDocumentSlice - mergeDocuments', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    useStore = createTestStore()
    jest.clearAllMocks()
  })

  it('does not call API when less than 2 document UIDs are provided', async () => {
    const spyErr = jest.spyOn(console, 'error').mockImplementation(() => {})
    await useStore.getState().document.mergeDocuments(['only-one'])

    expect(global.fetch).not.toHaveBeenCalled()
    expect(spyErr).toHaveBeenCalledWith(
      'At least two documents are required to merge',
    )
    spyErr.mockRestore()
  })

  it('calls /api/documents/merge and updates states in store (list + selectedDocument)', async () => {
    // Seed documents + selectedDocument
    useStore.setState((s) => ({
      document: {
        ...s.document,
        documents: [makeDoc('d1'), makeDoc('d2'), makeDoc('d3')],
        selectedDocument: makeDoc('d2'),
      },
    }))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        queued: true,
        updated: [
          { uid: 'd1', state: DbDocumentState.waiting_for_update },
          { uid: 'd2', state: DbDocumentState.waiting_for_update },
        ],
      }),
    })

    await useStore.getState().document.mergeDocuments(['d1', 'd2'])

    // API called with correct payload
    expect(global.fetch).toHaveBeenCalledWith('/api/documents/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentUids: ['d1', 'd2'] }),
    })

    const { documents, selectedDocument, error } = useStore.getState().document

    // Only d1, d2 updated -> d3 remains default
    expect(documents.find((d) => d.uid === 'd1')?.state).toBe(
      DbDocumentState.waiting_for_update,
    )
    expect(documents.find((d) => d.uid === 'd2')?.state).toBe(
      DbDocumentState.waiting_for_update,
    )
    expect(documents.find((d) => d.uid === 'd3')?.state).toBe('default')

    // selectedDocument (d2) also updated
    expect(selectedDocument?.uid).toBe('d2')
    expect(selectedDocument?.state).toBe(DbDocumentState.waiting_for_update)

    // no error
    expect(error).toBeNull()
  })

  it('sets error when /api/documents/merge returns !ok', async () => {
    useStore.setState((s) => ({
      document: {
        ...s.document,
        documents: [makeDoc('d1'), makeDoc('d2')],
      },
    }))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to merge documents' }),
    })

    await useStore.getState().document.mergeDocuments(['d1', 'd2'])

    const { error, documents } = useStore.getState().document
    expect(error).toBe('Failed to merge documents')
    // states unchanged on failure
    expect(documents.find((d) => d.uid === 'd1')?.state).toBe('default')
    expect(documents.find((d) => d.uid === 'd2')?.state).toBe('default')
  })

  it('sets error when fetch throws', async () => {
    useStore.setState((s) => ({
      document: {
        ...s.document,
        documents: [makeDoc('d1'), makeDoc('d2')],
      },
    }))

    const boom = new Error('network down')
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(boom)

    await useStore.getState().document.mergeDocuments(['d1', 'd2'])

    const { error } = useStore.getState().document
    expect(error).toBe('network down')
  })

  it('ignores updated items not present in store (no throw, no update)', async () => {
    useStore.setState((s) => ({
      document: {
        ...s.document,
        documents: [makeDoc('local-1')],
      },
    }))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        queued: true,
        updated: [
          { uid: 'server-only', state: DbDocumentState.waiting_for_update },
        ],
      }),
    })

    await useStore
      .getState()
      .document.mergeDocuments(['server-only', 'local-1'])

    const { documents, error } = useStore.getState().document
    // local doc remains default (because 'server-only' isn't in list)
    expect(documents.find((d) => d.uid === 'local-1')?.state).toBe('default')
    expect(error).toBeNull()
  })
})
