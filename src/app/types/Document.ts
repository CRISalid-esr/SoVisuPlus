import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Concept, ConceptJson } from '@/types/Concept'
import { Contribution, ContributionJson } from '@/types/Contribution'
import { DocumentRecord, DocumentRecordJson } from '@/types/DocumentRecord'
import { Literal } from '@/types/Literal'
import { getStringInLocale } from '@/utils/getStringInLocale'
import { Journal, JournalJson } from '@/types/Journal'
import { DocumentState, DocumentType, OAStatus } from '@prisma/client'
import { Authorizable, AuthorizationProperties } from '@/types/authorizable'

interface DocumentJson {
  uid: string
  documentType: string
  oaStatus: string | null
  publicationDate: string | null
  publicationDateStart: Date | null
  publicationDateEnd: Date | null
  upwOAStatus: string | null
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

class Document implements Authorizable {
  constructor(
    public uid: string,
    public documentType: DocumentType = DocumentType.Document,
    public oaStatus: OAStatus | null,
    public publicationDate: string | null,
    public publicationDateStart: Date | null,
    public publicationDateEnd: Date | null,
    public upwOAStatus: OAStatus | null,
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

  static oaStatusFromString(statusString: string | null): OAStatus | null {
    const convertStatus = statusString?.toUpperCase()
    return convertStatus == 'GREEN' ? (convertStatus as OAStatus) : null
  }

  static upwOAStatusFromString(statusString: string | null): OAStatus | null {
    const convertStatus = statusString?.toUpperCase()
    const valid = convertStatus
      ? (Object.values(OAStatus) as string[]).includes(convertStatus)
      : false
    return valid ? (convertStatus as OAStatus) : null
  }

  static fromJson(document: DocumentJson): Document {
    return new Document(
      document.uid,
      Document.documentTypeFromString(document.documentType),
      Document.oaStatusFromString(document.oaStatus),
      document.publicationDate,
      document.publicationDateStart,
      document.publicationDateEnd,
      Document.upwOAStatusFromString(document.upwOAStatus),
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
      Document.oaStatusFromString(document.oaStatus),
      document.publicationDate,
      document.publicationDateStart,
      document.publicationDateEnd,
      Document.upwOAStatusFromString(document.upwOAStatus),
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
        ?.flatMap((c) => c.person?.memberships?.map((m) => m.researchUnit?.uid))
        ?.filter((x): x is string => !!x) ?? []
    const persons =
      this.contributions
        ?.map((c) => c.person?.uid)
        .filter((x): x is string => !!x) ?? []
    return {
      ResearchUnit: Array.from(new Set(rs)),
      Person: Array.from(new Set(persons)),
    }
  }

  get authzProperties(): AuthorizationProperties {
    return {
      __type: 'Document',
      perimeter: this.computeScope(),
      state: this.state,
      documentType: this.documentType,
    }
  }

  public hasBeenUpdated() {
    /***TODO
    const halRecord = this.records.find(
      (record) => record.platform === BibliographicPlatform.HAL,
    )
    if(toUTCISOString(this.publicationDate) != halRecord?.publicationDate){
      return true
    }
    if(this.titles.find((title)=> !halRecord?.titles.find((t) => (t.language == title.language) && (t.value == title.value)))){
      return true
    }
      ***/
    return false
  }
}

const isDocument = (x: unknown): x is Document => x instanceof Document

export { Document, DocumentType, DocumentState, isDocument }
