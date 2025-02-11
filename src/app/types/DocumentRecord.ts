import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { Literal } from '@/types/Literal'
import { getStringInLocale } from '@/utils/getStringInLocale'

class DocumentRecord {
  constructor(
    public uid: string,
    public platform: BibliographicPlatform,
    public titles: Array<Literal>,
  ) {}

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
}

export { DocumentRecord }
