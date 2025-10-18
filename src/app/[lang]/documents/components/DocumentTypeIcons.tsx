import { DocumentType } from '@/types/Document'
import DescriptionIcon from '@mui/icons-material/Description'
import SchoolIcon from '@mui/icons-material/School'
import ArticleIcon from '@mui/icons-material/Article'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import ImportContactsIcon from '@mui/icons-material/ImportContacts'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import NotesIcon from '@mui/icons-material/Notes'
import RateReviewIcon from '@mui/icons-material/RateReview'
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ManageSearchIcon from '@mui/icons-material/ManageSearch'
import { ReactElement } from 'react'

const DocumentTypeIcons: Record<DocumentType, ReactElement> = {
  [DocumentType.Document]: <DescriptionIcon />,
  [DocumentType.ScholarlyPublication]: <SchoolIcon />,
  [DocumentType.Article]: <ArticleIcon />,
  [DocumentType.JournalArticle]: <MenuBookIcon />,
  [DocumentType.Book]: <LibraryBooksIcon />,
  [DocumentType.Monograph]: <ManageSearchIcon />,
  [DocumentType.BookChapter]: <AutoStoriesIcon />,
  [DocumentType.ConferenceArticle]: <RecordVoiceOverIcon />,
  [DocumentType.Proceedings]: <ImportContactsIcon />,
  [DocumentType.ConferenceAbstract]: <NotesIcon />,
  [DocumentType.Preface]: <ContentCopyIcon />,
  [DocumentType.Comment]: <RateReviewIcon />,
  [DocumentType.Presentation]: <RecordVoiceOverIcon />,
  [DocumentType.BookOfChapters]: <CollectionsBookmarkIcon />,
}
export { DocumentTypeIcons }
