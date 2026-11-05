// Tests which memberships count as current for the HAL collection status
import { PersonMembership } from '@/types/PersonMembership'

describe('PersonMembership.isCurrent', () => {
  const now = new Date(2026, 10, 5, 15, 30)

  it.each([
    [undefined, true],
    [null, true],
    [new Date(2026, 10, 6).toDateString(), true],
    [new Date(2026, 10, 5).toDateString(), false],
    [new Date(2026, 10, 4).toDateString(), false],
  ])('endDate %j → %s', (endDate, expected) => {
    expect(PersonMembership.isCurrent({ endDate }, now)).toBe(expected)
  })
})
