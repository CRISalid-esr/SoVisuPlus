import { DocumentSyncStatus } from './DocumentSyncStatus'

interface DocumentSync {
  name: string
  selected: boolean
  status: DocumentSyncStatus
  changes: {
    added: number
    updated: number
    deleted: number
  }
}

export type { DocumentSync }
