import { ResearchStructure } from '@/types/ResearchStructure'
import { MembershipWithRelations } from '@/prisma-schema/extended-client'

class PersonMembership {
  constructor(
    public researchStructure: ResearchStructure,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  static fromDbPersonMembership(
    membership: MembershipWithRelations,
  ): PersonMembership {
    return new PersonMembership(
      ResearchStructure.fromDbResearchStructure(membership.researchStructure),
      membership.startDate?.toDateString(),
      membership.endDate?.toDateString(),
      membership.positionCode,
    )
  }
}

export { PersonMembership }
