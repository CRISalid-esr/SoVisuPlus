import { OrganizationUnit } from '@/types/OrganizationUnit'
import { MembershipWithRelations } from '@/prisma-schema/extended-client'

class PersonMembership {
  constructor(
    public organizationUnit: OrganizationUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  static fromDbPersonMembership(
    membership: MembershipWithRelations,
  ): PersonMembership {
    return new PersonMembership(
      OrganizationUnit.fromDbOrganizationUnit(membership.organizationUnit),
      membership.startDate?.toDateString(),
      membership.endDate?.toDateString(),
      membership.positionCode,
    )
  }
}

export { PersonMembership }
