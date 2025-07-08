import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'

jest.mock('@/lib/daos/DocumentDAO')

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockFetchDocuments: jest.Mock
  let mockfetchDocumentById: jest.Mock
  let mockDeleteConceptsFromDocument: jest.Mock
  beforeEach(() => {
    mockFetchDocuments = jest.fn()
    mockfetchDocumentById = jest.fn()
    mockDeleteConceptsFromDocument = jest.fn()
    ;(DocumentDAO as jest.Mock).mockImplementation(() => ({
      fetchDocuments: mockFetchDocuments,
      fetchDocumentById: mockfetchDocumentById,
      deleteConceptsFromDocument: mockDeleteConceptsFromDocument,
    }))

    documentService = new DocumentService()
  })

  it('should return a document when fetchDocumentById succeeds', async () => {
    const mockDocument = { id: '123', name: 'Test Document' }
    mockfetchDocumentById.mockResolvedValue(mockDocument)

    await expect(documentService.fetchDocumentById('123')).resolves.toEqual(
      mockDocument,
    )

    expect(mockfetchDocumentById).toHaveBeenCalledWith('123')
  })

  it('should throw an error when fetchDocumentById fails', async () => {
    mockfetchDocumentById.mockRejectedValue(new Error('DB error'))

    await expect(documentService.fetchDocumentById('123')).rejects.toThrow(
      'Error fetching document from service',
    )

    expect(mockfetchDocumentById).toHaveBeenCalledWith('123')
  })

  it('should return documents and totalItems when fetchDocuments succeeds', async () => {
    const mockResponse = {
      documents: [{ id: 1, name: 'Test Document' }],
      totalItems: 1,
    }

    mockFetchDocuments.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: 'test',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'category', value: 'reports' }],
      sorting: [{ id: 'name', desc: false }],
      contributorUid: 'local-124',
      contributorType: 'person' as AgentType,
      omittedHalCollectionCodes: [],
      isOnlyCounting: false,
    }

    await expect(documentService.fetchDocuments(params)).resolves.toEqual(
      mockResponse,
    )

    // Replace contributorUid with contributorUids
    const dbParams = {
      ...params,
      contributorUids: [params.contributorUid],
    }
    delete (dbParams as Partial<typeof dbParams>).contributorUid
    delete (dbParams as Partial<typeof dbParams>).contributorType

    expect(mockFetchDocuments).toHaveBeenCalledWith(dbParams)
  })

  it('should throw an error when fetchDocumentsFromDB fails', async () => {
    mockFetchDocuments.mockRejectedValue(new Error('DB error'))

    const params = {
      searchTerm: 'test',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [],
      sorting: [],
      contributorUid: 'local-124',
      contributorType: 'person' as AgentType,
      omittedHalCollectionCodes: [],
      isOnlyCounting: false,
    }

    await expect(documentService.fetchDocuments(params)).rejects.toThrow(
      'Error fetching documents from service',
    )

    const dbParams = {
      ...params,
      contributorUids: [params.contributorUid],
    }
    delete (dbParams as Partial<typeof dbParams>).contributorUid
    delete (dbParams as Partial<typeof dbParams>).contributorType

    expect(mockFetchDocuments).toHaveBeenCalledWith(dbParams)
  })

  it('should call deleteConceptsFromDocument with correct arguments', async () => {
    mockDeleteConceptsFromDocument.mockResolvedValue(undefined)

    await expect(
      documentService.deleteConceptsFromDocument('doc-123', ['c1', 'c2']),
    ).resolves.toBeUndefined()

    expect(mockDeleteConceptsFromDocument).toHaveBeenCalledWith('doc-123', [
      'c1',
      'c2',
    ])
  })
  it('should throw an error when deleteConceptsFromDocument fails', async () => {
    mockDeleteConceptsFromDocument.mockRejectedValue(new Error('DB error'))

    await expect(
      documentService.deleteConceptsFromDocument('doc-123', ['c1', 'c2']),
    ).rejects.toThrow('Error deleting concepts from document')

    expect(mockDeleteConceptsFromDocument).toHaveBeenCalledWith('doc-123', [
      'c1',
      'c2',
    ])
  })
})
