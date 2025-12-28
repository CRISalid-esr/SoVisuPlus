import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { SourcePerson, SourcePersonJson } from '@/types/SourcePerson'
import { SourceContributionWithRelations as DbSourceContribution } from '@/prisma-schema/extended-client'

export interface SourceContributionJson {
  role: LocRelator
  person: SourcePersonJson
}

export class SourceContribution {
  constructor(
    public role: LocRelator,
    public person: SourcePerson,
  ) {}

  getRoleLabel(): string {
    return this.role ? LocRelatorHelper.toLabel(this.role) : ''
  }

  static fromObject(contribution: SourceContributionJson): SourceContribution {
    return new SourceContribution(
      contribution.role,
      SourcePerson.fromJson(contribution.person),
    )
  }

  static fromDbContribution(contribution: DbSourceContribution) {
    const role = LocRelatorHelper.fromLabel(contribution.role)
    if (!role) {
      throw new Error(
        `role isn't recognized for this source contribution : ${contribution}`,
      )
    }
    return new SourceContribution(
      role,
      SourcePerson.fromDbSourcePerson(contribution.person),
    )
  }
}
