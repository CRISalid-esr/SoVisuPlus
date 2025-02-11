import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { getStringInLocale } from '@/utils/getStringInLocale'
import { DocumentRecord } from '@/types/DocumentRecord'

class Document {
  constructor(
    public uid: string,
    public publicationDate: string | null,
    public publicationDateStart: Date | null,
    public publicationDateEnd: Date | null,
    public titles: Array<Literal>,
    public abstracts: Array<Literal>,
    public contributions: Array<Contribution> = [],
    public records: Array<DocumentRecord> = [],
  ) {}

  getTitleInLocale(localeNumber: number): string {
    return getStringInLocale(this.titles, localeNumber)
  }
}

export { Document }
