import { JournalTitle as DbJournalTitle } from '@prisma/client'

interface JournalTitleJson {
  value: string
}

class JournalTitle {
  constructor(public value: string) {}

  static fromDbTitle(dbTitle: DbJournalTitle): JournalTitle {
    return new JournalTitle(dbTitle.value)
  }

  static fromJson(json: JournalTitleJson): JournalTitle {
    return new JournalTitle(json.value)
  }
}

export { JournalTitle }
export type { JournalTitleJson }
