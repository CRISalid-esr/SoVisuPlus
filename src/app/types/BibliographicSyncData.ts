import { BibliographicSyncDataStatus } from './BibliographicSyncDataStatus'

interface BibliographicSyncData {
  name: string
  selected: boolean
  status: BibliographicSyncDataStatus
  changes: {
    added: number
    updated: number
    deleted: number
  }
}

export type { BibliographicSyncData }
