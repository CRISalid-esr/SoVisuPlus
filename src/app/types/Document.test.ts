import { Document } from './Document'
import {
  DocumentState,
  DocumentType,
  HalSubmitType,
  LabelType,
  OAStatus,
} from '@prisma/client'
import { Literal } from '@/types/Literal'
import { Concept } from '@/types/Concept'
import { DocumentRecord } from '@/types/DocumentRecord'
import { LocRelator } from '@/types/LocRelator'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { Journal } from '@/types/Journal'
import { PublicationIdentifier } from '@/types/PublicationIdentifier'

describe('Document type', () => {
  it('should convert document type from string to the right DocumentType or to DocumentType.Document if unknown', async () => {
    expect(Document.documentTypeFromString('Book')).toEqual(DocumentType.Book)
    expect(Document.documentTypeFromString('ScientificArticle')).toEqual(
      DocumentType.Document,
    )
  })

  it('should convert open access status from string to OAStatus.GREEN regardless the case, to null in other cases', async () => {
    expect(Document.oaStatusFromString('green')).toEqual(OAStatus.GREEN)
    expect(Document.oaStatusFromString('GREEN')).toEqual(OAStatus.GREEN)
    expect(Document.oaStatusFromString('DIAMOND')).toEqual(null)
    expect(Document.oaStatusFromString('hello')).toEqual(null)
  })

  it('should convert unpaywall open access status from string to the right OAStatus regardless the case, to null in other cases', async () => {
    expect(Document.upwOAStatusFromString('green')).toEqual(OAStatus.GREEN)
    expect(Document.upwOAStatusFromString('GREEN')).toEqual(OAStatus.GREEN)
    expect(Document.upwOAStatusFromString('diamond')).toEqual(OAStatus.DIAMOND)
    expect(Document.upwOAStatusFromString('DIAMOND')).toEqual(OAStatus.DIAMOND)
    expect(Document.upwOAStatusFromString('gold')).toEqual(OAStatus.GOLD)
    expect(Document.upwOAStatusFromString('GOLD')).toEqual(OAStatus.GOLD)
    expect(Document.upwOAStatusFromString('bronze')).toEqual(OAStatus.BRONZE)
    expect(Document.upwOAStatusFromString('BRONZE')).toEqual(OAStatus.BRONZE)
    expect(Document.upwOAStatusFromString('hybrid')).toEqual(OAStatus.HYBRID)
    expect(Document.upwOAStatusFromString('HYBRID')).toEqual(OAStatus.HYBRID)
    expect(Document.upwOAStatusFromString('other')).toEqual(OAStatus.OTHER)
    expect(Document.upwOAStatusFromString('OTHER')).toEqual(OAStatus.OTHER)
    expect(Document.upwOAStatusFromString('closed')).toEqual(OAStatus.CLOSED)
    expect(Document.upwOAStatusFromString('CLOSED')).toEqual(OAStatus.CLOSED)
    expect(Document.upwOAStatusFromString('hello')).toEqual(null)
  })

  it('Document from Json', async () => {
    const mockJson = {
      uid: 'doc001',
      documentType: 'Book',
      oaStatus: 'green',
      publicationDate: '2022-01-01T00:00:00.000Z',
      publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
      publicationDateEnd: new Date('2022-01-01T00:00:00.000Z'),
      upwOAStatus: 'diamond',
      titles: [new Literal('Study on deep and shallow water platform', 'en')],
      abstracts: [new Literal('Deep and shallow water platform', 'en')],
      subjects: [
        new Concept('concept0007', [], [], 'http://example.com/concept0007'),
      ],
      contributions: [],
      records: [
        {
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
        },
      ],
      state: DocumentState.default,
      journal: {
        title: 'Nature',
        issnL: 'issnL001',
        publisher: 'Nature Editions',
        identifiers: [],
      },
      volume: '24',
      issue: '9',
      pages: '2',
    }

    const mockDocument = new Document(
      'doc001',
      DocumentType.Book,
      OAStatus.GREEN,
      '2022-01-01T00:00:00.000Z',
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-01-01T00:00:00.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Study on deep and shallow water platform', 'en')],
      [new Literal('Deep and shallow water platform', 'en')],
      [new Concept('concept0007', [], [], 'http://example.com/concept0007')],
      [],
      [
        new DocumentRecord(
          'hal-123',
          'hal0001',
          [new PublicationIdentifier('hal', 'hal-0001')],
          [
            new SourceContribution(
              LocRelator.AUTHOR,
              new SourcePerson('hal-001', 'Mary Dupuis', 'hal', 'hal/001'),
            ),
          ],
          [DocumentType.Document, DocumentType.Book],
          new Date('2022-01-01T00:00:00.000Z'),
          BibliographicPlatform.HAL,
          [],
          'https://example.com',
          [],
          null,
        ),
      ],
      DocumentState.default,
      new Journal('Nature', 'issnL001', 'Nature Editions', []),
      '24',
      '9',
      '2',
    )

    expect(Document.fromJson(mockJson)).toEqual(mockDocument)
  })

  it('Document from database', async () => {
    const dbDocument = {
      id: 1,
      uid: 'doc001',
      documentType: DocumentType.Book,
      oaStatus: OAStatus.GREEN,
      publicationDate: '2022-01-01T00:00:00.000Z',
      publicationDateStart: new Date('2022-01-01T00:00:00.000Z'),
      publicationDateEnd: new Date('2022-01-01T00:00:00.000Z'),
      upwOAStatus: OAStatus.DIAMOND,
      titles: [
        {
          id: 1,
          documentId: 1,
          language: 'en',
          value: 'Study on deep and shallow water platform',
        },
      ],
      abstracts: [
        {
          id: 1,
          documentId: 1,
          language: 'en',
          value: 'Deep and shallow water platform',
        },
      ],
      subjects: [
        {
          id: 1,
          uid: 'concept0007',
          uri: 'http://example.com/concept0007',
          labels: [
            {
              id: 1,
              conceptId: 1,
              language: 'en',
              value: 'Platform',
              type: LabelType.PREF,
            },
          ],
        },
      ],
      contributions: [],
      title_locale_0: null,
      title_locale_1: null,
      title_locale_2: null,
      records: [
        {
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
        },
      ],
      state: DocumentState.default,
      journalId: null,
      journal: null,
      volume: null,
      issue: null,
      pages: null,
    }

    const mockDocument = new Document(
      'doc001',
      DocumentType.Book,
      OAStatus.GREEN,
      '2022-01-01T00:00:00.000Z',
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-01-01T00:00:00.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Study on deep and shallow water platform', 'en')],
      [new Literal('Deep and shallow water platform', 'en')],
      [
        new Concept(
          'concept0007',
          [new Literal('Platform', 'en')],
          [],
          'http://example.com/concept0007',
        ),
      ],
      [],
      [
        new DocumentRecord(
          'hal-123',
          'hal0001',
          [],
          [],
          [DocumentType.Document, DocumentType.Book],
          new Date('2022-01-01T00:00:00.000Z'),
          BibliographicPlatform.HAL,
          [],
          'https://example.com',
          [],
          HalSubmitType.file,
        ),
      ],
      DocumentState.default,
    )

    expect(Document.fromDbDocument(dbDocument)).toEqual(mockDocument)
  })
})
