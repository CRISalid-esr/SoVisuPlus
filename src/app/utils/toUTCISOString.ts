import dayjs from 'dayjs'

/**
 * Convert a date string to a UTC ISO string.
 * - Start dates → 00:00:00.000 UTC
 * - End dates   → 23:59:59.999 UTC
 */
export function toUTCISOString(
  dateStr: string | null,
  isEndDate = false,
): string | null {
  if (!dateStr) return null
  const parsedDate = dayjs(dateStr)
  if (!parsedDate.isValid()) return null

  const utcDate = isEndDate
    ? new Date(
        Date.UTC(
          parsedDate.year(),
          parsedDate.month(),
          parsedDate.date(),
          23,
          59,
          59,
          999,
        ),
      )
    : new Date(
        Date.UTC(
          parsedDate.year(),
          parsedDate.month(),
          parsedDate.date(),
          0,
          0,
          0,
          0,
        ),
      )

  return utcDate.toISOString()
}
