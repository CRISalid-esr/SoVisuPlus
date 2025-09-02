import { JournalWithRelations as DbJournal } from '@/prisma-schema/extended-client'
import {
  JournalIdentifier,
  JournalIdentifierJson,
} from '@/types/JournalIdentifier'
import { JournalTitle, JournalTitleJson } from '@/types/JournalTitle'

interface JournalJson {
  titles: JournalTitleJson[]
  issnL: string
  publisher: string
  identifiers: JournalIdentifierJson[] // Adjust type as needed, e.g., JournalIdentifierJson[]
}

class Journal {
  constructor(
    public titles: JournalTitle[],
    public issnL: string,
    public publisher: string,
    public identifiers: JournalIdentifier[],
  ) {}

  static fromDbJournal(dbJournal: DbJournal): Journal {
    return new Journal(
      dbJournal.titles.map((title) => JournalTitle.fromDbTitle(title)),
      dbJournal.issnL,
      dbJournal.publisher,
      dbJournal.identifiers.map((id) => JournalIdentifier.fromDbIdentifier(id)),
    )
  }

  static fromJson(json: JournalJson): Journal {
    return new Journal(
      json.titles.map((title) => JournalTitle.fromJson(title)),
      json.issnL,
      json.publisher,
      json.identifiers.map((id) => JournalIdentifier.fromJson(id)),
    )
  }
}

export { Journal }
export type { JournalJson }
