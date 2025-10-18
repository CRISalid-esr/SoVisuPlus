import { DocumentType } from '@/types/Document'
import ArticleIcon from '@mui/icons-material/Article'
import BookIcon from '@mui/icons-material/Book'
import DescriptionIcon from '@mui/icons-material/Description'
import SchoolIcon from '@mui/icons-material/School'
import { ReactElement } from 'react'

const DocumentTypeIcons: Record<DocumentType, ReactElement> = {
  [DocumentType.Document]: <DescriptionIcon />,
  [DocumentType.ScholarlyPublication]: <SchoolIcon />,
  [DocumentType.Article]: <ArticleIcon />,
  [DocumentType.JournalArticle]: <ArticleIcon />,
  [DocumentType.Book]: <BookIcon />,
  [DocumentType.Monograph]: <BookIcon />, //TDOO: change icon later
  [DocumentType.BookChapter]: <BookIcon />,
  [DocumentType.ConferenceArticle]: (
    <span className='material-symbols-outlined'>podium</span>
  ),
  [DocumentType.Proceedings]: (
    <span className='material-symbols-outlined'>podium</span>
  ),
  [DocumentType.ConferenceAbstract]: (
    <span className='material-symbols-outlined'>podium</span>
  ),
  [DocumentType.Preface]: <ArticleIcon />,
  [DocumentType.Comment]: <ArticleIcon />,
  [DocumentType.Presentation]: (
    <span className='material-symbols-outlined'>podium</span>
  ),
  [DocumentType.BookOfChapters]: <BookIcon />,
}

export { DocumentTypeIcons }
