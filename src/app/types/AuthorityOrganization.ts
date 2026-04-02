import {
  AuthorityOrganizationIdentifier,
  AuthorityOrganizationIdentifierJson,
} from '@/types/AuthorityOrganizationIdentifier'
import { AuthorityOrganizationWithRelations } from '@/prisma-schema/extended-client'

export interface AuthorityOrganizationJson {
  uid: string
  displayNames: string[]
  places: {latitude: number, longitude: number}[]
  identifiers: AuthorityOrganizationIdentifierJson[]
}
export class AuthorityOrganization {
  constructor(
    public uid: string,
    public displayNames: string[],
    public places: {latitude: number, longitude: number}[],
    public identifiers: AuthorityOrganizationIdentifier[],
  ) {}

  static fromJson(json: AuthorityOrganizationJson) {
    return new AuthorityOrganization(
      json.uid,
      json.displayNames,
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
      (authorityOrganization.places as Array<{latitude:number, longitude:number}>),
      authorityOrganization.identifiers.map((id) =>
        AuthorityOrganizationIdentifier.fromDb(id),
      ),
    )
  }
}
