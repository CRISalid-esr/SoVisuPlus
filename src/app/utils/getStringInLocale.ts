import { Literal } from '@/types/Literal'

export function getStringInLocale(
  items: Array<Literal>,
  localeNumber: number,
): string {
  const locales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES.split(',')
  if (localeNumber >= locales.length) {
    return ''
  }

  let item = items.find((i) => i.language === locales[localeNumber])
  if (item) {
    return item.value.normalize()
  }

  for (const locale of locales) {
    item = items.find((i) => i.language === locale)
    if (item) {
      return item.value.normalize()
    }
  }

  return items.length > 0 ? items[0].value.normalize() : 'n/c'
}
