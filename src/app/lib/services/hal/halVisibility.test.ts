import { computeNotBefore } from './halVisibility'

describe('computeNotBefore', () => {
  const base = new Date(Date.UTC(2026, 5, 24)) // 2026-06-24

  it('returns null for immediate visibility', () => {
    expect(computeNotBefore(base, 'now')).toBeNull()
  })

  it('returns null for unset / unknown codes', () => {
    expect(computeNotBefore(base, null)).toBeNull()
    expect(computeNotBefore(base, undefined)).toBeNull()
    expect(computeNotBefore(base, 'bogus')).toBeNull()
  })

  it('adds day, month and year offsets', () => {
    expect(computeNotBefore(base, '15d')).toBe('2026-07-09')
    expect(computeNotBefore(base, '1m')).toBe('2026-07-24')
    expect(computeNotBefore(base, '3m')).toBe('2026-09-24')
    expect(computeNotBefore(base, '6m')).toBe('2026-12-24')
    expect(computeNotBefore(base, '1y')).toBe('2027-06-24')
    expect(computeNotBefore(base, '2y')).toBe('2028-06-24')
  })
})
