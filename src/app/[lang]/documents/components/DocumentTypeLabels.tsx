import { Typography } from '@mui/material'
import { t } from '@lingui/macro'

import { DocumentType } from '@/types/Document'

export const DocumentTypeLabels: Record<DocumentType, JSX.Element> = {
  [DocumentType.Document]: (
    <Typography>{t`documents_page_document_icon_label`}</Typography>
  ),
  [DocumentType.ScholarlyPublication]: (
    <Typography>{t`documents_page_scholarly_publication_icon_label`}</Typography>
  ),
  [DocumentType.JournalArticle]: (
    <Typography>{t`documents_page_journal_article_icon_label`}</Typography>
  ),
  [DocumentType.Book]: (
    <Typography>{t`documents_page_book_icon_label`}</Typography>
  ),
  [DocumentType.Monograph]: (
    <Typography>{t`documents_page_monograph_icon_label`}</Typography>
  ),
  [DocumentType.BookChapter]: (
    <Typography>{t`documents_page_book_chapter_icon_label`}</Typography>
  ),
  [DocumentType.ConferenceArticle]: (
    <Typography>{t`documents_page_conference_article_icon_label`}</Typography>
  ),
  [DocumentType.Proceedings]: (
    <Typography>{t`documents_page_proceedings_icon_label`}</Typography>
  ),
}
