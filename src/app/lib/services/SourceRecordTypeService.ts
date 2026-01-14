import { SourceRecordType } from '@prisma/client'

export const SOURCE_RECORD_TYPE_ORDER: SourceRecordType[] = [
  SourceRecordType.Unknown,
  SourceRecordType.Other,
  SourceRecordType.Work,
  SourceRecordType.Document,
  SourceRecordType.Book,
  SourceRecordType.ReferenceBook,
  SourceRecordType.ConferenceOutput,
  SourceRecordType.Proceedings,
  SourceRecordType.ConferencePaper,
  SourceRecordType.Manual,
  SourceRecordType.Chapter,
  SourceRecordType.ConferencePoster,
  SourceRecordType.Article,
  SourceRecordType.Thesis,
  SourceRecordType.ReviewPaper,
  SourceRecordType.PeerReview,
  SourceRecordType.BookReview,
  SourceRecordType.ReviewArticle,
  SourceRecordType.Editorial,
  SourceRecordType.DataPaper,
  SourceRecordType.Report,
  SourceRecordType.ResearchReport,
  SourceRecordType.TechnicalReport,
  SourceRecordType.WorkingPaper,
  SourceRecordType.Preprint,
  SourceRecordType.Image,
  SourceRecordType.AudiovisualDocument,
  SourceRecordType.StillImage,
  SourceRecordType.Map,
  SourceRecordType.Erratum,
  SourceRecordType.Letter,
  SourceRecordType.Software,
  SourceRecordType.MetadataDocument,
  SourceRecordType.Patent,
  SourceRecordType.BlogPost,
  SourceRecordType.Lecture,
  SourceRecordType.Standard,
  SourceRecordType.DataManagementPlan,
  SourceRecordType.Note,
  SourceRecordType.Grant,
  SourceRecordType.Excerpt,
]

export class SourceRecordTypeService {
  static getPreciseType = (types: SourceRecordType[]) => {
    for (let i = SOURCE_RECORD_TYPE_ORDER.length - 1; i >= 0; i--) {
      const type = SOURCE_RECORD_TYPE_ORDER[i]
      if (types.includes(type)) {
        return type
      }
    }
  }
}
