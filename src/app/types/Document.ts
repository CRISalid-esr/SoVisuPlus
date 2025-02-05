import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'

class Document {
  constructor(
    public uid: string,
    public titles: Array<Literal>,
    public abstracts: Array<Literal>,
    public contributions: Array<Contribution> = [],
  ) {}

  getTitleInLocale(localeNumber: number): string {
    const locales = (process.env.SUPPORTED_LOCALES || '').split(',')
    if (localeNumber >= locales.length) {
      return ''
    }
    // if we have the title in the specified locale, return it, else the first found title in the order of the supported locales
    let title = this.titles.find(
      (title) => title.language === locales[localeNumber],
    )
    if (title) {
      return title.normalize()
    }
    for (const locale of locales) {
      title = this.titles.find((title) => title.language === locale)
      if (title) {
        return title.normalize()
      }
    }
    if (this.titles.length > 0) {
      return this.titles[0].normalize()
    }
    return 'n/c'
  }
}

export { Document }
