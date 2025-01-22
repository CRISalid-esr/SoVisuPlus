export function getLocalizedValue(
  data: Record<string, string>,
  lang: string,
  fallbackLangs: string[],
  defaultValue: string,
): string {
  // Check the value for the current language
  if (data[lang]) return data[lang]

  // Iterate through fallback languages
  for (const fallbackLang of fallbackLangs) {
    if (data[fallbackLang]) return data[fallbackLang]
  }

  // Return the default value if nothing is found
  return defaultValue
}
