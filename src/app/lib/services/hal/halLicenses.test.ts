import { licenceTargetFor } from './halLicenses'

describe('licenceTargetFor', () => {
  it('maps each Creative Commons code to its 4.0 @target', () => {
    expect(licenceTargetFor('cc-by')).toBe(
      'http://creativecommons.org/licenses/by/4.0/',
    )
    expect(licenceTargetFor('cc-by-nc-sa')).toBe(
      'http://creativecommons.org/licenses/by-nc-sa/4.0/',
    )
    expect(licenceTargetFor('cc-by-nc-nd')).toBe(
      'http://creativecommons.org/licenses/by-nc-nd/4.0/',
    )
  })

  it('returns null for unset codes', () => {
    expect(licenceTargetFor(null)).toBeNull()
    expect(licenceTargetFor(undefined)).toBeNull()
    expect(licenceTargetFor('')).toBeNull()
  })

  it('returns null for not-yet-resolved ETALAB / Copyright codes', () => {
    expect(licenceTargetFor('etalab')).toBeNull()
    expect(licenceTargetFor('copyright')).toBeNull()
  })
})
