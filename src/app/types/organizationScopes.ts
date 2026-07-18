import { OrganizationCategory, OrganizationRelationKind } from '@prisma/client'
import { PersonMembership } from '@/types/PersonMembership'
import { ScopeMap } from '@/types/authorizable'

const SUBDIVISION_CATEGORIES: OrganizationCategory[] = [
  OrganizationCategory.institution_subdivision,
  OrganizationCategory.doctoral_school,
  OrganizationCategory.unit_subdivision,
]

/**
 * Organization authorization perimeter of a set of memberships — the same
 * one-hop expansion as the dashboard perimeters, inverted:
 * - ResearchUnit / Team: organizations the person is a direct member of;
 * - Institution: institutions that the person's research units are
 *   member_of (any supervision position);
 * - InstitutionDivision: subdivisions the person is a direct member of,
 *   plus subdivisions any membership organization is member_of or part_of.
 * Employments feed no perimeter (no employment data exists yet).
 */
export const organizationPerimeterFromMemberships = (
  memberships: PersonMembership[] | undefined,
): Pick<
  Required<ScopeMap>,
  'ResearchUnit' | 'Team' | 'Institution' | 'InstitutionDivision'
> => {
  const researchUnits = new Set<string>()
  const teams = new Set<string>()
  const institutions = new Set<string>()
  const divisions = new Set<string>()

  for (const membership of memberships ?? []) {
    const organization = membership.organizationUnit
    if (!organization?.uid) {
      continue
    }
    if (organization.category === OrganizationCategory.research_unit) {
      researchUnits.add(organization.uid)
      for (const relation of organization.parents ?? []) {
        if (
          relation.kind === OrganizationRelationKind.member_of &&
          relation.parent?.category === OrganizationCategory.institution
        ) {
          institutions.add(relation.parent.uid)
        }
      }
    }
    if (organization.category === OrganizationCategory.team) {
      teams.add(organization.uid)
    }
    if (SUBDIVISION_CATEGORIES.includes(organization.category)) {
      divisions.add(organization.uid)
    }
    for (const relation of organization.parents ?? []) {
      if (
        relation.parent &&
        SUBDIVISION_CATEGORIES.includes(relation.parent.category)
      ) {
        divisions.add(relation.parent.uid)
      }
    }
  }

  return {
    ResearchUnit: Array.from(researchUnits),
    Team: Array.from(teams),
    Institution: Array.from(institutions),
    InstitutionDivision: Array.from(divisions),
  }
}
