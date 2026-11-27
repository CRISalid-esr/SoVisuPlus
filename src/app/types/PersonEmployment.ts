import { OrganizationUnit } from '@/types/OrganizationUnit'
import { EmploymentWithRelations } from '@/prisma-schema/extended-client'

class PersonEmployment {
  constructor(
    public organizationUnit: OrganizationUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  /**
   * An employment is current when it has no end date or ends after today
   * (same rule as PersonMembership.isCurrent). Accepts plain JSON
   * employments, which have no class methods.
   */
  static isCurrent(
    employment: Pick<PersonEmployment, 'endDate'>,
    now: Date = new Date(),
  ): boolean {
    if (!employment.endDate) {
      return true
    }
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    return new Date(employment.endDate) > startOfToday
  }

  static fromDbPersonEmployment(
    employment: EmploymentWithRelations,
  ): PersonEmployment {
    return new PersonEmployment(
      OrganizationUnit.fromDbOrganizationUnit(employment.organizationUnit),
      employment.startDate?.toDateString(),
      employment.endDate?.toDateString(),
      employment.positionCode,
    )
  }
}

export { PersonEmployment }
