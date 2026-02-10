import {
  $Enums,
  AuthorityOrganizationIdentifier as DbAuthorityOrganizationIdentifier,
} from '.prisma/client'
import AuthorityOrganizationIdentifierType = $Enums.AuthorityOrganizationIdentifierType

export interface AuthorityOrganizationIdentifierJson {
  type: string
  value: string
}
export class AuthorityOrganizationIdentifier {
  constructor(
    public type: AuthorityOrganizationIdentifierType,
    public value: string,
  ) {}

  /**
   * Convert a string to a valid AuthorityOrganizationIdentifierType or return null
   * @param typeString - The string representation of the authority organization identifier type
   * @returns A valid AuthorityOrganizationIdentifierType
   */
  static authorityOrganizationIdentifierTypeFromString(
    typeString: string,
  ): AuthorityOrganizationIdentifierType | null {
    const convertedType = typeString.toUpperCase()
    return (
      Object.values(AuthorityOrganizationIdentifierType) as string[]
    ).includes(convertedType)
      ? (convertedType as AuthorityOrganizationIdentifierType)
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
