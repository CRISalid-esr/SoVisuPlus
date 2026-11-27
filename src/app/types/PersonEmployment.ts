import {
  OrganizationUnit,
  OrganizationUnitJson,
} from '@/types/OrganizationUnit'
import { EmploymentWithRelations } from '@/prisma-schema/extended-client'
import { isCurrentPeriod } from '@/utils/period'

interface PersonEmploymentJson {
  organizationUnit: OrganizationUnitJson
  startDate?: string | null
  endDate?: string | null
  positionCode?: string | null
}

class PersonEmployment {
  constructor(
    public organizationUnit: OrganizationUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

  /** An employment is current when it has no end date or ends after today. */
  static isCurrent(
    employment: Pick<PersonEmployment, 'endDate'>,
    now: Date = new Date(),
  ): boolean {
    return isCurrentPeriod(employment.endDate, now)
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

  static fromJson(employment: PersonEmploymentJson): PersonEmployment {
    return new PersonEmployment(
      OrganizationUnit.fromJson(employment.organizationUnit),
      employment.startDate ?? null,
      employment.endDate ?? null,
      employment.positionCode ?? null,
    )
  }
}

export { PersonEmployment }
export type { PersonEmploymentJson }
