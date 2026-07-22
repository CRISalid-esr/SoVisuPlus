import { OAStatus } from '@prisma/client'

/**
 * Shape of a document as served by /api/documents/dataviz and consumed by the
 * dashboard widgets (collaboration map, open access charts).
 *
 * Kept deliberately narrow: it mirrors the select of
 * DocumentDAO.fetchOAYearDocuments and nothing more.
 */
export type DashboardDocumentData = {
  uid: string
  oaStatus: OAStatus | null
  publicationDate: string | null
  upwOAStatus: OAStatus | null
  contributions: {
    person: {
      uid: string
      displayName: string | null
    }
    affiliations: {
      uid: string
      displayNames: string[]
      places: {
        latitude: number
        longitude: number
      }[]
    }[]
  }[]
}
