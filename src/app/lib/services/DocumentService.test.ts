import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'

jest.mock('@/lib/daos/DocumentDAO')

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockFetchDocumentsFromDB: jest.Mock

  beforeEach(() => {
    mockFetchDocumentsFromDB = jest.fn()
    ;(DocumentDAO as jest.Mock).mockImplementation(() => ({
      fetchDocumentsFromDB: mockFetchDocumentsFromDB,
    }))

    documentService = new DocumentService()
  })

  it('should return documents and totalItems when fetchDocuments succeeds', async () => {
    const mockResponse = {
      documents: [{ id: 1, name: 'Test Document' }],
      totalItems: 1,
    }

    mockFetchDocumentsFromDB.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: 'test',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'category', value: 'reports' }],
      sorting: [{ id: 'name', desc: false }],
    }

    await expect(documentService.fetchDocuments(params)).resolves.toEqual(
      mockResponse,
    )

    expect(mockFetchDocumentsFromDB).toHaveBeenCalledWith(params)
  })

  it('should throw an error when fetchDocumentsFromDB fails', async () => {
    mockFetchDocumentsFromDB.mockRejectedValue(new Error('DB error'))

    const params = {
      searchTerm: 'test',
      page: 1,
      pageSize: 10,
      columnFilters: [],
      sorting: [],
    }

    await expect(documentService.fetchDocuments(params)).rejects.toThrow(
      'Error fetching documents from service',
    )

    expect(mockFetchDocumentsFromDB).toHaveBeenCalledWith(params)
  })
})
