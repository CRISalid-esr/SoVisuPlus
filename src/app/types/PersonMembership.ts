import { ResearchUnit } from '@/types/ResearchUnit'
import { MembershipWithRelations } from '@/prisma-schema/extended-client'

class PersonMembership {
  constructor(
    public researchUnit: ResearchUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  static fromDbPersonMembership(
    membership: MembershipWithRelations,
  ): PersonMembership {
    return new PersonMembership(
      ResearchUnit.fromDbResearchUnit(membership.researchUnit),
      membership.startDate?.toDateString(),
      membership.endDate?.toDateString(),
      membership.positionCode,
    )
  }
}

export { PersonMembership }
