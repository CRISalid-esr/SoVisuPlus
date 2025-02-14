import { DocumentGraphQLClient } from './DocumentGraphQLClient'
import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document } from '@/types/Document'
import { Contribution } from '@/types/Contribution'
import { PersonGraphQLClient } from './PersonGraphQLClient'
import { LocRelatorHelper } from '@/types/LocRelator'
import { DocumentRecord } from '@/types/DocumentRecord'
import {
  BibliographicPlatform,
  getBibliographicPlatformByNameIgnoreCase,
} from '@/types/BibliographicPlatform'
import { Literal } from '@/types/Literal'
import { Person } from '@/types/Person'
import { DocumentType } from '@prisma/client'

jest.mock('./AbstractGraphQLClient')
jest.mock('./PersonGraphQLClient')

describe('DocumentGraphQLClient', () => {
  let client: DocumentGraphQLClient
  let mockQuery: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    client = new DocumentGraphQLClient()
    const abstractClient = client as unknown as AbstractGraphQLClient
    mockQuery = abstractClient.query as jest.Mock
  })

  test('should return null if no document matches the UID', async () => {
    mockQuery.mockResolvedValue({ documents: [] })

    const document = await client.getDocumentByUid('doc-123')

    expect(document).toBeNull()
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        uid_EQ: 'doc-123',
      },
    })
  })

  test('should return a hydrated document object if a match is found', async () => {
    const mockResponse = {
      documents: [
        {
          uid: 'doc-456',
          document_type: 'ConferenceArticle',
          publication_date: '2022-01-01',
          publication_date_start: '2022-01-01',
          publication_date_end: '2022-12-31',
          titles: [{ language: 'en', value: 'Test Document' }],
          abstracts: [{ language: 'en', value: 'This is a test abstract.' }],
          has_contributions: [
            {
              roles: ['http://example.com/relator/author'],
              contributor: [{ uid: 'person-123', display_name: 'John Doe' }],
            },
          ],
          recorded_by: [
            {
              uid: 'record-001',
              url: 'http://platform.com/record/record-001',
              harvester: 'idref',
              titles: [{ language: 'en', value: 'Record Title' }],
            },
          ],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const mockPerson: Person = new Person(
      'person-123',
      false,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [],
    )
    jest
      .spyOn(PersonGraphQLClient.prototype, 'hydrate')
      .mockReturnValue(mockPerson)

    const document = await client.getDocumentByUid('doc-456')

    const expectedDocument = new Document(
      'doc-456',
      DocumentType.ConferenceArticle,
      '2022-01-01',
      new Date('2022-01-01'),
      new Date('2022-12-31'),
      [Literal.fromObject({ language: 'en', value: 'Test Document' })],
      [
        Literal.fromObject({
          language: 'en',
          value: 'This is a test abstract.',
        }),
      ],
      [
        new Contribution(
          mockPerson,
          [
            LocRelatorHelper.fromURI('http://example.com/relator/author'),
          ].filter((role) => role !== null),
        ),
      ],
      [
        new DocumentRecord(
          'record-001',
          getBibliographicPlatformByNameIgnoreCase('idref') ??
            ({ name: 'idref' } as unknown as BibliographicPlatform),
          [Literal.fromObject({ language: 'en', value: 'Record Title' })],
          'http://platform.com/record/record-001',
        ),
      ],
    )

    expect(document).toEqual(expectedDocument)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        uid_EQ: 'doc-456',
      },
    })
  })

  test('should filter out contributions with no contributors', async () => {
    const mockResponse = {
      documents: [
        {
          uid: 'doc-789',
          document_type: 'Monograph',
          publication_date: null,
          publication_date_start: null,
          publication_date_end: null,
          titles: [{ language: 'en', value: 'Filtered Document' }],
          abstracts: [
            { language: 'en', value: 'This is another test abstract.' },
          ],
          has_contributions: [
            {
              roles: ['http://example.com/relator/author'],
              contributor: [],
            },
          ],
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const document = await client.getDocumentByUid('doc-789')

    expect(document).not.toBeNull()
    expect(document?.contributions).toHaveLength(0)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        uid_EQ: 'doc-789',
      },
    })
  })
})
