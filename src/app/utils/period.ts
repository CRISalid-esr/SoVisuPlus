/**
 * A dated link (membership, employment…) is current when it has no end date
 * or ends after today.
 */
export const isCurrentPeriod = (
  endDate: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!endDate) {
    return true
  }
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  return new Date(endDate) > startOfToday
}
