import { create } from 'zustand'
import { addDocumentSlice, DocumentQuery, DocumentSlice } from './documentSlice'
import { toQueryString } from '@/utils/query'

// Mock the toQueryString utility
jest.mock('@/utils/query', () => ({
  toQueryString: jest.fn().mockReturnValue('mockQueryString'),
}))

// Mock fetch
global.fetch = jest.fn()

const createTestStore = () => {
  return create<DocumentSlice>((set, get, store) =>
    addDocumentSlice(set, get, store),
  )
}

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
      { id: 1, title: 'Document 1' },
      { id: 2, title: 'Document 2' },
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
    }

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments(queryObject)

    // Check if the state was updated correctly
    const state = useStore.getState().document
    expect(state.loading).toBe(false)
    expect(state.documents).toEqual(mockDocuments)
    expect(state.totalItems).toBe(mockTotalItems)
    expect(state.error).toBeNull()
    expect(toQueryString).toHaveBeenCalledWith(queryObject) // Ensure toQueryString was called with the right arguments
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
    }

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments(queryObject)

    // Check if the state was updated correctly in case of error
    const state = useStore.getState().document
    expect(state.loading).toBe(false)
    expect(state.documents).toEqual([])
    expect(state.error).toBe(mockError)
  })
})
