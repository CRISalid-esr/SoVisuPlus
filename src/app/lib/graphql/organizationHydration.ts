import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

/**
 * Concrete category from the Neo4j node labels. The graph does not expose
 * main_mission through GraphQL: the concrete unit type is only carried by
 * the labels (e.g. ["OrganizationUnit", "Unit", "ResearchUnit"]).
 */
const CATEGORY_BY_LABEL: Record<string, OrganizationCategory> = {
  ResearchUnit: OrganizationCategory.research_unit,
  SupportUnit: OrganizationCategory.support_unit,
  AdministrativeUnit: OrganizationCategory.administrative_unit,
  TeachingUnit: OrganizationCategory.teaching_unit,
  Institution: OrganizationCategory.institution,
  InstitutionSubdivision: OrganizationCategory.institution_subdivision,
  UnitSubdivision: OrganizationCategory.unit_subdivision,
  Team: OrganizationCategory.team,
}

/** Fallback when no concrete label matches. A bare "unit" has no category. */
const CATEGORY_BY_GENERIC_TYPE: Record<string, OrganizationCategory> = {
  institution: OrganizationCategory.institution,
  institution_subdivision: OrganizationCategory.institution_subdivision,
  unit_subdivision: OrganizationCategory.unit_subdivision,
  team: OrganizationCategory.team,
}

/**
 * Derive the concrete organization category of a graph node.
 * @param types - Neo4j labels of the node
 * @param genericType - the node's generic_type property
 * @returns the category, or null when it cannot be determined
 *          (a unit without mission label) — callers must log and skip.
 */
export const categoryFromGraphNode = (
  types: string[] | undefined,
  genericType: string | undefined | null,
): OrganizationCategory | null => {
  for (const label of types ?? []) {
    const category = CATEGORY_BY_LABEL[label]
    if (category) {
      return category
    }
  }
  return CATEGORY_BY_GENERIC_TYPE[genericType ?? ''] ?? null
}

const GENERIC_TYPE_BY_CATEGORY: Record<
  OrganizationCategory,
  OrganizationGenericType
> = {
  institution: OrganizationGenericType.institution,
  institution_subdivision: OrganizationGenericType.institution_subdivision,
  research_unit: OrganizationGenericType.unit,
  support_unit: OrganizationGenericType.unit,
  administrative_unit: OrganizationGenericType.unit,
  teaching_unit: OrganizationGenericType.unit,
  unit_subdivision: OrganizationGenericType.unit_subdivision,
  team: OrganizationGenericType.team,
}

export const genericTypeFromCategory = (
  category: OrganizationCategory,
): OrganizationGenericType => GENERIC_TYPE_BY_CATEGORY[category]
