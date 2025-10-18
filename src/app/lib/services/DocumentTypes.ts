import { DocumentType } from '@/types/Document'

export const DOCUMENT_TYPES: Record<DocumentType, DocumentType[]> = {
  [DocumentType.Document]: [DocumentType.ScholarlyPublication],

  [DocumentType.ScholarlyPublication]: [
    DocumentType.Article,
    DocumentType.Book,
    DocumentType.Presentation,
  ],

  // --- Article branch ----------------------------------------------------
  [DocumentType.Article]: [
    DocumentType.JournalArticle,
    DocumentType.ConferenceArticle,
    DocumentType.ConferenceAbstract,
    DocumentType.Preface,
    DocumentType.Comment,
    DocumentType.BookChapter,
  ],

  // --- Book branch -------------------------------------------------------
  [DocumentType.Book]: [
    DocumentType.Monograph,
    DocumentType.Proceedings,
    DocumentType.BookOfChapters,
  ],

  // --- Presentation branch -----------------
  [DocumentType.Presentation]: [],

  // --- Leaves ------------------------------------------------------------
  [DocumentType.JournalArticle]: [],
  [DocumentType.ConferenceArticle]: [],
  [DocumentType.ConferenceAbstract]: [],
  [DocumentType.Preface]: [],
  [DocumentType.Comment]: [],
  [DocumentType.BookChapter]: [],
  [DocumentType.Monograph]: [],
  [DocumentType.Proceedings]: [],
  [DocumentType.BookOfChapters]: [],
}
