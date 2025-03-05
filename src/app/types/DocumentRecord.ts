import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { Literal } from '@/types/Literal'
import { getStringInLocale } from '@/utils/getStringInLocale'

interface DocumentRecordJson {
  uid: string
  platform: BibliographicPlatform
  titles: Array<Literal>
  url: string | null
}

class DocumentRecord {
  private _url: URL | null = null

  constructor(
    public uid: string,
    public platform: BibliographicPlatform,
    public titles: Array<Literal>,
    url?: string | null,
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

  fromObject(record: DocumentRecordJson): DocumentRecord {
    return new DocumentRecord(
      record.uid,
      record.platform,
      record.titles.map((title) => Literal.fromObject(title)),
      record.url,
    )
  }
}

export { DocumentRecord }
