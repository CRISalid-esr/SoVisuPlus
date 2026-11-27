import {
  OrganizationUnit,
  OrganizationUnitJson,
} from '@/types/OrganizationUnit'
import { MembershipWithRelations } from '@/prisma-schema/extended-client'
import { isCurrentPeriod } from '@/utils/period'

interface PersonMembershipJson {
  organizationUnit: OrganizationUnitJson
  startDate?: string | null
  endDate?: string | null
  positionCode?: string | null
}

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
    return isCurrentPeriod(membership.endDate, now)
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

  static fromJson(membership: PersonMembershipJson): PersonMembership {
    return new PersonMembership(
      OrganizationUnit.fromJson(membership.organizationUnit),
      membership.startDate ?? null,
      membership.endDate ?? null,
      membership.positionCode ?? null,
    )
  }
}

export { PersonMembership }
export type { PersonMembershipJson }
