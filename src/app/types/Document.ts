import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { getStringInLocale } from '@/utils/getStringInLocale'
import { DocumentRecord } from '@/types/DocumentRecord'
import { Concept } from '@/types/Concept'

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

class Document {
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
}

export { Document, DocumentType }
