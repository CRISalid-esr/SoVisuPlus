import { create } from 'zustand'
import { addUserSlice, UserSlice } from './userSlice'

// Mock data for testing
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'testuser@example.com',
  person: { id: 1, name: 'Agent Test', type: 'Agent' },
}

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
    expect(state.user.connectedUser).toBeNull()
    expect(state.user.currentPerspective).toBeNull()
    expect(state.user.loading).toBe(true)
    expect(state.user.error).toBeNull()
  })

  it('should fetch connected user successfully', async () => {
    // Mock the global fetch API to return mock user data
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockUser,
    })

    await useStore.getState().user.fetchConnectedUser()

    const updatedState = useStore.getState()

    expect(updatedState.user.loading).toBe(false)
    expect(updatedState.user.error).toBeNull()
    expect(updatedState.user.connectedUser).toEqual(mockUser)
    expect(updatedState.user.currentPerspective).toEqual(mockUser.person)
  })

  it('should handle fetch error', async () => {
    const mockError = new Error('Fetch error')
    global.fetch = jest.fn().mockRejectedValue(mockError)

    await useStore.getState().user.fetchConnectedUser()

    const updatedState = useStore.getState()

    expect(updatedState.user.loading).toBe(false)
    expect(updatedState.user.connectedUser).toBeNull()
    expect(updatedState.user.currentPerspective).toBeNull()
    expect(updatedState.user.error).toBeInstanceOf(Error)
    expect((updatedState.user.error as Error).message).toBe('Fetch error')
  })
})
