import { SourceJournal as DbSourceJournal } from '@prisma/client'

export interface SourceJournalJson {
  uid: string
  source: string
  sourceId: string
  publisher?: string
  titles: string[]
}
export class SourceJournal {
  constructor(
    public uid: string,
    public source: string,
    public sourceId: string,
    public titles: string[],
    public publisher?: string,
  ) {}

  static fromJson(json: SourceJournalJson): SourceJournal {
    return new SourceJournal(
      json.uid,
      json.source,
      json.sourceId,
      json.titles,
      json.publisher,
    )
  }

  static fromDbSourceJournal(dbSourceJournal: DbSourceJournal): SourceJournal {
    return new SourceJournal(
      dbSourceJournal.uid,
      dbSourceJournal.source,
      dbSourceJournal.sourceId,
      dbSourceJournal.titles,
      dbSourceJournal.publisher ? dbSourceJournal.publisher : undefined,
    )
  }
}
