import useStore from './global_store';

describe('Zustand Global Store - useStore with PublicationSlice', () => {
  beforeEach(() => {
    // Reset Zustand state before each test to avoid state pollution
    useStore.setState({
      publications: [],
      loading: true,
      error: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useStore.getState();

    expect(state.publications).toEqual([]);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should have the fetchPublications method defined', () => {
    const state = useStore.getState();
    expect(state.fetchPublications).toBeDefined();
    expect(typeof state.fetchPublications).toBe('function');
  });
});
