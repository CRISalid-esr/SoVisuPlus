import { JournalIdentifier } from '@/types/JournalIdentifier'

class Journal {
  constructor(
    public titles: string[],
    public issnL: string,
    public publisher: string,
    public identifiers: JournalIdentifier[],
  ) {}
}

export { Journal }
