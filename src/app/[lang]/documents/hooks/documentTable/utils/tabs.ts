/**
 * Tabs of the publications table. Declared here rather than in
 * usePublicationsTable so that the persistence helpers — which key part of
 * their state by tab — can reference them without an import cycle.
 */
export const ALL_DOCUMENTS_TAB = 'all_documents'
export const OUTSIDE_HAL_TAB = 'outside_hal'

/** Every tab, in display order. Each one holds its own column filters. */
export const PUBLICATION_TABS = [ALL_DOCUMENTS_TAB, OUTSIDE_HAL_TAB]

export const isPublicationTab = (value: string | null): boolean =>
  value !== null && PUBLICATION_TABS.includes(value)
