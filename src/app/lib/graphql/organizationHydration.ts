import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationUnitIdentifier } from '@/types/OrganizationUnitIdentifier'
import { organizationIdentifierTypeFromString } from '@/types/OrganizationUnitIdentifier'
import { Literal } from '@/types/Literal'

interface GraphLiteral {
  value: string
  language?: string | null
}

interface GraphIdentifier {
  type: string
  value: string
}

/** Shape of an OrganizationUnit node as returned by the graph GraphQL API */
export interface GraphOrganizationUnitNode {
  uid: string
  external?: boolean | null
  generic_type?: string | null
  national_type?: string | null
  types: string[]
  long_labels: GraphLiteral[]
  short_labels: GraphLiteral[]
  local_types?: GraphLiteral[]
  descriptions?: GraphLiteral[]
  identifiers: GraphIdentifier[]
}

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

/**
 * Hydrate a graph node into a shallow OrganizationUnit (no relationships).
 * Returns null when the concrete category cannot be determined
 * (a unit node without mission label) — callers must skip the node.
 */
export const hydrateOrganizationNode = (
  node: GraphOrganizationUnitNode,
): OrganizationUnit | null => {
  const category = categoryFromGraphNode(node.types, node.generic_type)
  if (!category) {
    console.error(
      `Cannot determine category of organization ${node.uid} ` +
        `(labels: [${node.types?.join(', ') ?? ''}], generic_type: ${node.generic_type ?? 'unknown'}), skipping`,
    )
    return null
  }

  const identifiers = (node.identifiers ?? [])
    .map((identifier): OrganizationUnitIdentifier | null => {
      try {
        return {
          type: organizationIdentifierTypeFromString(identifier.type),
          value: identifier.value,
        }
      } catch {
        console.warn(
          `Unsupported organization identifier type for ${identifier.value}: ${identifier.type}`,
        )
        return null // Skip unsupported identifiers
      }
    })
    .filter((identifier) => identifier !== null)

  return new OrganizationUnit(
    node.uid,
    node.short_labels?.[0]?.value ?? null,
    (node.long_labels ?? []).map((label) =>
      Literal.fromObject({
        language: label.language ?? null,
        value: label.value,
      }),
    ),
    (node.descriptions ?? []).map((description) =>
      Literal.fromObject({
        language: description.language ?? null,
        value: description.value,
      }),
    ),
    category,
    genericTypeFromCategory(category),
    node.national_type ?? null,
    identifiers,
    null,
    node.external ?? false,
    (node.local_types ?? []).map((localType) =>
      Literal.fromObject({
        language: localType.language ?? null,
        value: localType.value,
      }),
    ),
  )
}
