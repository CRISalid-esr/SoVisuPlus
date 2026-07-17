import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelationKind } from '@prisma/client'

/**
 * Reified organization-to-organization relationship, always child → parent:
 * - part_of: strong inclusion (team inside a unit, institution inside an EPE…)
 * - member_of: weak membership (unit supervised by an institution…);
 *   position only meaningful for Institution ← Unit supervision.
 */
class OrganizationRelation {
  constructor(
    public parent: OrganizationUnit,
    public kind: OrganizationRelationKind,
    public position: string | null = null,
    public startDate: string | null = null,
    public endDate: string | null = null,
  ) {}
}

export { OrganizationRelation }
