import {
  DocumentType,
  HalSubmitType,
  OrganizationCategory,
  OrganizationGenericType,
  OrganizationIdentifierType,
  PublicationIdentifierType,
  SourceRecordType,
} from '@prisma/client'
import { DocumentRecord } from '@/types/DocumentRecord'
import { LocRelator } from '@/types/LocRelator'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { PublicationIdentifier } from '@/types/PublicationIdentifier'
import { Person } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { PersonMembership } from '@/types/PersonMembership'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'

const makeResearchUnit = (
  uid: string,
  acronym: string,
  halCollection: string | null = null,
) =>
  new OrganizationUnit(
    uid,
    acronym,
    [new Literal('Valid Research Unit', 'en')],
    [new Literal('Valid Description', 'en')],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
    null,
    [
      { type: OrganizationIdentifierType.hal, value: '12345' },
      { type: OrganizationIdentifierType.ror, value: '67890' },
    ],
    null,
    false,
    [],
    false,
    false,
    halCollection,
  )

describe('DocumentRecord type', () => {
  it('should convert source record type from string to the right SourceRecordType or to SourceRecordType.Document if unknown', async () => {
    expect(DocumentRecord.sourceRecordTypeFromString('Book')).toEqual(
      SourceRecordType.Book,
    )
    expect(
      DocumentRecord.sourceRecordTypeFromString('ScientificArticle'),
    ).toEqual(SourceRecordType.Document)
  })

  it('DocumentRecord from Json', async () => {
    const mockJson = {
      uid: 'hal-123',
      sourceIdentifier: 'hal0001',
      identifiers: [
        {
          type: 'hal',
          value: 'hal-0001',
        },
      ],
      contributions: [
        {
          role: LocRelator.AUTHOR,
          person: {
            uid: 'hal-001',
            name: 'Mary Dupuis',
            source: 'hal',
            sourceId: 'hal/001',
            identifiers: [],
          },
        },
      ],
      documentTypes: ['Document', 'Book'],
      publicationDate: new Date('2022-01-01T00:00:00.000Z'),
      platform: BibliographicPlatform.HAL,
      titles: [],
      _url: 'https://example.com',
      halCollectionCodes: [],
      halSubmitType: null,
    }

    const mockDocument = new DocumentRecord(
      'hal-123',
      'hal0001',
      [new PublicationIdentifier(PublicationIdentifierType.hal, 'hal-0001')],
      [
        new SourceContribution(
          LocRelator.AUTHOR,
          new SourcePerson('hal-001', 'Mary Dupuis', 'hal', 'hal/001'),
        ),
      ],
      [SourceRecordType.Document, SourceRecordType.Book],
      new Date('2022-01-01T00:00:00.000Z'),
      BibliographicPlatform.HAL,
      [],
      'https://example.com',
      [],
      null,
    )

    expect(DocumentRecord.fromObject(mockJson)).toEqual(mockDocument)
  })

  it('DocumentRecord from database', async () => {
    const dbDocument = {
      id: 1,
      uid: 'hal-123',
      sourceIdentifier: 'hal0001',
      identifiers: [],
      url: 'https://example.com',
      contributions: [],
      documentTypes: [DocumentType.Document, DocumentType.Book],
      publicationDate: new Date('2022-01-01T00:00:00.000Z'),
      platform: BibliographicPlatform.HAL,
      titles: [],
      halCollectionCodes: [],
      halSubmitType: HalSubmitType.file,
      documentId: 1,
      sourceJournalId: null,
      journal: null,
    }

    const mockDocument = new DocumentRecord(
      'hal-123',
      'hal0001',
      [],
      [],
      [SourceRecordType.Document, SourceRecordType.Book],
      new Date('2022-01-01T00:00:00.000Z'),
      BibliographicPlatform.HAL,
      [],
      'https://example.com',
      [],
      HalSubmitType.file,
    )

    expect(DocumentRecord.fromDbDocumentRecord(dbDocument)).toEqual(
      mockDocument,
    )
  })

  it('DocumentRecord matchingHalCollectionLabels function', async () => {
    const mockDocument = new DocumentRecord(
      'hal-123',
      'hal0001',
      [],
      [],
      [SourceRecordType.Document, SourceRecordType.Book],
      new Date('2022-01-01T00:00:00.000Z'),
      BibliographicPlatform.HAL,
      [],
      'https://example.com',
      ['ABC', 'DEF'],
      HalSubmitType.file,
    )

    expect(mockDocument.matchingHalCollectionLabels(null)).toEqual(null)

    const mockPerson1 = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097'),
        new PersonIdentifier(PersonIdentifierType.local, '12345'),
      ],
      [
        new PersonMembership(makeResearchUnit('RS123', 'U-ABC', 'ABC')),
        new PersonMembership(makeResearchUnit('RS123', 'U-DEF', 'DEF')),
        new PersonMembership(makeResearchUnit('RS123', 'NOCOLL')),
      ],
    )

    const mockPerson2 = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000-0002-1825-0097'),
        new PersonIdentifier(PersonIdentifierType.local, '12345'),
      ],
      [
        new PersonMembership(makeResearchUnit('RS123', 'U-GHI', 'GHI')),
        // acronym equal to a collection code but no HAL collection: no match
        new PersonMembership(makeResearchUnit('RS123', 'ABC')),
      ],
    )

    expect(mockDocument.matchingHalCollectionLabels(mockPerson1)).toEqual([
      'U-ABC',
      'U-DEF',
    ])
    expect(mockDocument.matchingHalCollectionLabels(mockPerson2)).toEqual(null)

    const mockPerson3 = new Person(
      'P456',
      true,
      'example@example.com',
      'Jane Doe',
      'Jane',
      'Doe',
      [],
      [
        // ended membership: ignored
        new PersonMembership(
          makeResearchUnit('RS1', 'U-ABC', 'ABC'),
          null,
          'Mon Jan 01 2001',
        ),
        // membership ending in the future: current
        new PersonMembership(
          makeResearchUnit('RS2', 'U-DEF', 'DEF'),
          null,
          'Fri Jan 01 2999',
        ),
      ],
    )

    expect(mockDocument.matchingHalCollectionLabels(mockPerson3)).toEqual([
      'U-DEF',
    ])

    const mockResearchUnit1 = makeResearchUnit('RS123', 'U-DEF', 'DEF')

    const mockResearchUnit2 = makeResearchUnit('RS123', 'U-GHI', 'GHI')

    const mockResearchUnit3 = makeResearchUnit('RS123', 'DEF')

    expect(mockDocument.matchingHalCollectionLabels(mockResearchUnit1)).toEqual(
      ['U-DEF'],
    )
    expect(mockDocument.matchingHalCollectionLabels(mockResearchUnit2)).toEqual(
      null,
    )
    expect(mockDocument.matchingHalCollectionLabels(mockResearchUnit3)).toEqual(
      null,
    )
  })

  it.each([
    [OrganizationCategory.team, OrganizationGenericType.team],
    [OrganizationCategory.institution, OrganizationGenericType.institution],
  ])(
    'matches HAL collections of any structure perspective (%s)',
    (category, genericType) => {
      const record = new DocumentRecord(
        'hal-123',
        'hal0001',
        [],
        [],
        [SourceRecordType.Document],
        new Date('2022-01-01T00:00:00.000Z'),
        BibliographicPlatform.HAL,
        [],
        'https://example.com',
        ['ABC'],
        HalSubmitType.file,
      )
      const structure = new OrganizationUnit(
        'S1',
        'S-ABC',
        [],
        [],
        category,
        genericType,
        null,
        [],
        null,
        false,
        [],
        false,
        false,
        'ABC',
      )

      expect(record.matchingHalCollectionLabels(structure)).toEqual(['S-ABC'])
    },
  )
})
