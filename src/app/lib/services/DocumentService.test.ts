import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'
import { DocumentType } from '@/types/Document'
import { UserDAO } from '@/lib/daos/UserDAO'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ConceptDAO } from '@/lib/daos/ConceptDAO'
import { Concept } from '@/types/Concept'

jest.mock('@/lib/daos/DocumentDAO')
jest.mock('@/lib/daos/UserDAO')
jest.mock('@/lib/daos/ActionDAO')
jest.mock('@/lib/daos/ConceptDAO')

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockFetchDocuments: jest.Mock
  let mockFetchOAYearDocuments: jest.Mock
  let mockfetchDocumentById: jest.Mock
  let mockCountDocuments: jest.Mock
  let mockDeleteConceptsFromDocument: jest.Mock
  let mockAddConceptsToDocument: jest.Mock
  let mockCreateAction: jest.Mock
  let mockCreateOrUpdateConcept: jest.Mock
  let mockMarkDocumentsWaitingForUpdate: jest.Mock
  let mockUpdateDocumentTypeByUid: jest.Mock

  beforeEach(() => {
    mockFetchDocuments = jest.fn()
    mockFetchOAYearDocuments = jest.fn()
    mockfetchDocumentById = jest.fn()
    mockCountDocuments = jest.fn()
    mockDeleteConceptsFromDocument = jest.fn()
    mockAddConceptsToDocument = jest.fn()
    mockCreateAction = jest.fn()
    mockCreateOrUpdateConcept = jest.fn()
    mockMarkDocumentsWaitingForUpdate = jest.fn()
    mockUpdateDocumentTypeByUid = jest.fn()
    ;(DocumentDAO as jest.Mock).mockImplementation(() => ({
      fetchDocuments: mockFetchDocuments,
      fetchOAYearDocuments: mockFetchOAYearDocuments,
      fetchDocumentById: mockfetchDocumentById,
      deleteConceptsFromDocument: mockDeleteConceptsFromDocument,
      addConceptsToDocument: mockAddConceptsToDocument,
      countDocuments: mockCountDocuments,
      markDocumentsWaitingForUpdate: mockMarkDocumentsWaitingForUpdate,
      updateDocumentTypeByUid: mockUpdateDocumentTypeByUid,
    }))
    ;(UserDAO as jest.Mock).mockImplementation(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({
        person: { uid: 'local-123' },
      }),
    }))
    ;(ActionDAO as jest.Mock).mockImplementation(() => ({
      createAction: mockCreateAction,
    }))
    ;(ConceptDAO as jest.Mock).mockImplementation(() => ({
      createOrUpdateConcept: mockCreateOrUpdateConcept,
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
      halCollectionCodes: ['ABC', 'DEF'],
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
      halCollectionCodes: ['ABC', 'DEF'],
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
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: false,
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
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: false,
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

  it('should return documents when documentsPerYear succeeds', async () => {
    const mockResponse = {
      documents: [
        {
          uid: 'doc-123',
          oaStatus: 'GREEN',
          publicationDate: '2022',
          upwOAStatus: 'DIAMOND',
        },
      ],
    }

    const returnValue = {
      publicationsPerYear: {
        '2022': [
          {
            uid: 'doc-123',
            oaStatus: 'GREEN',
            publicationDate: '2022',
            upwOAStatus: 'DIAMOND',
          },
        ],
      },
    }

    mockFetchOAYearDocuments.mockResolvedValue(mockResponse)

    const contributorUid = 'local-124'
    const contributorType = 'person' as AgentType

    await expect(
      documentService.documentsPerYear(contributorUid, contributorType),
    ).resolves.toEqual(returnValue)

    const contributorUids = [contributorUid]
    expect(mockFetchOAYearDocuments).toHaveBeenCalledWith(contributorUids)
  })

  it('should throw an error when fetchDocumentsFromDB fails', async () => {
    mockFetchOAYearDocuments.mockRejectedValue(new Error('DB error'))

    const contributorUid = 'local-124'
    const contributorType = 'person' as AgentType

    await expect(
      documentService.documentsPerYear(contributorUid, contributorType),
    ).rejects.toThrow('Error fetching documents from service')

    const contributorUids = [contributorUid]
    expect(mockFetchOAYearDocuments).toHaveBeenCalledWith(contributorUids)
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
  it('should create an action corresponding to deleted concept', async () => {
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
    expect(mockCreateAction).toHaveBeenCalledWith({
      actionType: 'REMOVE',
      targetType: 'DOCUMENT',
      targetUid: 'doc-123',
      path: 'subjects',
      parameters: { conceptUids: ['c1', 'c2'] },
      personUid: 'local-123',
    })
  })

  it('should call addConceptsToDocument with correct arguments', async () => {
    mockAddConceptsToDocument.mockResolvedValue(undefined)

    await expect(
      documentService.addConceptsToDocument(
        'doc-123',
        [
          {
            uid: 'c1',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
          {
            uid: 'c2',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
        ],
        'user-1234',
      ),
    ).resolves.toBeUndefined()

    expect(mockCreateOrUpdateConcept).toHaveBeenCalledWith(
      new Concept('c1', [], []),
    )

    expect(mockCreateOrUpdateConcept).toHaveBeenCalledWith(
      new Concept('c2', [], []),
    )

    expect(mockAddConceptsToDocument).toHaveBeenCalledWith('doc-123', [
      {
        uid: 'c1',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
      {
        uid: 'c2',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
    ])
  })
  it('should throw an error when addConceptsToDocument fails', async () => {
    mockAddConceptsToDocument.mockRejectedValue(new Error('DB error'))

    await expect(
      documentService.addConceptsToDocument(
        'doc-123',
        [
          {
            uid: 'c1',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
          {
            uid: 'c2',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
        ],
        'user-1234',
      ),
    ).rejects.toThrow('Error adding concepts to document')

    expect(mockAddConceptsToDocument).toHaveBeenCalledWith('doc-123', [
      {
        uid: 'c1',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
      {
        uid: 'c2',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
    ])
  })
  it('should create an action corresponding to added concept', async () => {
    mockAddConceptsToDocument.mockResolvedValue(undefined)

    await expect(
      documentService.addConceptsToDocument(
        'doc-123',
        [
          {
            uid: 'c1',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
          {
            uid: 'c2',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
        ],
        'user-1234',
      ),
    ).resolves.toBeUndefined()

    expect(mockAddConceptsToDocument).toHaveBeenCalledWith('doc-123', [
      {
        uid: 'c1',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
      {
        uid: 'c2',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
    ])
    expect(mockCreateAction).toHaveBeenCalledWith({
      actionType: 'ADD',
      targetType: 'DOCUMENT',
      targetUid: 'doc-123',
      path: 'subjects',
      parameters: JSON.stringify({
        uid: 'c1',
        prefLabels: [],
        altLabels: [],
        uri: null,
      }),
      personUid: 'local-123',
    })
    expect(mockCreateAction).toHaveBeenCalledWith({
      actionType: 'ADD',
      targetType: 'DOCUMENT',
      targetUid: 'doc-123',
      path: 'subjects',
      parameters: JSON.stringify({
        uid: 'c2',
        prefLabels: [],
        altLabels: [],
        uri: null,
      }),
      personUid: 'local-123',
    })
  })

  it('marks docs waiting, then creates MERGE action, and returns {updated}', async () => {
    const updated = [
      { uid: 'd1', state: 'waiting_for_update' },
      { uid: 'd2', state: 'waiting_for_update' },
      { uid: 'd3', state: 'waiting_for_update' },
    ]
    mockMarkDocumentsWaitingForUpdate.mockResolvedValue(updated)

    const result = await documentService.mergeDocuments(
      ['d1', 'd2', 'd3'],
      'user-1234',
    )

    expect(mockMarkDocumentsWaitingForUpdate).toHaveBeenCalledTimes(1)
    expect(mockMarkDocumentsWaitingForUpdate).toHaveBeenCalledWith([
      'd1',
      'd2',
      'd3',
    ])

    expect(mockCreateAction).toHaveBeenCalledTimes(1)
    expect(mockCreateAction).toHaveBeenCalledWith({
      actionType: 'MERGE',
      targetType: 'DOCUMENT',
      targetUid: 'd1',
      path: null,
      parameters: { mergedDocumentUids: ['d2', 'd3'] },
      personUid: 'local-123',
    })

    expect(result).toEqual({ updated })
  })

  it('throws and does not create action if marking waiting state fails', async () => {
    mockMarkDocumentsWaitingForUpdate.mockRejectedValue(
      new Error('DAO mark error'),
    )

    await expect(
      documentService.mergeDocuments(['d1', 'd2'], 'user-1234'),
    ).rejects.toThrow('Error merging documents')

    expect(mockCreateAction).not.toHaveBeenCalled()
  })

  it('throws if fewer than 2 documents are provided to mergeDocuments', async () => {
    await expect(
      documentService.mergeDocuments(['only-one'], 'user-1234'),
    ).rejects.toThrow('At least two documents are required to merge')

    expect(mockCreateAction).not.toHaveBeenCalled()
  })

  it('throws when user submitting merge has no associated person', async () => {
    ;(UserDAO as jest.Mock).mockImplementationOnce(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({ person: null }),
    }))
    const svc = new DocumentService()

    await expect(svc.mergeDocuments(['d1', 'd2'], 'user-1234')).rejects.toThrow(
      'Error merging documents',
    )

    // ensure no action is created when user not found
    expect(mockCreateAction).not.toHaveBeenCalled()
  })

  it('throws when action creation fails during mergeDocuments', async () => {
    mockCreateAction.mockRejectedValueOnce(new Error('DAO level error'))

    await expect(
      documentService.mergeDocuments(['d1', 'd2'], 'user-1234'),
    ).rejects.toThrow('Error merging documents')
  })
  it('expands hierarchical types for fetchDocuments (ScholarlyPublication)', async () => {
    const mockResponse = { documents: [], totalItems: 0 }
    mockFetchDocuments.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [
        { id: 'type', value: [DocumentType.ScholarlyPublication] },
      ],
      sorting: [],
      contributorUid: 'local-xyz',
      contributorType: 'person' as AgentType,
      halCollectionCodes: [],
      areHalCollectionCodesOmitted: false,
    }

    await expect(documentService.fetchDocuments(params)).resolves.toEqual(
      mockResponse,
    )

    // Grab the args passed to the DAO
    const calledWith = mockFetchDocuments.mock.calls[0][0]
    const typeFilter = calledWith.columnFilters.find(
      (f: { id: string; value: string }) => f.id === 'type',
    )

    const expected = [
      DocumentType.ScholarlyPublication,
      DocumentType.Presentation,
      DocumentType.JournalArticle,
      DocumentType.ConferenceArticle,
      DocumentType.Book,
      DocumentType.BookChapter,
      DocumentType.Monograph,
      DocumentType.Proceedings,
      DocumentType.BookOfChapters,
      DocumentType.Article,
      DocumentType.ConferenceAbstract,
      DocumentType.Preface,
      DocumentType.Comment,
    ]

    expect(typeFilter.value).toEqual(expect.arrayContaining(expected))
    expect(typeFilter.value.length).toBe(expected.length) // no duplicates
  })

  it('expands hierarchical types for fetchDocuments (Book -> Monograph, Proceedings)', async () => {
    const mockResponse = { documents: [], totalItems: 0 }
    mockFetchDocuments.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'type', value: [DocumentType.Book] }],
      sorting: [],
      contributorUid: 'local-xyz',
      contributorType: 'person' as AgentType,
      halCollectionCodes: [],
      areHalCollectionCodesOmitted: false,
    }

    await documentService.fetchDocuments(params)

    const calledWith = mockFetchDocuments.mock.calls[0][0]
    const typeFilter = calledWith.columnFilters.find(
      (f: { id: string; value: string }) => f.id === 'type',
    )

    const expected = [
      DocumentType.Book,
      DocumentType.BookOfChapters,
      DocumentType.Monograph,
      DocumentType.Proceedings,
    ]

    expect(typeFilter.value).toEqual(expect.arrayContaining(expected))
    expect(typeFilter.value.length).toBe(expected.length)
  })

  it('does not expand a leaf type for fetchDocuments (JournalArticle stays itself)', async () => {
    const mockResponse = { documents: [], totalItems: 0 }
    mockFetchDocuments.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'type', value: [DocumentType.JournalArticle] }],
      sorting: [],
      contributorUid: 'local-xyz',
      contributorType: 'person' as AgentType,
      halCollectionCodes: [],
      areHalCollectionCodesOmitted: false,
    }

    await documentService.fetchDocuments(params)

    const calledWith = mockFetchDocuments.mock.calls[0][0]
    const typeFilter = calledWith.columnFilters.find(
      (f: { id: string; value: string }) => f.id === 'type',
    )

    expect(typeFilter.value).toEqual([DocumentType.JournalArticle])
  })

  it('expands hierarchical types for countDocuments as well', async () => {
    mockCountDocuments.mockResolvedValue({
      allItems: 0,
      incompleteHalRepositoryItems: 0,
    })

    const params = {
      searchTerm: '',
      searchLang: 'en',
      columnFilters: [
        { id: 'type', value: [DocumentType.ScholarlyPublication] },
      ],
      contributorUid: 'local-xyz',
      contributorType: 'person' as AgentType,
      halCollectionCodes: [],
    }

    await documentService.countDocuments(params)

    const calledWith = mockCountDocuments.mock.calls[0][0]
    const typeFilter = calledWith.columnFilters.find(
      (f: { id: string; value: string }) => f.id === 'type',
    )

    const expected = [
      DocumentType.ScholarlyPublication,
      DocumentType.JournalArticle,
      DocumentType.ConferenceArticle,
      DocumentType.Book,
      DocumentType.BookChapter,
      DocumentType.Monograph,
      DocumentType.Proceedings,
      DocumentType.BookOfChapters,
      DocumentType.Presentation,
      DocumentType.Article,
      DocumentType.ConferenceAbstract,
      DocumentType.Preface,
      DocumentType.Comment,
    ]

    expect(typeFilter.value).toEqual(expect.arrayContaining(expected))
    expect(typeFilter.value.length).toBe(expected.length)
  })
  it('updates document type and creates UPDATE action', async () => {
    mockUpdateDocumentTypeByUid.mockResolvedValue(undefined)

    await expect(
      documentService.updateDocumentType(
        'doc-1',
        DocumentType.Book,
        'user-1234',
      ),
    ).resolves.toBeUndefined()

    expect(mockUpdateDocumentTypeByUid).toHaveBeenCalledWith(
      'doc-1',
      DocumentType.Book,
    )
    expect(mockCreateAction).toHaveBeenCalledWith({
      actionType: 'UPDATE',
      targetType: 'DOCUMENT',
      targetUid: 'doc-1',
      path: 'documentType',
      parameters: { value: DocumentType.Book },
      personUid: 'local-123',
    })
  })

  it('throws when user has no associated person for updateDocumentType', async () => {
    ;(UserDAO as jest.Mock).mockImplementationOnce(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({ person: null }),
    }))
    const svc = new DocumentService()

    await expect(
      svc.updateDocumentType('doc-1', DocumentType.Book, 'user-1234'),
    ).rejects.toThrow('Error updating document type')

    expect(mockUpdateDocumentTypeByUid).not.toHaveBeenCalled()
    expect(mockCreateAction).not.toHaveBeenCalled()
  })

  it('propagates DAO error and does not create action', async () => {
    mockUpdateDocumentTypeByUid.mockRejectedValue(new Error('DAO error'))

    await expect(
      documentService.updateDocumentType(
        'doc-1',
        DocumentType.Book,
        'user-1234',
      ),
    ).rejects.toThrow('Error updating document type')

    expect(mockUpdateDocumentTypeByUid).toHaveBeenCalled()
    expect(mockCreateAction).not.toHaveBeenCalled()
  })

  it('propagates action creation error after DAO success', async () => {
    mockUpdateDocumentTypeByUid.mockResolvedValue(undefined)
    mockCreateAction.mockRejectedValueOnce(new Error('Action DAO error'))

    await expect(
      documentService.updateDocumentType(
        'doc-1',
        DocumentType.Book,
        'user-1234',
      ),
    ).rejects.toThrow('Error updating document type')

    expect(mockUpdateDocumentTypeByUid).toHaveBeenCalledWith(
      'doc-1',
      DocumentType.Book,
    )
    expect(mockCreateAction).toHaveBeenCalled()
  })
})
