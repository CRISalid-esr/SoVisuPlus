/**
 * File visibility / embargo options (as used by the deposit form) → the file's open-access
 * date, emitted as `editionStmt/edition/date/@notBefore` in the AOfr TEI.
 *
 * `now` means immediate availability — no `<date notBefore>` is emitted. The other codes are
 * offsets from the deposit date.
 */

export type HalVisibilityCode =
  | 'now'
  | '15d'
  | '1m'
  | '3m'
  | '6m'
  | '1y'
  | '2y'

type Offset = { days?: number; months?: number; years?: number }

const OFFSETS: Record<string, Offset> = {
  now: {},
  '15d': { days: 15 },
  '1m': { months: 1 },
  '3m': { months: 3 },
  '6m': { months: 6 },
  '1y': { years: 1 },
  '2y': { years: 2 },
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Format a Date as `YYYY-MM-DD` (the `@notBefore` value is a plain date). */
export const toIsoDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

/**
 * Compute the embargo date for a file given the deposit date and the chosen visibility.
 * Returns `null` for `now`/unknown codes (no embargo → no `<date notBefore>`).
 */
export const computeNotBefore = (
  depositDate: Date,
  code: string | null | undefined,
): string | null => {
  if (!code || code === 'now') return null
  const offset = OFFSETS[code]
  if (!offset) return null
  const d = new Date(
    Date.UTC(
      depositDate.getUTCFullYear() + (offset.years ?? 0),
      depositDate.getUTCMonth() + (offset.months ?? 0),
      depositDate.getUTCDate() + (offset.days ?? 0),
    ),
  )
  return toIsoDate(d)
}
