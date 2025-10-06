import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Concept, ConceptJson } from '@/types/Concept'
import { Contribution, ContributionJson } from '@/types/Contribution'
import { DocumentRecord, DocumentRecordJson } from '@/types/DocumentRecord'
import { Literal } from '@/types/Literal'
import { getStringInLocale } from '@/utils/getStringInLocale'
import { Journal, JournalJson } from '@/types/Journal'
import { DocumentState } from '@prisma/client'
import { Authorizable, AuthorizationSubject } from '@/types/authorizable'

interface DocumentJson {
  uid: string
  documentType: string
  publicationDate: string | null
  publicationDateStart: Date | null
  publicationDateEnd: Date | null
  titles: Array<Literal>
  abstracts: Array<Literal>
  subjects: Array<Concept>
  contributions: Array<ContributionJson>
  records: Array<DocumentRecordJson>
  state: DocumentState
  journal?: JournalJson
  volume?: string
  issue?: string
  pages?: string
}

enum DocumentType {
  Document = 'Document',
  ScholarlyPublication = 'ScholarlyPublication',
  JournalArticle = 'JournalArticle',
  Book = 'Book',
  Monograph = 'Monograph',
  BookChapter = 'BookChapter',
  ConferenceArticle = 'ConferenceArticle',
  Proceedings = 'Proceedings',
}

class Document implements Authorizable {
  constructor(
    public uid: string,
    public documentType: DocumentType = DocumentType.Document,
    public publicationDate: string | null,
    public publicationDateStart: Date | null,
    public publicationDateEnd: Date | null,
    public titles: Array<Literal>,
    public abstracts: Array<Literal>,
    public subjects: Array<Concept>,
    public contributions: Array<Contribution> = [],
    public records: Array<DocumentRecord> = [],
    public state: DocumentState = DocumentState.default,
    public journal?: Journal,
    public volume?: string,
    public issue?: string,
    public pages?: string,
  ) {}

  getTitleInLocale(localeNumber: number): string {
    return getStringInLocale(this.titles, localeNumber)
  }

  /**
   * Convert a string to a valid DocumentType or return DocumentType.Document as default
   * @param typeString - The string representation of the document type
   * @returns A valid DocumentType
   */
  static documentTypeFromString(typeString: string): DocumentType {
    return (Object.values(DocumentType) as string[]).includes(typeString)
      ? (typeString as DocumentType)
      : DocumentType.Document
  }

  static fromJson(document: DocumentJson): Document {
    return new Document(
      document.uid,
      Document.documentTypeFromString(document.documentType),
      document.publicationDate,
      document.publicationDateStart,
      document.publicationDateEnd,
      document.titles.map((title) => Literal.fromObject(title)),
      document.abstracts.map((abstract) => Literal.fromObject(abstract)),
      document.subjects.map((subject: ConceptJson) =>
        Concept.fromObject(subject),
      ),
      document.contributions.map((contribution: ContributionJson) =>
        Contribution.fromObject(contribution),
      ),
      document.records.map((record: DocumentRecordJson) =>
        DocumentRecord.fromObject(record),
      ),
      document.state,
      document.journal ? Journal.fromJson(document.journal) : undefined,
      document.volume || undefined,
      document.issue || undefined,
      document.pages || undefined,
    )
  }

  static fromDbDocument(document: DbDocument): Document {
    return new Document(
      document.uid,
      Document.documentTypeFromString(document.documentType),
      document.publicationDate,
      document.publicationDateStart,
      document.publicationDateEnd,
      document.titles.map((title) => Literal.fromObject(title)),
      document.abstracts.map((abstract) => Literal.fromObject(abstract)),
      document.subjects.map((subject) => Concept.fromDbConcept(subject)),
      document.contributions.map((contribution) =>
        Contribution.fromDbContribution(contribution),
      ),
      document.records.map((record) =>
        DocumentRecord.fromDbDocumentRecord(record),
      ),
      document.state,
      document.journal ? Journal.fromDbJournal(document.journal) : undefined,
      document.volume || undefined,
      document.issue || undefined,
      document.pages || undefined,
    )
  }

  private computeScope() {
    const rs =
      this.contributions
        ?.flatMap((c) =>
          c.person?.memberships?.map((m) => m.researchStructure?.uid),
        )
        ?.filter((x): x is string => !!x) ?? []
    const persons =
      this.contributions
        ?.map((c) => c.person?.uid)
        .filter((x): x is string => !!x) ?? []
    return {
      ResearchStructure: Array.from(new Set(rs)),
      Person: Array.from(new Set(persons)),
    }
  }

  toAuthz(): AuthorizationSubject {
    return {
      __type: 'Document',
      perimeter: this.computeScope(),
      state: this.state,
      documentType: this.documentType,
    }
  }
}

const isDocument = (x: unknown): x is Document => x instanceof Document

export { Document, DocumentType, DocumentState, isDocument }
