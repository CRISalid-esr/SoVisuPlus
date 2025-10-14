import { defineMessage } from '@lingui/macro'

import { DocumentType } from '@/types/Document'
import { MessageDescriptor } from '@lingui/core'

export const DocumentTypeLabels: Record<DocumentType, MessageDescriptor> = {
  [DocumentType.Document]: defineMessage`documents_page_document_icon_label`,
  [DocumentType.ScholarlyPublication]: defineMessage`documents_page_scholarly_publication_icon_label`,
  [DocumentType.JournalArticle]: defineMessage`documents_page_journal_article_icon_label`,
  [DocumentType.Book]: defineMessage`documents_page_book_icon_label`,
  [DocumentType.Monograph]: defineMessage`documents_page_monograph_icon_label`,
  [DocumentType.BookChapter]: defineMessage`documents_page_book_chapter_icon_label`,
  [DocumentType.ConferenceArticle]: defineMessage`documents_page_conference_article_icon_label`,
  [DocumentType.Proceedings]: defineMessage`documents_page_proceedings_icon_label`,
}
