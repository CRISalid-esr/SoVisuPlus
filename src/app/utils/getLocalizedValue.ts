import { Literal } from '@/types/Literal'

export function getLocalizedValue(
  data: Literal[],
  lang: string,
  fallbackLangs: string[],
  defaultValue: string,
): string {
  const preferred = data?.find((literal) => literal.language === lang)
  if (preferred) return preferred.value

  for (const fallbackLang of fallbackLangs) {
    const fallback = data?.find((literal) => literal.language === fallbackLang)
    if (fallback) return fallback.value
  }

  return defaultValue
}
