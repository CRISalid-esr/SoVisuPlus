import { SourceRecordTypeService } from '@/lib/services/SourceRecordTypeService'
import { SourceRecordType } from '@prisma/client'

describe('SourceRecordTypeService', () => {
  it('getPreciseType should return the last element includes in SOURCE_RECORD_TYPE_ORDER', () => {
    expect(
      SourceRecordTypeService.getPreciseType([
        SourceRecordType.Unknown,
        SourceRecordType.Document,
      ]),
    ).toEqual(SourceRecordType.Document)
    expect(
      SourceRecordTypeService.getPreciseType([
        SourceRecordType.Unknown,
        SourceRecordType.Document,
        SourceRecordType.Report,
        SourceRecordType.ResearchReport,
      ]),
    ).toEqual(SourceRecordType.ResearchReport)
    expect(
      SourceRecordTypeService.getPreciseType([
        SourceRecordType.Chapter,
        SourceRecordType.Unknown,
        SourceRecordType.Book,
        SourceRecordType.Document,
      ]),
    ).toEqual(SourceRecordType.Chapter)
    expect(SourceRecordTypeService.getPreciseType([])).toEqual(
      SourceRecordType.Unknown,
    )
  })
})
