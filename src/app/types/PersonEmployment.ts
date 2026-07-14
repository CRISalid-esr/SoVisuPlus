import { OrganizationUnit } from '@/types/OrganizationUnit'
import { EmploymentWithRelations } from '@/prisma-schema/extended-client'

class PersonEmployment {
  constructor(
    public organizationUnit: OrganizationUnit,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}

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
