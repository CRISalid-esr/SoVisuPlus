/**
 * Join items as a natural-language list in the given locale
 * (fr: "A, B et C", en: "A, B, and C").
 */
export const formatList = (items: string[], locale: string): string =>
  new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
    items,
  )
