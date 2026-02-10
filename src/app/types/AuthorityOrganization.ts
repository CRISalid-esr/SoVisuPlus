import {
  AuthorityOrganizationIdentifier,
  AuthorityOrganizationIdentifierJson,
} from '@/types/AuthorityOrganizationIdentifier'
import { AuthorityOrganizationWithRelations } from '@/prisma-schema/extended-client'

export interface AuthorityOrganizationJson {
  uid: string
  displayNames: string[]
  identifiers: AuthorityOrganizationIdentifierJson[]
}
export class AuthorityOrganization {
  constructor(
    public uid: string,
    public displayNames: string[],
    public identifiers: AuthorityOrganizationIdentifier[],
  ) {}

  static fromJson(json: AuthorityOrganizationJson) {
    return new AuthorityOrganization(
      json.uid,
      json.displayNames,
      json.identifiers.map((id) =>
        AuthorityOrganizationIdentifier.fromJson(id),
      ),
    )
  }

  static fromDb(authorityOrganization: AuthorityOrganizationWithRelations) {
    return new AuthorityOrganization(
      authorityOrganization.uid,
      authorityOrganization.displayNames,
      authorityOrganization.identifiers.map((id) =>
        AuthorityOrganizationIdentifier.fromDb(id),
      ),
    )
  }
}
