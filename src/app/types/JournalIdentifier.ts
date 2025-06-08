import { JournalIdentifier as DbJournalIdentifier } from '@prisma/client'

interface JournalIdentifierJson {
  type: string
  value: string
  format?: string | null
}

class JournalIdentifier {
  constructor(
    public type: string,
    public value: string,
    public format: string | null = null,
  ) {}

  static fromDbIdentifier(
    dbIdentifier: DbJournalIdentifier,
  ): JournalIdentifier {
    return new JournalIdentifier(
      dbIdentifier.type,
      dbIdentifier.value,
      dbIdentifier.format || null,
    )
  }

  static fromJson(json: JournalIdentifierJson): JournalIdentifier {
    return new JournalIdentifier(json.type, json.value, json.format || null)
  }
}

export { JournalIdentifier }
export type { JournalIdentifierJson }
