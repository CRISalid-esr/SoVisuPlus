import { isCurrentPeriod } from '@/utils/period'

describe('isCurrentPeriod', () => {
  const now = new Date(2026, 10, 5, 15, 30)

  it.each([
    [undefined, true],
    [null, true],
    [new Date(2026, 10, 6).toDateString(), true],
    [new Date(2026, 10, 5).toDateString(), false],
    [new Date(2026, 10, 4).toDateString(), false],
  ])('endDate %j → %s', (endDate, expected) => {
    expect(isCurrentPeriod(endDate, now)).toBe(expected)
  })
})
