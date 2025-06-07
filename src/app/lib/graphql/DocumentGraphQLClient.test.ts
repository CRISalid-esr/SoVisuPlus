import { DocumentGraphQLClient } from './DocumentGraphQLClient'
import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document, DocumentType } from '@/types/Document'
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
import { Concept } from '@/types/Concept'

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
          has_subjects: [
            {
              uid: 'concept-1234',
              uri: 'http://example.com/concept/1234',
              pref_labels: [
                { language: 'en', value: 'Concept preferred label' },
              ],
              alt_labels: [{ language: 'en', value: 'Concept alt label' }],
            },
          ],
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
              hal_collection_codes: null,
              hal_submit_type: null,
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
        new Concept(
          'concept-1234',
          [
            Literal.fromObject({
              language: 'en',
              value: 'Concept preferred label',
            }),
          ],
          [Literal.fromObject({ language: 'en', value: 'Concept alt label' })],
          'http://example.com/concept/1234',
        ),
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
          has_subjects: [
            {
              uid: 'concept-5678',
              url: 'http://example.com/concept/5678',
              pref_labels: [
                { language: 'en', value: 'Concept preferred label' },
              ],
              alt_labels: [{ language: 'en', value: 'Concept alt label' }],
            },
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

  test('should return a document with hal custom fields', async () => {
    const mockResponse = {
      documents: [
        {
          uid: '28c1e1da-83ce-4bdb-b2ea-f3ab78076d99',
          document_type: 'BookChapter',
          publication_date: '2017',
          publication_date_start: '2017-01-01T00:00:00.000Z',
          publication_date_end: '2017-12-31T23:59:59.000Z',
          titles: [
            {
              value:
                'La tentation du risque : analyse du comportement des étudiants de l’Université d’Angers. Addictions : déterminants et complémentarités',
              language: 'fr',
            },
          ],
          abstracts: [],
          has_subjects: [
            {
              uid: 'http://www.wikidata.org/entity/Q42745330',
              uri: 'http://www.wikidata.org/entity/Q42745330',
              pref_labels: [
                { value: 'Addictions', language: 'en' },
                { value: 'Addictions', language: 'fr' },
              ],
              alt_labels: [],
            },
          ],
          has_contributions: [],
          recorded_by: [
            {
              uid: 'scanr-halhal-02538579',
              harvester: 'scanr',
              titles: [
                {
                  value:
                    'La tentation du risque : analyse du comportement des étudiants de l’Université d’Angers. Addictions : déterminants et complémentarités',
                  language: 'fr',
                },
              ],
              hal_collection_codes: [],
              hal_submit_type: null,
              url: 'https://scanr.enseignementsup-recherche.gouv.fr/publications/halhal-02538579',
            },
            {
              uid: 'hal-hal-02538579',
              harvester: 'hal',
              titles: [
                {
                  value:
                    'La tentation du risque : analyse du comportement des étudiants de l’Université d’Angers. Addictions : déterminants et complémentarités',
                  language: 'fr',
                },
              ],
              hal_collection_codes: [
                'SHS',
                'UNIV-NANTES',
                'UR2-HB',
                'CNRS',
                'UNIV-ANGERS',
                'UNIV-LEMANS',
                'LEMNA',
                'UNAM',
                'GRANEM',
                'COMUE-NORMANDIE',
                'ESO',
                'AGREENIUM',
                'UNIV-RENNES2',
                'ESO-ANGERS',
                'UNIV-RENNES',
                'UNICAEN',
                'LPPL',
                'IGARUN',
                'TEST-HALCNRS',
                'NANTES-UNIVERSITE',
                'UNIV-NANTES-AV2022',
                'INSTITUT-AGRO',
              ],
              hal_submit_type: 'notice',
              url: 'https://hal.science/hal-02538579',
            },
          ],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const document = await client.getDocumentByUid(
      '28c1e1da-83ce-4bdb-b2ea-f3ab78076d99',
    )

    const halRecord = document?.records.find((r) => r.platform === 'hal')
    expect(halRecord).toBeDefined()
    expect(halRecord?.halCollectionCodes).toContain('UNIV-NANTES')
    expect(halRecord?.halSubmitType).toBe('notice')

    const scanrRecord = document?.records.find((r) => r.platform === 'scanr')
    expect(scanrRecord).toBeDefined()
    expect(scanrRecord?.halCollectionCodes).toEqual([])
    expect(scanrRecord?.halSubmitType).toBeNull()
  })
  test('should return a document with journal metadata and publication details', async () => {
    const mockResponse = {
      documents: [
        {
          uid: '6b3355cd-35b2-40ae-bfbe-5e8a60deb47f',
          document_type: 'JournalArticle',
          publication_date: '2012-06-07',
          publication_date_start: '2012-06-07T00:00:00.000Z',
          publication_date_end: '2012-06-07T23:59:59.000Z',
          titles: [
            {
              language: 'en',
              value:
                'Amino acid substitutions in the Candida albicans sterol 5,6-desaturase (Erg3p) confer azole resistance: characterization of two novel mutants with impaired virulence',
            },
          ],
          abstracts: [],
          has_subjects: [],
          has_contributions: [],
          publishedInConnection: {
            edges: [
              {
                properties: {
                  volume: '67',
                  issue: '9',
                  pages: '',
                },
                node: {
                  issn_l: '0305-7453',
                  publisher: 'Oxford University Press (OUP)',
                  titles: ['The journal of antimicrobial chemotherapy.'],
                  identifiers: [
                    {
                      type: 'issn',
                      value: '1460-2091',
                      format: 'Online',
                    },
                    {
                      type: 'issn',
                      value: '0305-7453',
                      format: 'Print',
                    },
                  ],
                },
              },
            ],
          },
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const document = await client.getDocumentByUid(
      '6b3355cd-35b2-40ae-bfbe-5e8a60deb47f',
    )

    expect(document?.journal).toBeDefined()
    expect(document?.journal?.issnL).toBe('0305-7453')
    expect(document?.journal?.publisher).toBe('Oxford University Press (OUP)')
    expect(document?.journal?.identifiers).toHaveLength(2)
    expect(document?.journal?.titles).toContain(
      'The journal of antimicrobial chemotherapy.',
    )
    expect(document?.volume).toBe('67')
    expect(document?.issue).toBe('9')
    expect(document?.pages).toBe('')
  })
})
