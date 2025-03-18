import {
  ResearchStructureIdentifierType,
  convertStringResearchStructureIdentifierType,
} from '@/types/ResearchStructureIdentifier'
import { describe, expect, it } from '@jest/globals'

describe('ResearchStructureIdentifier', () => {
  it('should correctly map string values to ResearchStructureIdentifierType', () => {
    expect(convertStringResearchStructureIdentifierType('rnsr')).toBe(
      ResearchStructureIdentifierType.RNSR,
    )
    expect(convertStringResearchStructureIdentifierType('idref')).toBe(
      ResearchStructureIdentifierType.IDREF,
    )
    expect(convertStringResearchStructureIdentifierType('local')).toBe(
      ResearchStructureIdentifierType.LOCAL,
    )
  })

  it('should be case insensitive when mapping string values', () => {
    expect(convertStringResearchStructureIdentifierType('RNSR')).toBe(
      ResearchStructureIdentifierType.RNSR,
    )
    expect(convertStringResearchStructureIdentifierType('IDREF')).toBe(
      ResearchStructureIdentifierType.IDREF,
    )
    expect(convertStringResearchStructureIdentifierType('LOCAL')).toBe(
      ResearchStructureIdentifierType.LOCAL,
    )
  })

  it('should throw an error for unsupported identifier types', () => {
    expect(() =>
      convertStringResearchStructureIdentifierType('unsupported'),
    ).toThrowError(`Unsupported identifier type: unsupported`)
    expect(() =>
      convertStringResearchStructureIdentifierType('random'),
    ).toThrowError(`Unsupported identifier type: random`)
  })
})
