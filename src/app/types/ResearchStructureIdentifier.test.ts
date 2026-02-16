import { researchStructureIdentifierTypeFromString } from '@/types/ResearchStructureIdentifier'
import { describe, expect, it } from '@jest/globals'
import { ResearchStructureIdentifierType } from '@prisma/client'

describe('ResearchStructureIdentifier', () => {
  it('should correctly map string values to ResearchStructureIdentifierType', () => {
    expect(researchStructureIdentifierTypeFromString('nns')).toBe(
      ResearchStructureIdentifierType.nns,
    )
    expect(researchStructureIdentifierTypeFromString('idref')).toBe(
      ResearchStructureIdentifierType.idref,
    )
    expect(researchStructureIdentifierTypeFromString('hal')).toBe(
      ResearchStructureIdentifierType.hal,
    )
    expect(researchStructureIdentifierTypeFromString('ror')).toBe(
      ResearchStructureIdentifierType.ror,
    )
  })

  it('should throw an error for unsupported identifier types', () => {
    expect(() =>
      researchStructureIdentifierTypeFromString('unsupported'),
    ).toThrowError(`Unsupported identifier type: unsupported`)
    expect(() =>
      researchStructureIdentifierTypeFromString('random'),
    ).toThrowError(`Unsupported identifier type: random`)
  })
})
