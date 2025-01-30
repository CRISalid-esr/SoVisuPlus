import { DocumentDAO } from '@/lib/daos/DocumentDAO'

interface FetchDocumentsParams {
  searchTerm: string
  page: number
  pageSize: number
  lang: string
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
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
    lang,
    columnFilters,
    sorting,
  }: FetchDocumentsParams) {
    try {
      const { documents, totalItems } =
        await this.documentDAO.fetchDocumentsFromDB({
          searchTerm,
          page,
          pageSize,
          lang,
          columnFilters,
          sorting,
        })
      return { documents, totalItems }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching documents from service')
    }
  }
}
