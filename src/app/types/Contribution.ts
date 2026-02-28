import { Person, PersonJson } from '@/types/Person'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { ContributionWithRelations as DbContribution } from '@/prisma-schema/extended-client'
import {
  AuthorityOrganization,
  AuthorityOrganizationJson,
} from '@/types/AuthorityOrganization'

interface ContributionJson {
  person: PersonJson
  roles: LocRelator[]
  affiliations: AuthorityOrganizationJson[]
  rank: number | null
}

class Contribution {
  constructor(
    public person: Person,
    public roles: LocRelator[] = [], // Store multiple roles as an array of enums
    public affiliations: AuthorityOrganization[] = [],
    public rank?: number | null,
  ) {}

  getRoleLabels(): string[] {
    return this.roles.map((role) => LocRelatorHelper.toLabel(role))
  }

  static fromObject(contribution: ContributionJson): Contribution {
    return new Contribution(
      Person.fromJson(contribution.person),
      contribution.roles,
      contribution.affiliations.map((affiliation) =>
        AuthorityOrganization.fromJson(affiliation),
      ),
      contribution.rank,
    )
  }

  static fromDbContribution(contribution: DbContribution) {
    return new Contribution(
      Person.fromDbPerson(contribution.person),
      contribution.roles
        .map((role) => LocRelatorHelper.fromLabel(role))
        .filter((role) => role !== null) as LocRelator[],
      contribution.affiliations.map((affiliation) =>
        AuthorityOrganization.fromDb(affiliation),
      ),
    )
  }
}

export { Contribution }
export type { ContributionJson }
