import { OrganizationUnit } from '@/types/OrganizationUnit'
import { MembershipWithRelations } from '@/prisma-schema/extended-client'

class PersonMembership {
  constructor(
    public organizationUnit: OrganizationUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  /**
   * A membership is current when it has no end date or ends after today.
   * Accepts plain JSON memberships, which have no class methods.
   */
  static isCurrent(
    membership: Pick<PersonMembership, 'endDate'>,
    now: Date = new Date(),
  ): boolean {
    if (!membership.endDate) {
      return true
    }
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    return new Date(membership.endDate) > startOfToday
  }

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
