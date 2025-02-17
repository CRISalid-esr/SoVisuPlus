import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import 'dayjs/locale/de'
import 'dayjs/locale/es'

/**
 * Formats a date while ensuring the year is always at the end.
 *
 * @param date - The input date string (`YYYY`, `MM-YYYY`, or `DD-MM-YYYY`)
 * @param locale - The user's language (`fr`, `en`, `de`, `es`, etc.)
 * @returns Localized date string with the year at the end.
 */
export function formatLocalizedDate(date: string, locale: string): string {
  if (!date) return ''

  // Ensure dayjs uses the correct locale
  dayjs.locale(locale)

  // Locale-based format mappings (Year always at the end)
  const localeFormats: Record<string, string> = {
    fr: 'DD-MM-YYYY', // French: "27-01-2023"
    en: 'MM-DD-YYYY', // English: "01-27-2023"
    de: 'DD.MM.YYYY', // German: "27.01.2023"
    es: 'DD/MM/YYYY', // Spanish: "27/01/2023"
  }

  // Default format if locale is missing
  const dateFormat = localeFormats[locale] || 'DD-MM-YYYY'

  if (/^\d{4}$/.test(date)) {
    return dayjs(date, 'YYYY').format('YYYY')
  } else if (/^\d{2}-\d{4}$/.test(date)) {
    return dayjs(date, 'MM-YYYY').format('MM-YYYY') // Keep same order
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Convert from YYYY-MM-DD → MM-DD-YYYY or DD-MM-YYYY
    return dayjs(date, 'YYYY-MM-DD').format(dateFormat)
  } else if (/^\d{4}-\d{2}$/.test(date)) {
    // Convert from YYYY-MM → MM-YYYY (ensuring year at the end)
    return dayjs(date, 'YYYY-MM').format('MM-YYYY')
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    // Standard case: Make sure it's formatted correctly with year last
    return dayjs(date, 'DD-MM-YYYY').format(dateFormat)
  }

  return date // Return as-is if format is unknown
}
