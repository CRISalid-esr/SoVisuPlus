import {
  DocumentType,
  HalSubmitType,
  PublicationIdentifierType,
  ResearchUnitIdentifierType,
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
import { ResearchUnit } from '@/types/ResearchUnit'
import { Literal } from '@/types/Literal'

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

  it('DocumentRecord isResearchUnitInCollectionCodes function', async () => {
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

    expect(mockDocument.isResearchUnitInCollectionCodes(null)).toEqual(null)

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
        new PersonMembership(
          new ResearchUnit(
            'RS123',
            'ABC',
            [new Literal('Valid Research Unit', 'en')],
            [new Literal('Valid Description', 'en')],
            'ABC_signature',
            [
              { type: ResearchUnitIdentifierType.hal, value: '12345' },
              { type: ResearchUnitIdentifierType.ror, value: '67890' },
            ],
          ),
        ),
        new PersonMembership(
          new ResearchUnit(
            'RS123',
            'DEF',
            [new Literal('Valid Research Unit', 'en')],
            [new Literal('Valid Description', 'en')],
            'DEF_signature',
            [
              { type: ResearchUnitIdentifierType.hal, value: '12345' },
              { type: ResearchUnitIdentifierType.ror, value: '67890' },
            ],
          ),
        ),
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
        new PersonMembership(
          new ResearchUnit(
            'RS123',
            'GHI',
            [new Literal('Valid Research Unit', 'en')],
            [new Literal('Valid Description', 'en')],
            'GHI_signature',
            [
              { type: ResearchUnitIdentifierType.hal, value: '12345' },
              { type: ResearchUnitIdentifierType.ror, value: '67890' },
            ],
          ),
        ),
      ],
    )

    expect(mockDocument.isResearchUnitInCollectionCodes(mockPerson1)).toEqual([
      'ABC',
      'DEF',
    ])
    expect(mockDocument.isResearchUnitInCollectionCodes(mockPerson2)).toEqual(
      null,
    )

    const mockResearchUnit1 = new ResearchUnit(
      'RS123',
      'DEF',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      'DEF_signature',
      [
        { type: ResearchUnitIdentifierType.hal, value: '12345' },
        { type: ResearchUnitIdentifierType.ror, value: '67890' },
      ],
    )

    const mockResearchUnit2 = new ResearchUnit(
      'RS123',
      'GHI',
      [new Literal('Valid Research Unit', 'en')],
      [new Literal('Valid Description', 'en')],
      'GHI_signature',
      [
        { type: ResearchUnitIdentifierType.hal, value: '12345' },
        { type: ResearchUnitIdentifierType.ror, value: '67890' },
      ],
    )

    expect(
      mockDocument.isResearchUnitInCollectionCodes(mockResearchUnit1),
    ).toEqual(['DEF'])
    expect(
      mockDocument.isResearchUnitInCollectionCodes(mockResearchUnit2),
    ).toEqual(null)
  })
})
