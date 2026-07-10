import { countryLabel, halCountries, halCountriesByCode } from './HalCountries'

describe('HalCountries', () => {
  it('has unique, well-formed ISO alpha-2 codes with non-empty names', () => {
    const codes = new Set<string>()
    for (const c of halCountries) {
      expect(c.code).toMatch(/^[A-Z]{2}$/)
      expect(c.en.trim().length).toBeGreaterThan(0)
      expect(c.fr.trim().length).toBeGreaterThan(0)
      expect(codes.has(c.code)).toBe(false)
      codes.add(c.code)
    }
    expect(codes.size).toBeGreaterThan(200)
  })

  it('indexes every country by code', () => {
    expect(Object.keys(halCountriesByCode).length).toBe(halCountries.length)
    expect(halCountriesByCode.FR?.en).toBe('France')
  })

  it('labels a country in the requested locale, falling back to the code', () => {
    expect(countryLabel('FR', 'en')).toBe('France')
    expect(countryLabel('FR', 'fr-FR')).toBe('France')
    expect(countryLabel('DE', 'en')).toBe('Germany')
    expect(countryLabel('DE', 'fr')).toBe('Allemagne')
    expect(countryLabel('ZZ', 'en')).toBe('ZZ')
  })
})
