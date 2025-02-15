import { Literal } from '@/types/Literal'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export function getLocalizedValue(
  data: Literal[],
  lang: string,
  fallbackLangs: string[],
  defaultValue: string,
): Literal {
  const preferred = data?.find((literal) => literal.language === lang)
  if (preferred) return preferred

  for (const fallbackLang of fallbackLangs) {
    const fallback = data?.find((literal) => literal.language === fallbackLang)
    if (fallback) return fallback
  }

  return new Literal(defaultValue, 'ul' as ExtendedLanguageCode)
}
