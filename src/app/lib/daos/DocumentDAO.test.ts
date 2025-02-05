import {
  Document as DbDocument,
  Person as DbPerson,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { Document } from '@/types/Document'
import { DocumentDAO } from './DocumentDAO'
import { PersonDAO } from './PersonDAO'
import { Person } from '@/types/Person'
import { Literal } from '@/types/Literal'

jest.mock('@prisma/client', () => {
  const actualPrismaClient = jest.requireActual('@prisma/client')

  const mockPrismaClient = {
    document: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    documentTitle: {
      upsert: jest.fn(),
    },
    documentAbstract: {
      upsert: jest.fn(),
    },
    contribution: {
      create: jest.fn(),
    },
  }

  return {
    ...actualPrismaClient,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

const mockPrisma = new PrismaClient()

describe('DocumentDAO', () => {
  let documentDAO: DocumentDAO
  beforeEach(() => {
    jest.clearAllMocks()
    documentDAO = new DocumentDAO()
  })

  const document: Document = new Document(
    'doc-123',
    [new Literal('Sample Document Title', 'en')],
    [new Literal('Sample Abstract', 'en')],
    [
      {
        person: new Person(
          'person-1',
          false,
          'john@example.com',
          'John Doe',
          'John',
          'Doe',
          [],
        ),
        role: 'AUTHOR',
      },
    ],
  )

  it('should create or update a document', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      titles: [],
      abstracts: [],
      title_locale_0: '',
      title_locale_1: '',
      title_locale_2: '',
    } as DbDocument

    // Mock the document retrieval
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null) // No existing document found
    ;(mockPrisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument)

    // Mock the upsert methods for titles and abstracts
    ;(mockPrisma.documentTitle.upsert as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.documentAbstract.upsert as jest.Mock).mockResolvedValue(null)

    // Mock the person DAO
    const mockPerson = {
      id: 1,
      displayName: 'John Doe',
    } as DbPerson

    jest
      .spyOn(PersonDAO.prototype, 'createOrUpdatePerson')
      .mockResolvedValue(mockPerson)

    const dbDocument = await documentDAO.createOrUpdateDocument(document)

    expect(dbDocument.uid).toEqual('doc-123')
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: { uid: 'doc-123' },
      include: { titles: true, abstracts: true },
    })

    // Ensure that the titles and abstracts upsert methods were called
    expect(mockPrisma.documentTitle.upsert).toHaveBeenCalled()
    expect(mockPrisma.documentAbstract.upsert).toHaveBeenCalled()

    // Ensure the person contribution was created
    expect(mockPrisma.contribution.create).toHaveBeenCalledWith({
      data: {
        personId: 1,
        documentId: 1,
        role: 'AUTHOR',
      },
    })
  })

  it('should handle missing document gracefully and create a new one', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      titles: [],
      abstracts: [],
      title_locale_0: '',
      title_locale_1: '',
      title_locale_2: '',
    } as DbDocument

    // Simulate no existing document, so create a new one
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument)

    const dbDocument = await documentDAO.createOrUpdateDocument(document)

    expect(dbDocument.uid).toEqual('doc-123')
    expect(mockPrisma.document.create).toHaveBeenCalled()
  })

  it('should fetch documents from DB with search and filters', async () => {
    const mockDbDocuments = [
      {
        id: 1,
        uid: 'doc-123',
        titles: [{ language: 'en', value: 'Sample Document Title' }],
        abstracts: [{ language: 'en', value: 'Sample Abstract' }],
      },
    ] as unknown as DbDocument[]

    // Mock fetch documents query
    ;(mockPrisma.document.findMany as jest.Mock).mockResolvedValue(
      mockDbDocuments,
    )
    ;(mockPrisma.document.count as jest.Mock).mockResolvedValue(1)

    const fetchParams = {
      searchTerm: 'Sample',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'titles', value: 'Sample Document Title' }],
      sorting: [{ id: 'titles', desc: false }],
      contributorUid: 'local-123',
    }

    const result = await documentDAO.fetchDocumentsFromDB(fetchParams)

    expect(result.documents).toHaveLength(1)
    expect(result.totalItems).toBe(1)
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            titles: {
              some: {
                value: {
                  contains: 'Sample',
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            abstracts: {
              some: {
                value: {
                  contains: 'Sample',
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            contributions: {
              some: {
                person: {
                  displayName: {
                    contains: 'Sample',
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
        ],
        titles: {
          some: {
            value: {
              contains: 'Sample Document Title',
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      },
      skip: 0,
      take: 10,
      orderBy: [
        {
          titles: {
            _count: 'asc',
          },
        },
      ],
      include: {
        titles: true,
        abstracts: true,
        contributions: {
          include: {
            person: true,
          },
        },
      },
    })
  })
})
