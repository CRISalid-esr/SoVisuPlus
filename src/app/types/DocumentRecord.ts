import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
  getBibliographicPlatformFromDbValue,
} from '@/types/BibliographicPlatform'
import { Literal } from '@/types/Literal'
import { getStringInLocale } from '@/utils/getStringInLocale'
import {
  DocumentRecord as DbDocumentRecord,
  HalSubmitType as DbHalSubmitType,
} from '@prisma/client'

export interface DocumentRecordJson {
  uid: string
  platform: BibliographicPlatform
  titles: Array<Literal>
  _url: string | null
}

export class DocumentRecord {
  private _url: URL | null = null

  constructor(
    public uid: string,
    public platform: BibliographicPlatform,
    public titles: Array<Literal>,
    url?: string | null,
    public halCollectionCodes: string[] = [],
    public halSubmitType: DbHalSubmitType | null = null,
  ) {
    if (url) this.setUrl(url)
  }

  getTitleInLocale(localeNumber: number): string {
    return getStringInLocale(this.titles, localeNumber)
  }

  getPlatformName(): string {
    return BibliographicPlatformMetadata[this.platform]?.name || 'Unknown'
  }

  getPlatformIcon(): string {
    return (
      BibliographicPlatformMetadata[this.platform]?.icon || '/icons/default.png'
    )
  }

  get url(): string | null {
    return this._url ? this._url.toString() : null
  }

  set url(value: string | null) {
    if (value === null) {
      this._url = null
      return
    }
    this.setUrl(value)
  }

  private setUrl(value: string) {
    try {
      this._url = new URL(value)
    } catch (error: unknown) {
      throw new Error(
        `Invalid URL: ${value} - ${(error as Error | undefined)?.message}`,
      )
    }
  }

  static fromObject(record: DocumentRecordJson): DocumentRecord {
    return new DocumentRecord(
      record.uid,
      record.platform,
      record.titles.map((title) => Literal.fromObject(title)),
      record._url,
    )
  }

  static fromDbDocumentRecord(record: DbDocumentRecord) {
    return new DocumentRecord(
      record.uid,
      getBibliographicPlatformFromDbValue(record.platform),
      (record.titles as { value: string; language: string }[]).map(
        (title: { value: string; language: string }) =>
          Literal.fromObject(title),
      ),
      record.url,
    )
  }
}
