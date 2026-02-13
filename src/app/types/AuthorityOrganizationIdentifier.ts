import {
  $Enums,
  AuthorityOrganizationIdentifier as DbAuthorityOrganizationIdentifier,
} from '.prisma/client'
import DbAuthorityOrganizationIdentifierType = $Enums.AuthorityOrganizationIdentifierType

export interface AuthorityOrganizationIdentifierJson {
  type: string
  value: string
}
export class AuthorityOrganizationIdentifier {
  constructor(
    public type: DbAuthorityOrganizationIdentifierType,
    public value: string,
  ) {}

  /**
   * Convert a string to a valid AuthorityOrganizationIdentifierType or return null
   * @param typeString - The string representation of the authority organization identifier type
   * @returns A valid AuthorityOrganizationIdentifierType
   */
  static authorityOrganizationIdentifierTypeFromString(
    typeString: string,
  ): DbAuthorityOrganizationIdentifierType | null {
    const convertedType = typeString as DbAuthorityOrganizationIdentifierType
    return Object.values(DbAuthorityOrganizationIdentifierType).includes(
      convertedType,
    )
      ? convertedType
      : null
  }

  static fromJson(json: AuthorityOrganizationIdentifierJson) {
    const type = this.authorityOrganizationIdentifierTypeFromString(json.type)
    return type
      ? new AuthorityOrganizationIdentifier(type, json.value)
      : undefined
  }

  static fromDb(authorityOrganizationId: DbAuthorityOrganizationIdentifier) {
    return new AuthorityOrganizationIdentifier(
      authorityOrganizationId.type,
      authorityOrganizationId.value,
    )
  }
}
