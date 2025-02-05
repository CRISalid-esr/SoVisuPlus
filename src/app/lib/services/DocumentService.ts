import { DocumentDAO } from '@/lib/daos/DocumentDAO'

interface FetchDocumentsParams {
  searchTerm: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
  contributorUid: string | null
}

export class DocumentService {
  private documentDAO: DocumentDAO

  constructor() {
    this.documentDAO = new DocumentDAO() // Instantiate the DAO class
  }

  async fetchDocuments({
    searchTerm,
    page,
    pageSize,
    columnFilters,
    sorting,
    contributorUid,
  }: FetchDocumentsParams) {
    try {
      const { documents, totalItems } =
        await this.documentDAO.fetchDocumentsFromDB({
          searchTerm,
          page,
          pageSize,
          columnFilters,
          sorting,
          contributorUid,
        })
      return { documents, totalItems }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching documents from service')
    }
  }
}
