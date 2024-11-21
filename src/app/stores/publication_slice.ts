import { StateCreator } from 'zustand';
import { Publication } from '@prisma/client';

export interface PublicationSlice {
  publications: Publication[];
  loading: boolean;
  error: string | null | unknown;
  fetchPublications: () => Promise<void>;
}

export const addPublicationSlice: StateCreator<
  PublicationSlice,
  [],
  [],
  PublicationSlice
> = (set) => ({
  publications: [],
  loading: true,
  error: null,
  fetchPublications: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/publications'); // Replace with your API endpoint
      const jsonData: Publication[] = await response.json();
      set({ publications: jsonData });
    } catch (error) {
      console.error('Failed to fetch publications', error);
      set({ error, publications: [] });
    } finally {
      set({ loading: false });
    }
  },
});
