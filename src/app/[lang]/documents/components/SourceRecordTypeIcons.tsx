import DescriptionIcon from '@mui/icons-material/Description'
import ArticleIcon from '@mui/icons-material/Article'
import { ReactElement } from 'react'
import { SourceRecordType } from '@prisma/client'
import {
  Assignment,
  Book,
  Dataset,
  EditNote,
  EmojiObjects,
  Feedback,
  Image,
  Mail,
  MapOutlined,
  NoteAlt,
  Plagiarism,
  PlayCircle,
  RequestQuote,
  School,
  Summarize,
  Terminal,
} from '@mui/icons-material'
import SvgIcon from '@mui/material/SvgIcon'
import BlockIcon from '@mui/icons-material/Block'

const Podium = (
  <SvgIcon>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      height='24px'
      viewBox='0 -960 960 960'
      width='24px'
      fill='#e3e3e3'
    >
      <path d='M500-780q0 33-23.5 56.5T420-700q-13 0-24-3.5T374-715q-24 8-38.5 29T321-640h519l-40 280H604v-80h127q5-30 8.5-60t8.5-60H212q5 30 8.5 60t8.5 60h127v80H160l-40-280h120q0-49 27-89t73-59q3-31 26-51.5t54-20.5q33 0 56.5 23.5T500-780ZM391-200h178l23-240H368l23 240Zm-71 80-30-312q-4-35 20-61.5t59-26.5h222q35 0 59 26.5t20 61.5l-30 312H320Z' />
    </svg>
  </SvgIcon>
)

const SourceRecordTypeIcons: Record<SourceRecordType, ReactElement> = {
  [SourceRecordType.Article]: <ArticleIcon />,
  [SourceRecordType.AudiovisualDocument]: <PlayCircle />,
  [SourceRecordType.Book]: <Book />,
  [SourceRecordType.Chapter]: <Book />,
  [SourceRecordType.Document]: <DescriptionIcon />,
  [SourceRecordType.Excerpt]: <Summarize />,
  [SourceRecordType.Letter]: <Mail />,
  [SourceRecordType.Manual]: <Book />,
  [SourceRecordType.Map]: <MapOutlined />,
  [SourceRecordType.Note]: <DescriptionIcon />,
  [SourceRecordType.Patent]: <EmojiObjects />,
  [SourceRecordType.Proceedings]: Podium,
  [SourceRecordType.Standard]: <DescriptionIcon />,
  [SourceRecordType.Thesis]: <School />,
  [SourceRecordType.BlogPost]: <EditNote />,
  [SourceRecordType.ConferenceOutput]: Podium,
  [SourceRecordType.DataPaper]: <Dataset />,
  [SourceRecordType.Lecture]: Podium,
  [SourceRecordType.MasterThesis]: <School />,
  [SourceRecordType.Other]: <ArticleIcon />,
  [SourceRecordType.PeerReview]: <Plagiarism />,
  [SourceRecordType.Report]: <Summarize />,
  [SourceRecordType.ResearchReport]: <ArticleIcon />,
  [SourceRecordType.Software]: <Terminal />,
  [SourceRecordType.TechnicalReport]: <ArticleIcon />,
  [SourceRecordType.BookReview]: <Book />,
  [SourceRecordType.ConferencePaper]: Podium,
  [SourceRecordType.ConferencePoster]: Podium,
  [SourceRecordType.DataManagementPlan]: <Dataset />,
  [SourceRecordType.Dataset]: <Dataset />,
  [SourceRecordType.Editorial]: <Summarize />,
  [SourceRecordType.Erratum]: <Feedback />,
  [SourceRecordType.Image]: <Image />,
  [SourceRecordType.MetadataDocument]: <Assignment />,
  [SourceRecordType.Preprint]: <NoteAlt />,
  [SourceRecordType.ReferenceBook]: <Book />,
  [SourceRecordType.ReviewArticle]: <ArticleIcon />,
  [SourceRecordType.ReviewPaper]: <ArticleIcon />,
  [SourceRecordType.StillImage]: <Image />,
  [SourceRecordType.WorkingPaper]: <NoteAlt />,
  [SourceRecordType.Grant]: <RequestQuote />,
  [SourceRecordType.Work]: <ArticleIcon />,
  [SourceRecordType.Unknown]: <BlockIcon />,
}
export { SourceRecordTypeIcons }
