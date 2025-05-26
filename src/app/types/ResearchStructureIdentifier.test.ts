import {
  ResearchStructureIdentifierType,
  convertStringResearchStructureIdentifierType,
} from '@/types/ResearchStructureIdentifier'
import { describe, expect, it } from '@jest/globals'

describe('ResearchStructureIdentifier', () => {
  it('should correctly map string values to ResearchStructureIdentifierType', () => {
    expect(convertStringResearchStructureIdentifierType('nns')).toBe(
      ResearchStructureIdentifierType.NNS,
    )
    expect(convertStringResearchStructureIdentifierType('idref')).toBe(
      ResearchStructureIdentifierType.IDREF,
    )
    expect(convertStringResearchStructureIdentifierType('local')).toBe(
      ResearchStructureIdentifierType.LOCAL,
    )
    expect(convertStringResearchStructureIdentifierType('hal')).toBe(
      ResearchStructureIdentifierType.HAL,
    )
    expect(convertStringResearchStructureIdentifierType('ror')).toBe(
      ResearchStructureIdentifierType.ROR,
    )
  })

  it('should be case insensitive when mapping string values', () => {
    expect(convertStringResearchStructureIdentifierType('NNS')).toBe(
      ResearchStructureIdentifierType.NNS,
    )
    expect(convertStringResearchStructureIdentifierType('IDREF')).toBe(
      ResearchStructureIdentifierType.IDREF,
    )
    expect(convertStringResearchStructureIdentifierType('LOCAL')).toBe(
      ResearchStructureIdentifierType.LOCAL,
    )
    expect(convertStringResearchStructureIdentifierType('Hal')).toBe(
      ResearchStructureIdentifierType.HAL,
    )
    expect(convertStringResearchStructureIdentifierType('ROR')).toBe(
      ResearchStructureIdentifierType.ROR,
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
