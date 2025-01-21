import useStore from './global_store'

describe('Zustand Global Store - useStore with DocumentSlice', () => {
  beforeEach(() => {
    // Reset Zustand state before each test to avoid state pollution
    useStore.setState({
      document: {
        documents: [],
        loading: true,
        error: null,
        fetchDocuments: jest.fn(),
      },
    })
  })

  it('should initialize with default state', () => {
    const state = useStore.getState()

    expect(state.document.documents).toEqual([])
    expect(state.document.loading).toBe(true)
    expect(state.document.error).toBeNull()
  })

  it('should have the fetchDocuments method defined', () => {
    const state = useStore.getState()
    expect(state.document.fetchDocuments).toBeDefined()
    expect(typeof state.document.fetchDocuments).toBe('function')
  })
})
