import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'

// Required for strict parsing against an explicit format to be honoured.
dayjs.extend(customParseFormat)

export type DatePrecision = 'year' | 'month' | 'day'

const PRECISION_FORMATS: Record<DatePrecision, string> = {
  year: 'YYYY',
  month: 'YYYY-MM',
  day: 'YYYY-MM-DD',
}

const PRECISION_BY_SEGMENTS: Record<number, DatePrecision> = {
  1: 'year',
  2: 'month',
  3: 'day',
}

/**
 * Parse a stored publication date string into a dayjs value and its precision.
 *
 * The publication date is stored as a partial ISO 8601 string: `YYYY`,
 * `YYYY-MM` or `YYYY-MM-DD`. The precision is recovered from the number of
 * dash-separated segments. Returns a `null` day when the value is missing or
 * not a valid partial ISO date (precision defaults to `day`).
 */
export const parsePublicationDate = (
  value: string | null,
): { day: Dayjs | null; precision: DatePrecision } => {
  if (!value) {
    return { day: null, precision: 'day' }
  }

  const precision = PRECISION_BY_SEGMENTS[value.split('-').length]
  if (!precision) {
    return { day: null, precision: 'day' }
  }

  const parsed = dayjs(value, PRECISION_FORMATS[precision], true)
  if (!parsed.isValid()) {
    return { day: null, precision: 'day' }
  }

  return { day: parsed, precision }
}

/**
 * Serialize a dayjs value to the partial ISO 8601 string stored for the given
 * precision.
 */
export const serializePublicationDate = (
  day: Dayjs,
  precision: DatePrecision,
): string => day.format(PRECISION_FORMATS[precision])

/**
 * Format a stored publication date string for display, honouring its precision
 * and the active locale. Falls back to returning the value verbatim when it is
 * not a valid partial ISO date.
 */
export const formatPublicationDate = (
  value: string,
  locale: string,
): string => {
  const { day, precision } = parsePublicationDate(value)
  if (!day) {
    return value
  }

  switch (precision) {
    case 'year':
      return day.format('YYYY')
    case 'month':
      return day.locale(locale).format('MMMM YYYY')
    case 'day':
      return day.format(LocaleDateFormats[locale] || 'YYYY-MM-DD')
  }
}
