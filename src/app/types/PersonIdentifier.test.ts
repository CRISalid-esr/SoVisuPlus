import {
  PersonIdentifierType,
  convertStringPersonIdentifierType,
} from '@/types/PersonIdentifier'
import { describe, expect, it } from '@jest/globals'

describe('PersonIdentifier', () => {
  it('should correctly map string values to PersonIdentifierType', () => {
    expect(convertStringPersonIdentifierType('local')).toBe(
      PersonIdentifierType.LOCAL,
    )
    expect(convertStringPersonIdentifierType('orcid')).toBe(
      PersonIdentifierType.ORCID,
    )
    expect(convertStringPersonIdentifierType('idref')).toBe(
      PersonIdentifierType.IDREF,
    )
    expect(convertStringPersonIdentifierType('scopus_eid')).toBe(
      PersonIdentifierType.SCOPUS_EID,
    )
    expect(convertStringPersonIdentifierType('id_hal')).toBe(
      PersonIdentifierType.ID_HAL_S,
    )
    expect(convertStringPersonIdentifierType('id_hal_s')).toBe(
      PersonIdentifierType.ID_HAL_S,
    )
  })

  it('should be case insensitive and handle extra spaces when mapping string values', () => {
    expect(convertStringPersonIdentifierType(' LOCAL ')).toBe(
      PersonIdentifierType.LOCAL,
    )
    expect(convertStringPersonIdentifierType('Orcid')).toBe(
      PersonIdentifierType.ORCID,
    )
    expect(convertStringPersonIdentifierType('IDREF')).toBe(
      PersonIdentifierType.IDREF,
    )
    expect(convertStringPersonIdentifierType(' Scopus_EID ')).toBe(
      PersonIdentifierType.SCOPUS_EID,
    )
    expect(convertStringPersonIdentifierType(' Id_Hal ')).toBe(
      PersonIdentifierType.ID_HAL_S,
    )
  })

  it('should throw an error for unknown identifier types', () => {
    expect(() => convertStringPersonIdentifierType('unknown')).toThrowError(
      'Unknown identifier type: unknown',
    )
    expect(() => convertStringPersonIdentifierType('random_type')).toThrowError(
      'Unknown identifier type: random_type',
    )
  })
})
