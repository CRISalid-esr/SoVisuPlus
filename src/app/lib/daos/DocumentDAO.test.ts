import {
  Document as DbDocument,
  Person as DbPerson,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { Document, DocumentType } from '@/types/Document'
import { DocumentDAO } from './DocumentDAO'
import { PersonDAO } from './PersonDAO'
import { Person } from '@/types/Person'
import { Literal } from '@/types/Literal'
import { LocRelator } from '@/types/LocRelator'
import { Contribution } from '@/types/Contribution'
import { Concept } from '@/types/Concept'

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
      upsert: jest.fn(),
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
    DocumentType.Document,
    '2022',
    new Date('2022-01-01T00:00:00.000Z'),
    new Date('2022-12-31T23:59:59.000Z'),
    [new Literal('Sample Document Title', 'en')],
    [new Literal('Sample Abstract', 'en')],
    [
      new Concept(
        'concept-123',
        [
          Literal.fromObject({
            value: 'Concept preferred label',
            language: 'en',
          }),
        ],
        [Literal.fromObject({ value: 'Concept alt label', language: 'en' })],
        'http://example.com/concept/123',
      ),
    ],
    [
      new Contribution(
        new Person(
          'person-1',
          false,
          'john@example.com',
          'John Doe',
          'John',
          'Doe',
          [],
        ),
        [LocRelator.AUTHOR_OF_INTRODUCTION__ETC_],
      ),
    ],
  )

  it('should create or update a document', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      documentType: DocumentType.Document,
      titles: [],
      abstracts: [],
      subjects: [],
      title_locale_0: '',
      title_locale_1: '',
      title_locale_2: '',
      publicationDate: '2022',
      publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
      publicationDateEnd: new Date('2022-12-31T23:59:59.000Z'),
    } as DbDocument

    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument)
    ;(mockPrisma.documentTitle.upsert as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.documentAbstract.upsert as jest.Mock).mockResolvedValue(null)

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
      data: {
        uid: 'doc-123',
        documentType: 'Document',
        title_locale_0: 'Sample Document Title',
        title_locale_1: 'Sample Document Title',
        title_locale_2: '',
        publicationDate: '2022',
        publicationDateStart: '2022-01-01T00:00:00.000Z',
        publicationDateEnd: '2022-12-31T23:59:59.000Z',
      },
      include: {
        titles: true,
        abstracts: true,
        subjects: true,
        contributions: { include: { person: true } },
      },
    })

    expect(mockPrisma.documentTitle.upsert).toHaveBeenCalled()
    expect(mockPrisma.documentAbstract.upsert).toHaveBeenCalled()
    expect(mockPrisma.contribution.upsert).toHaveBeenCalledWith({
      create: {
        documentId: 1,
        personId: 1,
        roles: {
          set: ['author of introduction, etc.'],
        },
      },
      update: {
        roles: {
          set: ['author of introduction, etc.'],
        },
      },
      where: {
        personId_documentId: {
          documentId: 1,
          personId: 1,
        },
      },
    })
  })

  it('should handle missing document gracefully and create a new one', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      documentType: DocumentType.Document,
      titles: [],
      abstracts: [],
      subjects: [],
      title_locale_0: '',
      title_locale_1: '',
      title_locale_2: '',
      publicationDate: '2022',
      publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
      publicationDateEnd: new Date('2022-12-31T23:59:59.000Z'),
    } as DbDocument

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
        subjects: [
          {
            uid: 'concept-123',
            prefLabels: [{ language: 'en', value: 'Concept preferred label' }],
            altLabels: [{ language: 'en', value: 'Concept alt label' }],
            url: 'http://example.com/concept/123',
          },
        ],
        publicationDate: '2022',
        publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
        publicationDateEnd: new Date('2022-12-31T23:59:59.000Z'),
      },
    ] as unknown as DbDocument[]

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
          {
            publicationDate: {
              contains: 'Sample',
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],

        contributions: {
          some: {
            person: {
              uid: fetchParams.contributorUid,
            },
          },
        },

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
          title_locale_1: 'asc',
        },
      ],
      include: {
        titles: true,
        abstracts: true,
        subjects: true,
        contributions: {
          include: {
            person: true,
          },
        },
        records: true,
      },
    })
  })
})
