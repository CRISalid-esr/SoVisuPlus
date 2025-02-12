import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
  getBibliographicPlatformByNameIgnoreCase,
  getBibliographicPlatformDbValue,
} from './BibliographicPlatform'
import { BibliographicPlatform as DbBibliographicPlatform } from '@prisma/client'

describe('BibliographicPlatform', () => {
  it('should have metadata defined for each platform', () => {
    Object.values(BibliographicPlatform).forEach((platform) => {
      expect(BibliographicPlatformMetadata).toHaveProperty(platform)
      expect(BibliographicPlatformMetadata[platform]).toHaveProperty('name')
      expect(BibliographicPlatformMetadata[platform]).toHaveProperty('icon')
    })
  })
})

describe('getBibliographicPlatformByNameIgnoreCase', () => {
  it('should return the correct BibliographicPlatform for valid names (case insensitive)', () => {
    expect(getBibliographicPlatformByNameIgnoreCase('HAL')).toBe(
      BibliographicPlatform.HAL,
    )
    expect(getBibliographicPlatformByNameIgnoreCase('hal')).toBe(
      BibliographicPlatform.HAL,
    )
    expect(getBibliographicPlatformByNameIgnoreCase('HaL')).toBe(
      BibliographicPlatform.HAL,
    )

    expect(getBibliographicPlatformByNameIgnoreCase('SCANR')).toBe(
      BibliographicPlatform.SCANR,
    )
    expect(getBibliographicPlatformByNameIgnoreCase('scanr')).toBe(
      BibliographicPlatform.SCANR,
    )
  })

  it('should return null for an unknown platform', () => {
    expect(getBibliographicPlatformByNameIgnoreCase('unknown')).toBeNull()
    expect(getBibliographicPlatformByNameIgnoreCase('')).toBeNull()
    expect(
      getBibliographicPlatformByNameIgnoreCase('someRandomPlatform'),
    ).toBeNull()
  })
})

describe('getBibliographicPlatformDbValue', () => {
  it('should return the correct Prisma enum key for a valid platform', () => {
    expect(getBibliographicPlatformDbValue(BibliographicPlatform.HAL)).toBe(
      BibliographicPlatform.HAL as keyof typeof DbBibliographicPlatform,
    )
    expect(getBibliographicPlatformDbValue(BibliographicPlatform.SCANR)).toBe(
      BibliographicPlatform.SCANR as keyof typeof DbBibliographicPlatform,
    )
  })

  it('should return the same string value as Prisma enum keys', () => {
    expect(Object.keys(DbBibliographicPlatform)).toContain(
      getBibliographicPlatformDbValue(BibliographicPlatform.HAL),
    )
    expect(Object.keys(DbBibliographicPlatform)).toContain(
      getBibliographicPlatformDbValue(BibliographicPlatform.SCANR),
    )
  })
})
