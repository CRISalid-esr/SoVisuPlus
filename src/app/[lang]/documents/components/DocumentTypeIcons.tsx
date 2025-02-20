import { DocumentType } from '@/types/Document'
import ArticleIcon from '@mui/icons-material/Article'
import BookIcon from '@mui/icons-material/Book'
import DescriptionIcon from '@mui/icons-material/Description'
import SchoolIcon from '@mui/icons-material/School'

const DocumentTypeIcons: Record<DocumentType, JSX.Element> = {
  [DocumentType.Document]: <DescriptionIcon />,
  [DocumentType.ScholarlyPublication]: <SchoolIcon />,
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
}

export { DocumentTypeIcons }
