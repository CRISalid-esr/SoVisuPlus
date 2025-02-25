import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'

jest.mock('@/lib/daos/DocumentDAO')

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockFetchDocumentsFromDB: jest.Mock
  let mockFetchDocumentByIdFromDB: jest.Mock
  beforeEach(() => {
    mockFetchDocumentsFromDB = jest.fn()
    mockFetchDocumentByIdFromDB = jest.fn()
    ;(DocumentDAO as jest.Mock).mockImplementation(() => ({
      fetchDocumentsFromDB: mockFetchDocumentsFromDB,
      fetchDocumentByIdFromDB: mockFetchDocumentByIdFromDB,
    }))

    documentService = new DocumentService()
  })

  it('should return a document when fetchDocumentById succeeds', async () => {
    const mockDocument = { id: '123', name: 'Test Document' }
    mockFetchDocumentByIdFromDB.mockResolvedValue(mockDocument)

    await expect(documentService.fetchDocumentById('123')).resolves.toEqual(
      mockDocument,
    )

    expect(mockFetchDocumentByIdFromDB).toHaveBeenCalledWith('123')
  })

  it('should throw an error when fetchDocumentByIdFromDB fails', async () => {
    mockFetchDocumentByIdFromDB.mockRejectedValue(new Error('DB error'))

    await expect(documentService.fetchDocumentById('123')).rejects.toThrow(
      'Error fetching document from service',
    )

    expect(mockFetchDocumentByIdFromDB).toHaveBeenCalledWith('123')
  })

  it('should return documents and totalItems when fetchDocuments succeeds', async () => {
    const mockResponse = {
      documents: [{ id: 1, name: 'Test Document' }],
      totalItems: 1,
    }

    mockFetchDocumentsFromDB.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: 'test',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'category', value: 'reports' }],
      sorting: [{ id: 'name', desc: false }],
      contributorUid: 'local-124',
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
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [],
      sorting: [],
      contributorUid: 'local-124',
    }

    await expect(documentService.fetchDocuments(params)).rejects.toThrow(
      'Error fetching documents from service',
    )

    expect(mockFetchDocumentsFromDB).toHaveBeenCalledWith(params)
  })
})
