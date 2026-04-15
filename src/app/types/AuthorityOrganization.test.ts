import { describe, expect, it } from '@jest/globals'
import {
  AuthorityOrganization,
  AuthorityOrganizationJson,
} from '@/types/AuthorityOrganization'
import { AuthorityOrganizationWithRelations as DbAuthorityOrganization } from '@/prisma-schema/extended-client'
import { AuthorityOrganizationIdentifierType } from '@prisma/client'

describe('AuthorityOrganization.fromJson', () => {
  it('should parse AuthorityOrganizationJson to AuthorityOrganization correctly ', () => {
    const input: AuthorityOrganizationJson = {
      uid: '123',
      displayNames: ['Some Organization'],
      places: [{ latitude: 53, longitude: 34 }],
      identifiers: [
        {
          type: 'hal',
          value: '123',
        },
      ],
    }

    const organization = AuthorityOrganization.fromJson(input)

    expect(organization.uid).toBe('123')
    expect(organization.displayNames).toHaveLength(1)
    expect(organization.displayNames[0]).toBe('Some Organization')
    expect(organization.places).toHaveLength(1)
    expect(organization.places[0]).toEqual({ latitude: 53, longitude: 34 })
    expect(organization.identifiers).toHaveLength(1)
    expect(organization.identifiers[0]).toEqual({
      type: AuthorityOrganizationIdentifierType.hal,
      value: '123',
    })
  })
})

describe('AuthorityOrganization.fromDb', () => {
  it('should parse DbAuthorityOrganization to AuthorityOrganization correctly', () => {
    const input: DbAuthorityOrganization = {
      id: 1,
      uid: '123',
      displayNames: ['Some Organization'],
      places: [{ latitude: 53, longitude: 34 }],
      identifiers: [
        {
          id: 1,
          type: AuthorityOrganizationIdentifierType.hal,
          value: '123',
          organizationId: 1,
        },
      ],
    }

    const organization = AuthorityOrganization.fromDb(input)

    expect(organization.uid).toBe('123')
    expect(organization.displayNames).toHaveLength(1)
    expect(organization.displayNames[0]).toBe('Some Organization')
    expect(organization.places).toHaveLength(1)
    expect(organization.places[0]).toEqual({ latitude: 53, longitude: 34 })
    expect(organization.identifiers).toHaveLength(1)
    expect(organization.identifiers[0]).toEqual({
      type: AuthorityOrganizationIdentifierType.hal,
      value: '123',
    })
  })
})
