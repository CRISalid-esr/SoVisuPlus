import { JournalWithRelations as DbJournal } from '@/prisma-schema/extended-client'
import {
  JournalIdentifier,
  JournalIdentifierJson,
} from '@/types/JournalIdentifier'

interface JournalJson {
  titles: string[]
  issnL: string
  publisher: string
  identifiers: JournalIdentifierJson[] // Adjust type as needed, e.g., JournalIdentifierJson[]
}

class Journal {
  constructor(
    public titles: string[],
    public issnL: string,
    public publisher: string,
    public identifiers: JournalIdentifier[],
  ) {}

  static fromDbJournal(dbJournal: DbJournal): Journal {
    return new Journal(
      dbJournal.titles,
      dbJournal.issnL,
      dbJournal.publisher,
      dbJournal.identifiers.map((id) => JournalIdentifier.fromDbIdentifier(id)),
    )
  }

  static fromJson(json: JournalJson): Journal {
    return new Journal(
      json.titles,
      json.issnL,
      json.publisher,
      json.identifiers.map((id) => JournalIdentifier.fromJson(id)),
    )
  }
}

export { Journal }
export type { JournalJson }
