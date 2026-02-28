import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
  getBibliographicPlatformDbValue,
  isValidBibliographicPlatformName,
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

describe('isValidBibliographicPlatformName', () => {
  it('should return null for an unknown platform', () => {
    expect(isValidBibliographicPlatformName('hal')).toBe(
      BibliographicPlatform.HAL,
    )
    expect(isValidBibliographicPlatformName('unknown')).toBeNull()
    expect(isValidBibliographicPlatformName('')).toBeNull()
    expect(isValidBibliographicPlatformName('someRandomPlatform')).toBeNull()
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
