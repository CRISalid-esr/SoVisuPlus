import { describe, it, expect } from '@jest/globals'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'

describe('LocRelator', () => {
  it('should return the correct enum from a valid URI', () => {
    expect(
      LocRelatorHelper.fromURI('http://id.loc.gov/vocabulary/relators/bpd'),
    ).toBe(LocRelator.BOOKPLATE_DESIGNER)
  })

  it('should return null for an unknown URI', () => {
    expect(
      LocRelatorHelper.fromURI('http://id.loc.gov/vocabulary/relators/unknown'),
    ).toBeNull()
  })

  it('should return the correct label from an enum', () => {
    expect(LocRelatorHelper.toLabel(LocRelator.BOOKPLATE_DESIGNER)).toBe(
      'bookplate designer',
    )
  })

  it('should return the enum from a valid label', () => {
    expect(LocRelatorHelper.fromLabel('bookplate designer')).toBe(
      LocRelator.BOOKPLATE_DESIGNER,
    )
  })

  it('should return null for an unknown label', () => {
    expect(LocRelatorHelper.fromLabel('unknown role')).toBeNull()
  })

  it('should return the correct URI from an enum', () => {
    expect(LocRelatorHelper.toUri(LocRelator.BOOKPLATE_DESIGNER)).toBe(
      'http://id.loc.gov/vocabulary/relators/bpd',
    )
  })

  it('should return null when converting an unknown enum to URI', () => {
    expect(LocRelatorHelper.toUri('UNKNOWN_ROLE' as LocRelator)).toBeNull()
  })
})
