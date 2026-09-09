import { AuthorityOrganizationType as DbAuthorityOrganizationType } from '.prisma/client'
import {
  AuthorityOrganizationIdentifier,
  AuthorityOrganizationIdentifierJson,
} from '@/types/AuthorityOrganizationIdentifier'
import { AuthorityOrganizationWithRelations } from '@/prisma-schema/extended-client'

export interface AuthorityOrganizationJson {
  uid: string
  displayNames: string[]
  type: string | null
  places: { latitude: number; longitude: number }[]
  identifiers: AuthorityOrganizationIdentifierJson[]
}
export class AuthorityOrganization {
  constructor(
    public uid: string,
    public displayNames: string[],
    public type: DbAuthorityOrganizationType | null,
    public places: { latitude: number; longitude: number }[],
    public identifiers: AuthorityOrganizationIdentifier[],
  ) {}

  /**
   * Convert a string to a valid AuthorityOrganizationType or return null
   * @param typeString - The string representation of the authority organization type
   * @returns A valid AuthorityOrganizationType, or null if absent/unknown
   */
  static authorityOrganizationTypeFromString(
    typeString: string | null,
  ): DbAuthorityOrganizationType | null {
    return typeString &&
      (Object.values(DbAuthorityOrganizationType) as string[]).includes(
        typeString,
      )
      ? (typeString as DbAuthorityOrganizationType)
      : null
  }

  static fromJson(json: AuthorityOrganizationJson) {
    return new AuthorityOrganization(
      json.uid,
      json.displayNames,
      this.authorityOrganizationTypeFromString(json.type),
      json.places,
      json.identifiers.reduce<AuthorityOrganizationIdentifier[]>((acc, id) => {
        const org = AuthorityOrganizationIdentifier.fromJson(id)
        if (org) {
          acc.push(org)
        }
        return acc
      }, []),
    )
  }

  static fromDb(authorityOrganization: AuthorityOrganizationWithRelations) {
    return new AuthorityOrganization(
      authorityOrganization.uid,
      authorityOrganization.displayNames,
      authorityOrganization.type,
      authorityOrganization.places as Array<{
        latitude: number
        longitude: number
      }>,
      authorityOrganization.identifiers.map((id) =>
        AuthorityOrganizationIdentifier.fromDb(id),
      ),
    )
  }
}
