import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'
import { UserDAO } from '@/lib/daos/UserDAO'
import { ChangeDAO } from '@/lib/daos/ChangeDAO'

jest.mock('@/lib/daos/DocumentDAO')
jest.mock('@/lib/daos/UserDAO')
jest.mock('@/lib/daos/ChangeDAO')

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockFetchDocuments: jest.Mock
  let mockfetchDocumentById: jest.Mock
  let mockCountDocuments: jest.Mock
  let mockDeleteConceptsFromDocument: jest.Mock
  let mockCreateChange: jest.Mock
  beforeEach(() => {
    mockFetchDocuments = jest.fn()
    mockfetchDocumentById = jest.fn()
    mockCountDocuments = jest.fn()
    mockDeleteConceptsFromDocument = jest.fn()
    mockCreateChange = jest.fn()
    ;(DocumentDAO as jest.Mock).mockImplementation(() => ({
      fetchDocuments: mockFetchDocuments,
      fetchDocumentById: mockfetchDocumentById,
      deleteConceptsFromDocument: mockDeleteConceptsFromDocument,
      countDocuments: mockCountDocuments,
    }))
    ;(UserDAO as jest.Mock).mockImplementation(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({
        person: { uid: 'local-123' },
      }),
    }))
    ;(ChangeDAO as jest.Mock).mockImplementation(() => ({
      createChange: mockCreateChange,
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

  it('should return document count when countDocuments succeeds', async () => {
    const mockCount = { allItems: 1, incompleteHalRepositoryItems: 1 }
    mockCountDocuments.mockResolvedValue(mockCount)

    const params = {
      searchTerm: 'test',
      searchLang: 'en',
      columnFilters: [{ id: 'category', value: 'reports' }],
      contributorUid: 'local-124',
      contributorType: 'person' as AgentType,
      omittedHalCollectionCodes: [],
    }

    await expect(documentService.countDocuments(params)).resolves.toEqual(
      mockCount,
    )

    // Replace contributorUid with contributorUids
    const dbParams = {
      ...params,
      contributorUids: [params.contributorUid],
    }
    delete (dbParams as Partial<typeof dbParams>).contributorUid
    delete (dbParams as Partial<typeof dbParams>).contributorType

    expect(mockCountDocuments).toHaveBeenCalledWith(dbParams)
  })

  it('should throw an error when countDocuments fails', async () => {
    mockCountDocuments.mockRejectedValue(new Error('DB error'))

    const params = {
      searchTerm: 'test',
      searchLang: 'en',
      columnFilters: [{ id: 'category', value: 'reports' }],
      contributorUid: 'local-124',
      contributorType: 'person' as AgentType,
      omittedHalCollectionCodes: [],
    }

    await expect(documentService.countDocuments(params)).rejects.toThrow(
      'Error counting documents from service',
    )

    const dbParams = {
      ...params,
      contributorUids: [params.contributorUid],
    }
    delete (dbParams as Partial<typeof dbParams>).contributorUid
    delete (dbParams as Partial<typeof dbParams>).contributorType

    expect(mockCountDocuments).toHaveBeenCalledWith(dbParams)
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
      documentService.deleteConceptsFromDocument(
        'doc-123',
        ['c1', 'c2'],
        'user-1234',
      ),
    ).resolves.toBeUndefined()

    expect(mockDeleteConceptsFromDocument).toHaveBeenCalledWith('doc-123', [
      'c1',
      'c2',
    ])
  })
  it('should throw an error when deleteConceptsFromDocument fails', async () => {
    mockDeleteConceptsFromDocument.mockRejectedValue(new Error('DB error'))

    await expect(
      documentService.deleteConceptsFromDocument(
        'doc-123',
        ['c1', 'c2'],
        'user-1234',
      ),
    ).rejects.toThrow('Error deleting concepts from document')

    expect(mockDeleteConceptsFromDocument).toHaveBeenCalledWith('doc-123', [
      'c1',
      'c2',
    ])
  })
  it('should call deleteConceptsFromDocument with correct arguments', async () => {
    mockDeleteConceptsFromDocument.mockResolvedValue(undefined)

    await expect(
      documentService.deleteConceptsFromDocument(
        'doc-123',
        ['c1', 'c2'],
        'user-1234',
      ),
    ).resolves.toBeUndefined()

    expect(mockDeleteConceptsFromDocument).toHaveBeenCalledWith('doc-123', [
      'c1',
      'c2',
    ])
    expect(mockCreateChange).toHaveBeenCalledWith({
      action: 'REMOVE',
      targetType: 'DOCUMENT',
      targetUid: 'doc-123',
      path: 'subjects',
      parameters: { conceptUids: ['c1', 'c2'] },
      personUid: 'local-123',
    })
  })
})
