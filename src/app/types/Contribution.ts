import { Person } from '@/types/Person'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { Person as DbPerson } from '@prisma/client'
import { ContributionWithRelations as DbContribution } from '@/prisma-schema/extended-client'

interface ContributionJson {
  person: DbPerson
  roles: LocRelator[]
  rank: number | null
}

class Contribution {
  constructor(
    public person: Person,
    public roles: LocRelator[] = [], // Store multiple roles as an array of enums
    public rank?: number | null,
  ) {}

  getRoleLabels(): string[] {
    return this.roles.map((role) => LocRelatorHelper.toLabel(role))
  }

  static fromObject(contribution: ContributionJson): Contribution {
    return new Contribution(
      Person.fromDbPerson(contribution.person),
      contribution.roles,
      contribution.rank,
    )
  }

  static fromDbContribution(contribution: DbContribution) {
    return new Contribution(
      Person.fromDbPerson(contribution.person),
      contribution.roles
        .map((role) => LocRelatorHelper.fromLabel(role))
        .filter((role) => role !== null) as LocRelator[],
    )
  }
}

export { Contribution }
export type { ContributionJson }
