import {
  Document as DbDocument,
  Journal as DbJournal,
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
import { AgentType } from '@/types/IAgent'
import { DocumentRecord } from '@/types/DocumentRecord'
import {
  BibliographicPlatform,
  getBibliographicPlatformByNameIgnoreCase,
} from '@/types/BibliographicPlatform'
import { Journal } from '@/types/Journal'
import { JournalIdentifier } from '@/types/JournalIdentifier'

jest.mock('@prisma/client', () => {
  const actualPrismaClient = jest.requireActual('@prisma/client')

  const mockPrismaClient = {
    document: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    documentRecord: {
      upsert: jest.fn(),
    },
    journal: {
      upsert: jest.fn(),
      create: jest.fn(),
    },
    journalIdentifier: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
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
    process.env.PUBLICATION_LIST_ROLES_FILTER = 'editor,reviewer'
    process.env.PERSPECTIVES_ROLES_FILTER = 'author,co-author'
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'en,fr'
    jest.clearAllMocks()
    documentDAO = new DocumentDAO()
  })

  afterAll(() => {
    process.env.PUBLICATION_LIST_ROLES_FILTER = ''
    process.env.PERSPECTIVES_ROLES_FILTER = ''
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = ''
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
      contributions: [],
      records: [],
      journalId: null,
      volume: null,
      issue: null,
      pages: null,
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
        records: true,
        subjects: {
          include: {
            labels: true,
          },
        },
        contributions: { include: { person: true } },
        journal: {
          include: {
            identifiers: true,
          },
        },
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

  it('should remove a concept from a document if missing in the updated data', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      subjects: [{ uid: 'concept-abc' }, { uid: 'concept-def' }],
      contributions: [],
    } as unknown as DbDocument

    const updatedDocument = new Document(
      'doc-123',
      DocumentType.Document,
      '2022',
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-12-31T23:59:59.000Z'),
      [new Literal('Sample Title', 'en')],
      [],
      [
        new Concept(
          'concept-abc',
          [new Literal('Preferred', 'en')],
          [],
          'http://example.com/concept/abc',
        ), // only concept-abc remains
      ],
      [],
    )

    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(
      mockDbDocument,
    )
    ;(mockPrisma.document.update as jest.Mock).mockResolvedValue({
      ...mockDbDocument,
      subjects: [{ uid: 'concept-abc' }],
    })

    const dao = new DocumentDAO()
    await dao.createOrUpdateDocument(updatedDocument)

    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        subjects: {
          disconnect: [{ uid: 'concept-def' }], // <-- we expect disconnect of removed concept
        },
      },
    })
  })

  it('should create or update a document with HAL custom fields', async () => {
    const documentWithHal = new Document(
      'doc-hal',
      DocumentType.Document,
      '2022',
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-12-31T23:59:59.000Z'),
      [new Literal('HAL Record Title', 'fr')],
      [],
      [],
      [],
      [
        new DocumentRecord(
          'hal-123',
          getBibliographicPlatformByNameIgnoreCase(
            'hal',
          ) as BibliographicPlatform,
          [new Literal('HAL Record Title', 'fr')],
          'https://hal.science/hal-123',
          ['UNIV-NANTES', 'CNRS'],
          'notice',
        ),
      ],
    )

    const mockDbDocument = {
      id: 42,
      uid: 'doc-hal',
    } as DbDocument

    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument)
    ;(mockPrisma.documentTitle.upsert as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.documentAbstract.upsert as jest.Mock).mockResolvedValue(null)

    const dbDocument = await documentDAO.createOrUpdateDocument(documentWithHal)
    expect(mockPrisma.documentRecord.upsert).toHaveBeenCalledWith({
      where: { uid: 'hal-123' },
      update: {
        platform: { set: 'hal' },
        titles: [{ value: 'HAL Record Title', language: 'fr' }],
        url: 'https://hal.science/hal-123',
        halCollectionCodes: ['UNIV-NANTES', 'CNRS'],
        halSubmitType: 'notice',
      },
      create: {
        uid: 'hal-123',
        platform: 'hal',
        titles: [{ value: 'HAL Record Title', language: 'fr' }],
        url: 'https://hal.science/hal-123',
        halCollectionCodes: ['UNIV-NANTES', 'CNRS'],
        halSubmitType: 'notice',
        documentId: 42,
      },
    })

    expect(dbDocument.uid).toBe('doc-hal')
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
      contributions: [],
      records: [],
      journalId: null,
      volume: null,
      issue: null,
      pages: null,
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
            labels: [
              {
                language: 'en',
                value: 'Concept preferred label',
                type: 'PREF',
              },
              {
                language: 'en',
                value: 'Concept alt label',
                type: 'ALT',
              },
            ],
            url: 'http://example.com/concept/123',
          },
        ],
        publicationDate: '2022',
        publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
        publicationDateEnd: new Date('2022-12-31T23:59:59.000Z'),
        contributions: [],
        records: [],
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
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      omittedHalCollectionCodes: [],
      isOnlyCounting: false,
    }

    const result = await documentDAO.fetchDocuments(fetchParams)

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
        AND: [
          {
            contributions: {
              some: {
                person: {
                  uid: {
                    in: ['local-123'],
                  },
                },
                roles: {
                  hasSome: ['author', 'co-author'],
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
          title_locale_0: 'asc',
        },
      ],
      include: {
        titles: true,
        abstracts: true,
        subjects: {
          include: {
            labels: true,
          },
        },
        contributions: {
          include: {
            person: true,
          },
        },
        records: true,
        journal: {
          include: {
            identifiers: true,
          },
        },
      },
    })
  })
  it('should fetch a document by UID', async () => {
    const mockDbDocument = {
      id: 1,
      uid: 'doc-123',
      documentType: DocumentType.Document,
      titles: [],
      abstracts: [],
      subjects: [],
      contributions: [],
      records: [],
      title_locale_0: '',
      title_locale_1: '',
      title_locale_2: '',
      publicationDate: '2022',
      publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
      publicationDateEnd: new Date('2022-12-31T23:59:59.000Z'),
      journalId: null,
      volume: null,
      issue: null,
      pages: null,
    } as DbDocument

    // Mock Prisma response
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(
      mockDbDocument,
    )

    const fetchedDocument = await documentDAO.fetchDocumentById('doc-123')

    expect(fetchedDocument).not.toBeNull()
    expect(fetchedDocument?.uid).toBe('doc-123')
    expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
      where: { uid: 'doc-123' },
      include: {
        titles: true,
        abstracts: true,
        contributions: {
          include: {
            person: {
              include: {
                identifiers: true,
              },
            },
          },
        },
        records: true,
        subjects: {
          include: {
            labels: true,
          },
        },
        journal: {
          include: {
            identifiers: true,
          },
        },
      },
    })
  })

  it('should create or update a document with journal', async () => {
    ;(mockPrisma.document.create as jest.Mock).mockResolvedValue({
      uid: 'doc-uid-001',
      documentType: DocumentType.JournalArticle,
      publicationDate: null,
      publicationDateStart: null,
      publicationDateEnd: null,
      titles: [],
      abstracts: [],
      subjects: [],
      contributions: [],
      records: [],
      journalUid: 'journal-uid-001',
      volume: '42',
      issue: '3',
      pages: '55-67',
    } as unknown as DbDocument)
    ;(mockPrisma.journal.upsert as jest.Mock).mockResolvedValue({
      id: 1,
      uid: 'journal-uid-001',
      issnL: '1234-5678',
      publisher: 'Test Publisher',
      titles: ['Journal of Testing'],
      identifiers: [
        { type: 'issn', value: '1234-5678', format: 'Print' },
        { type: 'issn', value: '8765-4321', format: 'Online' },
      ],
    } as unknown as DbJournal)
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)

    document.journal = new Journal(
      ['Journal of Testing'],
      '1234-5678',
      'Test Publisher',
      [
        new JournalIdentifier('issn', '1234-5678', 'Print'),
        new JournalIdentifier('issn', '8765-4321', 'Online'),
      ],
    )
    document.volume = '42'
    document.issue = '3'
    document.pages = '55-67'

    // Act
    await documentDAO.createOrUpdateDocument(document)

    // Assert: check document creation with journal connection
    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          issue: '3',
          pages: '55-67',
          volume: '42',
          journal: { connect: { id: 1 } },
        }),
        include: {
          titles: true,
          abstracts: true,
          subjects: { include: { labels: true } },
          contributions: { include: { person: true } },
          records: true,
          journal: {
            include: {
              identifiers: true,
            },
          },
        },
      }),
    )

    // Assert: check Prisma was called to upsert journal
    expect(mockPrisma.journal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          issnL: '1234-5678',
          publisher: 'Test Publisher',
          titles: ['Journal of Testing'],
        }),
        update: expect.objectContaining({
          publisher: 'Test Publisher',
          titles: { set: ['Journal of Testing'] },
        }),
        where: expect.objectContaining({ issnL: '1234-5678' }),
      }),
    )
    // Assert: check journal identifiers were handled
    expect(mockPrisma.journalIdentifier.create).toHaveBeenCalledTimes(2)
  })
})
