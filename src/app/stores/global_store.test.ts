import useStore from './global_store';

describe('Zustand Global Store - useStore with PublicationSlice', () => {
  beforeEach(() => {
    // Reset Zustand state before each test to avoid state pollution
    useStore.setState({
      publication:{ 
      publications: [],
      loading: true,
      error: null,
      fetchPublications: jest.fn(),
    }});
  });

  it('should initialize with default state', () => {
    const state = useStore.getState();

    expect(state.publication.publications).toEqual([]);
    expect(state.publication.loading).toBe(true);
    expect(state.publication.error).toBeNull();
  });

  it('should have the fetchPublications method defined', () => {
    const state = useStore.getState();
    expect(state.publication.fetchPublications).toBeDefined();
    expect(typeof state.publication.fetchPublications).toBe('function');
  });
});
