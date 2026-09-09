import { organizationIdentifierTypeFromString } from '@/types/OrganizationUnitIdentifier'
import { describe, expect, it } from '@jest/globals'
import { OrganizationIdentifierType } from '@prisma/client'

describe('OrganizationUnitIdentifier', () => {
  it('should correctly map string values to OrganizationIdentifierType', () => {
    expect(organizationIdentifierTypeFromString('nns')).toBe(
      OrganizationIdentifierType.nns,
    )
    expect(organizationIdentifierTypeFromString('idref')).toBe(
      OrganizationIdentifierType.idref,
    )
    expect(organizationIdentifierTypeFromString('hal')).toBe(
      OrganizationIdentifierType.hal,
    )
    expect(organizationIdentifierTypeFromString('ror')).toBe(
      OrganizationIdentifierType.ror,
    )
    expect(organizationIdentifierTypeFromString('siret')).toBe(
      OrganizationIdentifierType.siret,
    )
  })

  it('should throw an error for unsupported identifier types', () => {
    expect(() =>
      organizationIdentifierTypeFromString('unsupported'),
    ).toThrowError(`Unsupported identifier type: unsupported`)
    expect(() => organizationIdentifierTypeFromString('random')).toThrowError(
      `Unsupported identifier type: random`,
    )
  })
})
