/**
 * Tabs of the publications table. Declared here rather than in
 * usePublicationsTable so that the persistence helpers — which key part of
 * their state by tab — can reference them without an import cycle.
 */
export const ALL_DOCUMENTS_TAB = 'all_documents'
export const OUTSIDE_HAL_TAB = 'outside_hal'

export const isPublicationTab = (value: string | null): boolean =>
  value === ALL_DOCUMENTS_TAB || value === OUTSIDE_HAL_TAB
