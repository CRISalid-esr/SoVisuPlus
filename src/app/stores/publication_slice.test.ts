import { create } from 'zustand';
import { addPublicationSlice, PublicationSlice } from './publication_slice';

// Mock data for testing
const mockPublications = [
  { id: 1, title: 'Publication 1', content: 'Content 1' },
  { id: 2, title: 'Publication 2', content: 'Content 2' },
];

// Create a test store with the PublicationSlice
const createTestStore = () => {
  return create<PublicationSlice>((set, get,store) => ({
    ...addPublicationSlice(set, get, store),
  }));
};

describe('addPublicationSlice Tests', () => {
  let useStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    // Initialize the store before each test
    useStore = createTestStore();
    // Clear the mock fetch before each test
    global.fetch = jest.fn();
  });

  it('should initialize with default values', () => {
    const state = useStore.getState();
    expect(state.publications).toEqual([]);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should fetch publications successfully', async () => {
    // Mock the global fetch API to return mock publications data
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockPublications,
    });

    // Call the fetchPublications method
    await useStore.getState().fetchPublications();

    // Retrieve the updated state
    const updatedState = useStore.getState();

    // Ensure the state is updated correctly after the async fetch
    expect(updatedState.loading).toBe(false);
    expect(updatedState.error).toBeNull();
    expect(updatedState.publications).toEqual(mockPublications);
  });

  it('should handle fetch error', async () => {
    // Mock the global fetch API to throw an error
    const mockError = new Error('Fetch error');
    global.fetch = jest.fn().mockRejectedValue(mockError);

    // Call the fetchPublications method
    await useStore.getState().fetchPublications();

    // Retrieve the updated state
    const updatedState = useStore.getState();

    // Ensure error state is set correctly
    expect(updatedState.loading).toBe(false);
    expect(updatedState.publications).toEqual([]);
    expect(updatedState.error).toBeInstanceOf(Error);
    expect((updatedState.error as Error).message).toBe('Fetch error');
  });
});
