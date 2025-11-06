import { PrismaClient } from '@prisma/client'
import { DocumentAggregateDAO } from './DocumentAggregateDAO'

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client')

  const mockPrismaClient = {
    document: {
      findMany: jest.fn(),
    },
  }

  return {
    ...actual,
    PrismaClient: jest.fn(() => mockPrismaClient),
  }
})

const mockPrisma = new PrismaClient()

describe('DocumentAggregateDAO', () => {
  let dao: DocumentAggregateDAO

  beforeEach(() => {
    jest.clearAllMocks()
    dao = new DocumentAggregateDAO()
  })

  it('returns [] and does not query when contributorUids is empty', async () => {
    const res = await dao.fetchDocsForPersonAggregation([])
    expect(res).toEqual([])
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled()
  })

  it('fetches docs, maps PREF labels to Literal, excludes queried contributors from coauthors, and computes years', async () => {
    // Arrange
    ;(mockPrisma.document.findMany as jest.Mock).mockResolvedValue([
      {
        publicationDateStart: new Date('2018-05-04T00:00:00.000Z'),
        publicationDate: null,
        subjects: [
          {
            uid: 'c1',
            uri: 'http://example.org/concept/1',
            labels: [
              { language: 'en', value: 'Pref One', type: 'PREF' },
              { language: 'en', value: 'Alt One', type: 'ALT' },
            ],
          },
          {
            uid: 'c2',
            uri: 'http://example.org/concept/2',
            labels: [{ language: 'fr', value: 'Pref Deux', type: 'PREF' }],
          },
        ],
        contributions: [
          {
            person: {
              uid: 'p1', // in the queried set → must be excluded from coauthors
              displayName: 'Alice',
              normalizedName: 'alice',
              firstName: 'Alice',
              lastName: 'A',
            },
          },
          {
            person: {
              uid: 'p2', // not queried → should appear in coauthors
              displayName: 'Bob',
              normalizedName: 'bob',
              firstName: 'Bob',
              lastName: 'B',
            },
          },
        ],
      },
      {
        publicationDateStart: null,
        publicationDate: '2019-03',
        subjects: [],
        contributions: [
          {
            person: {
              uid: 'p3', // in the queried set → excluded
              displayName: 'Carol',
              normalizedName: 'carol',
              firstName: 'Carol',
              lastName: 'C',
            },
          },
        ],
      },
    ])

    // Act
    const res = await dao.fetchDocsForPersonAggregation(['p1', 'p3'])

    // Assert: prisma call shape
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        contributions: {
          some: {
            person: {
              uid: { in: ['p1', 'p3'] },
            },
          },
        },
      },
      select: {
        publicationDateStart: true,
        publicationDate: true,
        subjects: {
          select: {
            uid: true,
            uri: true,
            labels: { select: { language: true, value: true, type: true } },
          },
        },
        contributions: {
          select: {
            person: {
              select: {
                uid: true,
                displayName: true,
                normalizedName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Assert: output rows
    expect(res).toHaveLength(2)

    // Row 1 (2018)
    const r1 = res[0]
    expect(r1.year).toBe(2018)
    // subjects keep only PREF labels and convert to Literal
    expect(r1.subjects).toEqual([
      {
        uid: 'c1',
        uri: 'http://example.org/concept/1',
        prefLabels: [{ value: 'Pref One', language: 'en' }],
      },
      {
        uid: 'c2',
        uri: 'http://example.org/concept/2',
        prefLabels: [{ value: 'Pref Deux', language: 'fr' }],
      },
    ])
    // coauthors excludes p1, keeps p2
    expect(r1.coauthors).toEqual([
      {
        uid: 'p2',
        displayName: 'Bob',
        firstName: 'Bob',
        lastName: 'B',
      },
    ])

    // Row 2 (2019)
    const r2 = res[1]
    expect(r2.year).toBe(2019)
    expect(r2.subjects).toEqual([])
    // contributions only contains p3 (queried) → excluded → empty coauthors
    expect(r2.coauthors).toEqual([])
  })

  it('applies fromYear/toYear filters', async () => {
    ;(mockPrisma.document.findMany as jest.Mock).mockResolvedValue([
      {
        publicationDateStart: new Date('2010-01-01T00:00:00.000Z'),
        publicationDate: null,
        subjects: [],
        contributions: [
          {
            person: {
              uid: 'p1',
              displayName: 'A',
              normalizedName: 'a',
              firstName: 'A',
              lastName: 'A',
            },
          },
        ],
      },
      {
        publicationDateStart: new Date('2015-06-01T00:00:00.000Z'),
        publicationDate: null,
        subjects: [],
        contributions: [
          {
            person: {
              uid: 'p2',
              displayName: 'B',
              normalizedName: 'b',
              firstName: 'B',
              lastName: 'B',
            },
          },
        ],
      },
      {
        publicationDateStart: null,
        publicationDate: '2020-02',
        subjects: [],
        contributions: [
          {
            person: {
              uid: 'p3',
              displayName: 'C',
              normalizedName: 'c',
              firstName: 'C',
              lastName: 'C',
            },
          },
        ],
      },
    ])

    const res = await dao.fetchDocsForPersonAggregation(['p1', 'p2', 'p3'], {
      fromYear: 2013,
      toYear: 2018,
    })

    // Only 2015 stays in range
    expect(res).toHaveLength(1)
    expect(res[0].year).toBe(2015)
  })
})
