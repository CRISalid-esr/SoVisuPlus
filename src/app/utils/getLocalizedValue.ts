import { Literal } from '@/types/Literal'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export function getLocalizedValue(
  data: Literal[],
  preferredLang: string,
  fallbackLangs: string[],
  defaultValue: string,
): Literal {
  const preferred = data?.find((literal) => literal.language === preferredLang)
  if (preferred) return preferred

  for (const fallbackLang of fallbackLangs) {
    const fallback = data?.find((literal) => literal.language === fallbackLang)
    if (fallback) return fallback
  }

  if (data.length > 0) return data[0]

  return new Literal(defaultValue, 'ul' as ExtendedLanguageCode)
}
