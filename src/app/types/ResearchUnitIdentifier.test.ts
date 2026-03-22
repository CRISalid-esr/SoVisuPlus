import { researchUnitIdentifierTypeFromString } from '@/types/ResearchUnitIdentifier'
import { describe, expect, it } from '@jest/globals'
import { ResearchUnitIdentifierType } from '@prisma/client'

describe('ResearchUnitIdentifier', () => {
  it('should correctly map string values to ResearchUnitIdentifierType', () => {
    expect(researchUnitIdentifierTypeFromString('nns')).toBe(
      ResearchUnitIdentifierType.nns,
    )
    expect(researchUnitIdentifierTypeFromString('idref')).toBe(
      ResearchUnitIdentifierType.idref,
    )
    expect(researchUnitIdentifierTypeFromString('hal')).toBe(
      ResearchUnitIdentifierType.hal,
    )
    expect(researchUnitIdentifierTypeFromString('ror')).toBe(
      ResearchUnitIdentifierType.ror,
    )
  })

  it('should throw an error for unsupported identifier types', () => {
    expect(() =>
      researchUnitIdentifierTypeFromString('unsupported'),
    ).toThrowError(`Unsupported identifier type: unsupported`)
    expect(() => researchUnitIdentifierTypeFromString('random')).toThrowError(
      `Unsupported identifier type: random`,
    )
  })
})
