import { create } from 'zustand'
import { addDocumentSlice, DocumentSlice } from './documentSlice'

// Mock data for testing
const mockDocuments = [
  { id: 1, title: 'Document 1', content: 'Content 1' },
  { id: 2, title: 'Document 2', content: 'Content 2' },
]

// Create a test store with the DocumentSlice
const createTestStore = () => {
  return create<DocumentSlice>((set, get, store) => ({
    ...addDocumentSlice(set, get, store),
  }))
}

describe('addDocumentSlice Tests', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    // Initialize the store before each test
    useStore = createTestStore()
    // Clear the mock fetch before each test
    global.fetch = jest.fn()
  })

  it('should initialize with default values', () => {
    const state = useStore.getState()
    expect(state.document.documents).toEqual([])
    expect(state.document.loading).toBe(true)
    expect(state.document.error).toBeNull()
  })

  it('should fetch documents successfully', async () => {
    // Mock the global fetch API to return mock documents data
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockDocuments,
    })

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments()

    // Retrieve the updated state
    const updatedState = useStore.getState()

    // Ensure the state is updated correctly after the async fetch
    expect(updatedState.document.loading).toBe(false)
    expect(updatedState.document.error).toBeNull()
    expect(updatedState.document.documents).toEqual(mockDocuments)
  })

  it('should handle fetch error', async () => {
    // Mock the global fetch API to throw an error
    const mockError = new Error('Fetch error')
    global.fetch = jest.fn().mockRejectedValue(mockError)

    // Call the fetchDocuments method
    await useStore.getState().document.fetchDocuments()

    // Retrieve the updated state
    const updatedState = useStore.getState()

    // Ensure error state is set correctly
    expect(updatedState.document.loading).toBe(false)
    expect(updatedState.document.documents).toEqual([])
    expect(updatedState.document.error).toBeInstanceOf(Error)
    expect((updatedState.document.error as Error).message).toBe('Fetch error')
  })
})
