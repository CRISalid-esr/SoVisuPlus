import {
  Document as DbDocument,
  DocumentState,
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
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { SourceJournal } from '@/types/SourceJournal'

jest.mock('@prisma/client', () => {
  const actualPrismaClient = jest.requireActual('@prisma/client')

  const mockPrismaClient = {
    document: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
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
      deleteMany: jest.fn(),
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
      state: 'default',
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
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
          },
        },
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
          [
            new SourceContribution(
              LocRelator.AUTHOR,
              new SourcePerson(
                'hal-001-uid',
                'Matthieu Dupond',
                'hal',
                'hal-001-uid',
              ),
            ),
            new SourceContribution(
              LocRelator.TEACHER,
              new SourcePerson(
                'hal-002-uid',
                'Laura Dupuis',
                'hal',
                'hal-002-uid',
              ),
            ),
          ],
          ['Document', 'Book'],
          new Date('2022-01-01T00:00:00.000Z'),
          getBibliographicPlatformByNameIgnoreCase(
            'hal',
          ) as BibliographicPlatform,
          [new Literal('HAL Record Title', 'fr')],
          'https://hal.science/hal-123',
          ['UNIV-NANTES', 'CNRS'],
          'notice',
          new SourceJournal(
            'uid-journal-0001',
            'ScanR',
            'scanr-0001',
            ['Journal du savoir'],
            'Les Grandes Editions',
          ),
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
        contributions: {
          deleteMany: {},
          create: [
            {
              person: {
                connectOrCreate: {
                  create: {
                    name: 'Matthieu Dupond',
                    source: 'hal',
                    sourceId: 'hal-001-uid',
                    uid: 'hal-001-uid',
                  },
                  where: {
                    uid: 'hal-001-uid',
                  },
                },
              },
              role: 'author',
            },
            {
              person: {
                connectOrCreate: {
                  create: {
                    name: 'Laura Dupuis',
                    source: 'hal',
                    sourceId: 'hal-002-uid',
                    uid: 'hal-002-uid',
                  },
                  where: {
                    uid: 'hal-002-uid',
                  },
                },
              },
              role: 'teacher',
            },
          ],
        },
        documentTypes: ['Document', 'Book'],
        publicationDate: new Date('2022-01-01T00:00:00.000Z'),
        document: { connect: { id: 42 } },
        platform: { set: 'hal' },
        titles: [{ value: 'HAL Record Title', language: 'fr' }],
        url: 'https://hal.science/hal-123',
        halCollectionCodes: ['UNIV-NANTES', 'CNRS'],
        halSubmitType: 'notice',
        journal: {
          connectOrCreate: {
            create: {
              publisher: 'Les Grandes Editions',
              source: 'ScanR',
              sourceId: 'scanr-0001',
              titles: ['Journal du savoir'],
              uid: 'uid-journal-0001',
            },
            where: {
              uid: 'uid-journal-0001',
            },
          },
        },
      },
      create: {
        uid: 'hal-123',
        contributions: {
          create: [
            {
              person: {
                connectOrCreate: {
                  create: {
                    name: 'Matthieu Dupond',
                    source: 'hal',
                    sourceId: 'hal-001-uid',
                    uid: 'hal-001-uid',
                  },
                  where: {
                    uid: 'hal-001-uid',
                  },
                },
              },
              role: 'author',
            },
            {
              person: {
                connectOrCreate: {
                  create: {
                    name: 'Laura Dupuis',
                    source: 'hal',
                    sourceId: 'hal-002-uid',
                    uid: 'hal-002-uid',
                  },
                  where: {
                    uid: 'hal-002-uid',
                  },
                },
              },
              role: 'teacher',
            },
          ],
        },
        documentTypes: ['Document', 'Book'],
        publicationDate: new Date('2022-01-01T00:00:00.000Z'),
        platform: 'hal',
        titles: [{ value: 'HAL Record Title', language: 'fr' }],
        url: 'https://hal.science/hal-123',
        halCollectionCodes: ['UNIV-NANTES', 'CNRS'],
        halSubmitType: 'notice',
        document: {
          connect: {
            id: 42,
          },
        },
        journal: {
          connectOrCreate: {
            create: {
              publisher: 'Les Grandes Editions',
              source: 'ScanR',
              sourceId: 'scanr-0001',
              titles: ['Journal du savoir'],
              uid: 'uid-journal-0001',
            },
            where: {
              uid: 'uid-journal-0001',
            },
          },
        },
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
      state: 'default',
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
        records: [
          {
            uid: '123456',
            contributions: [],
            documentTypes: [],
            platform: 'hal',
            titles: [
              {
                value: 'Test',
                language: 'en',
              },
            ],
            halCollectionCodes: ['ABC'],
            halSubmitType: 'file',
          },
        ],
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
      columnFilters: [
        { id: 'titles', value: 'Sample Document Title' },
        { id: 'halStatus', value: ['in_collection'] },
      ],
      sorting: [{ id: 'titles', desc: false }],
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: false,
    }

    const result = await documentDAO.fetchDocuments(fetchParams)

    expect(result.documents).toHaveLength(1)
    expect(result.totalItems).toBe(1)
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        contributions: {
          every: {
            roles: {
              hasSome: ['editor', 'reviewer'],
            },
          },
        },
        AND: [
          {
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
              {
                journal: {
                  title: {
                    contains: 'Sample',
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            ],
          },
          {
            OR: [
              {
                records: {
                  some: {
                    platform: 'hal',
                    halCollectionCodes: {
                      hasSome: ['ABC', 'DEF'],
                    },
                  },
                },
              },
            ],
          },
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
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
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

  it('should filter by out_of_collection HAL status type', async () => {
    const fetchParams = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'halStatus', value: ['out_of_collection'] }],
      sorting: [{ id: 'titles', desc: false }],
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: false,
    }

    await documentDAO.fetchDocuments(fetchParams)

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        contributions: {
          every: {
            roles: {
              hasSome: ['editor', 'reviewer'],
            },
          },
        },
        AND: [
          {
            OR: [
              {
                records: {
                  some: {
                    platform: 'hal',
                  },
                  none: {
                    halCollectionCodes: {
                      hasSome: ['ABC', 'DEF'],
                    },
                  },
                },
              },
            ],
          },
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
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
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

  it('should filter by outside_hal HAL status type', async () => {
    const fetchParams = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [{ id: 'halStatus', value: ['outside_hal'] }],
      sorting: [{ id: 'titles', desc: false }],
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: false,
    }

    await documentDAO.fetchDocuments(fetchParams)

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        contributions: {
          every: {
            roles: {
              hasSome: ['editor', 'reviewer'],
            },
          },
        },
        AND: [
          {
            OR: [
              {
                records: {
                  none: {
                    platform: 'hal',
                  },
                },
              },
            ],
          },
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
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
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

  it('should filter valid HAL records in incomplete HAL deposit tab', async () => {
    const fetchParams = {
      searchTerm: '',
      searchLang: 'en',
      page: 1,
      pageSize: 10,
      columnFilters: [],
      sorting: [{ id: 'titles', desc: false }],
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      halCollectionCodes: ['ABC', 'DEF'],
      areHalCollectionCodesOmitted: true,
    }

    await documentDAO.fetchDocuments(fetchParams)

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        contributions: {
          every: {
            roles: {
              hasSome: ['editor', 'reviewer'],
            },
          },
        },
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
        records: {
          none: {
            OR: [
              {
                halSubmitType: 'file',
              },
              {
                halSubmitType: 'annex',
              },
            ],
            halCollectionCodes: {
              hasSome: ['ABC', 'DEF'],
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
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
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

  it('should count documents', async () => {
    ;(mockPrisma.document.count as jest.Mock).mockResolvedValue(1)

    const countParams = {
      searchTerm: 'Sample',
      searchLang: 'en',
      columnFilters: [{ id: 'titles', value: 'Sample Document Title' }],
      contributorUids: ['local-123'],
      contributorType: 'person' as AgentType,
      halCollectionCodes: ['ABC', 'DEF'],
    }

    const result = await documentDAO.countDocuments(countParams)

    expect(result.allItems).toBe(1)
    expect(result.incompleteHalRepositoryItems).toBe(1)
    expect(mockPrisma.document.count).toHaveBeenCalled()
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
      state: 'default',
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
                memberships: { include: { researchStructure: true } },
              },
            },
          },
        },
        records: {
          include: {
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
          },
        },
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
      title: 'Journal of Testing',
      identifiers: [
        { type: 'issn', value: '1234-5678', format: 'Print' },
        { type: 'issn', value: '8765-4321', format: 'Online' },
      ],
    } as unknown as DbJournal)
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)

    document.journal = new Journal(
      'Journal of Testing',
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
          records: {
            include: {
              contributions: {
                include: {
                  person: true,
                },
              },
              journal: true,
            },
          },
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
          title: 'Journal of Testing',
        }),
        update: expect.objectContaining({
          publisher: 'Test Publisher',
          title: 'Journal of Testing',
        }),
        where: expect.objectContaining({ issnL: '1234-5678' }),
      }),
    )
    // Assert: check journal identifiers were handled
    expect(mockPrisma.journalIdentifier.create).toHaveBeenCalledTimes(2)
  })

  it('should delete specified concepts from a document', async () => {
    const mockDocId = 42

    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue({
      id: mockDocId,
    })
    ;(mockPrisma.document.update as jest.Mock).mockResolvedValue({})

    const documentUid = 'doc-uid-to-delete'
    const conceptUids = ['concept-1', 'concept-2']

    await documentDAO.deleteConceptsFromDocument(documentUid, conceptUids)

    expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
      where: { uid: documentUid },
      select: { id: true },
    })

    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: mockDocId },
      data: {
        subjects: {
          disconnect: [{ uid: 'concept-1' }, { uid: 'concept-2' }],
        },
      },
    })
  })

  it('should add specified concepts to a document', async () => {
    const mockDocId = 42

    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue({
      id: mockDocId,
    })
    ;(mockPrisma.document.update as jest.Mock).mockResolvedValue({})

    const documentUid = 'doc-uid-to-add'
    const concepts = [
      {
        uid: 'concept-1',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
      {
        uid: 'concept-2',
        prefLabels: [],
        altLabels: [],
        uri: null,
      },
    ]

    await documentDAO.addConceptsToDocument(documentUid, concepts)

    expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
      where: { uid: documentUid },
      select: { id: true },
    })

    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: mockDocId },
      data: {
        subjects: {
          connect: [{ uid: 'concept-1' }, { uid: 'concept-2' }],
        },
      },
    })
  })

  it('should throw an error if document is not found when deleting concepts', async () => {
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)

    const documentUid = 'missing-doc'
    const conceptUids = ['concept-1', 'concept-2']

    await expect(
      documentDAO.deleteConceptsFromDocument(documentUid, conceptUids),
    ).rejects.toThrow(`Document with UID ${documentUid} not found`)

    expect(mockPrisma.document.update).not.toHaveBeenCalled()
  })

  it('updates the state to waiting_for_update and returns updated rows', async () => {
    const uids = ['doc-1', 'doc-2']
    ;(mockPrisma.document.updateMany as jest.Mock).mockResolvedValue({
      count: 2,
    })
    ;(mockPrisma.document.findMany as jest.Mock).mockResolvedValue([
      { uid: 'doc-1', state: DocumentState.waiting_for_update },
      { uid: 'doc-2', state: DocumentState.waiting_for_update },
    ])

    const dao = new DocumentDAO()
    const result = await dao.markDocumentsWaitingForUpdate(uids)

    expect(mockPrisma.document.updateMany).toHaveBeenCalledWith({
      where: { uid: { in: uids } },
      data: { state: DocumentState.waiting_for_update },
    })
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { uid: { in: uids } },
      select: { uid: true, state: true },
    })
    expect(result).toEqual([
      { uid: 'doc-1', state: DocumentState.waiting_for_update },
      { uid: 'doc-2', state: DocumentState.waiting_for_update },
    ])
  })

  it('handles empty input by no-op update and returning an empty list', async () => {
    const uids: string[] = []
    ;(mockPrisma.document.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    })
    ;(mockPrisma.document.findMany as jest.Mock).mockResolvedValue([])

    const dao = new DocumentDAO()
    const result = await dao.markDocumentsWaitingForUpdate(uids)

    expect(mockPrisma.document.updateMany).toHaveBeenCalledWith({
      where: { uid: { in: [] } },
      data: { state: DocumentState.waiting_for_update },
    })
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { uid: { in: [] } },
      select: { uid: true, state: true },
    })
    expect(result).toEqual([])
  })

  it('updates document type by uid', async () => {
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue({
      id: 99,
    })
    ;(mockPrisma.document.update as jest.Mock).mockResolvedValue({})

    const dao = new DocumentDAO()
    await dao.updateDocumentTypeByUid('doc-99', DocumentType.JournalArticle)

    expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
      where: { uid: 'doc-99' },
      select: { id: true },
    })
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data: {
        documentType: DocumentType.JournalArticle,
      },
    })
  })

  it('throws if document not found when updating document type', async () => {
    ;(mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null)

    const dao = new DocumentDAO()
    await expect(
      dao.updateDocumentTypeByUid('missing-doc', DocumentType.Book),
    ).rejects.toThrow('Document with UID missing-doc not found')

    expect(mockPrisma.document.update).not.toHaveBeenCalled()
  })
})
