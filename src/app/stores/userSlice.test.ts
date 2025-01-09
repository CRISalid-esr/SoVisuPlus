import { create } from 'zustand'
import { addUserSlice, UserSlice } from './userSlice'

// Mock data for testing
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'testuser@example.com',
  person: { id: 1, name: 'Agent Test', type: 'Agent' },
}

// Create a test store with the UserSlice
const createTestStore = () => {
  return create<UserSlice>((set, get, store) => ({
    ...addUserSlice(set, get, store),
  }))
}

describe('addUserSlice Tests', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    // Initialize the store before each test
    useStore = createTestStore()
    // Clear the mock fetch before each test
    global.fetch = jest.fn()
  })

  it('should initialize with default values', () => {
    const state = useStore.getState()
    expect(state.connectedUser).toBeNull()
    expect(state.currentPerspective).toBeNull()
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('should fetch connected user successfully', async () => {
    // Mock the global fetch API to return mock user data
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockUser,
    })

    await useStore.getState().fetchConnectedUser()

    const updatedState = useStore.getState()

    expect(updatedState.loading).toBe(false)
    expect(updatedState.error).toBeNull()
    expect(updatedState.connectedUser).toEqual(mockUser)
    expect(updatedState.currentPerspective).toEqual(mockUser.person)
  })

  it('should handle fetch error', async () => {
    const mockError = new Error('Fetch error')
    global.fetch = jest.fn().mockRejectedValue(mockError)

    await useStore.getState().fetchConnectedUser()

    const updatedState = useStore.getState()

    expect(updatedState.loading).toBe(false)
    expect(updatedState.connectedUser).toBeNull()
    expect(updatedState.currentPerspective).toBeNull()
    expect(updatedState.error).toBeInstanceOf(Error)
    expect((updatedState.error as Error).message).toBe('Fetch error')
  })
})
