import { msg } from '@lingui/core/macro'
import type { I18n, MessageDescriptor } from '@lingui/core'
import { OrganizationCategory } from '@prisma/client'

/**
 * Display buckets for the structures listed directly under an institution in
 * the Arborescence tree. Purely a display concern: the forest itself
 * (`buildDirectoryForest`) is untouched and the other two tabs never group.
 */
export type StructureGroupKey =
  | 'teaching_research'
  | 'libraries'
  | 'general_services'
  | 'other'

/** Group headers appear in this order, whatever the data order. */
export const STRUCTURE_GROUP_ORDER: StructureGroupKey[] = [
  'teaching_research',
  'libraries',
  'general_services',
  'other',
]

/**
 * Namespace for the synthetic group header node ids. Real structure uids never
 * start with it, so group nodes and structures cannot collide in the tree
 * index nor in the `?structure=<uid>` deep link.
 */
export const STRUCTURE_GROUP_PREFIX = '__group__'

export const groupNodeId = (
  key: StructureGroupKey,
  parentNodeId: string,
): string => `${STRUCTURE_GROUP_PREFIX}:${key}@@${parentNodeId}`

export const isGroupNodeId = (nodeId: string): boolean =>
  nodeId.startsWith(`${STRUCTURE_GROUP_PREFIX}:`)

/**
 * Bucket a structure. Conditions are evaluated in order and the first match
 * wins, so a structure always appears in exactly one group.
 *
 * `nationalType` is a free-form upstream code (schema.prisma), hence the
 * case-insensitive comparison.
 */
export const groupOf = (row: {
  category: OrganizationCategory
  nationalType: string | null
}): StructureGroupKey => {
  if (
    row.nationalType?.toUpperCase() === 'UFR' ||
    row.category === OrganizationCategory.teaching_unit ||
    row.category === OrganizationCategory.research_unit
  ) {
    return 'teaching_research'
  }
  if (row.category === OrganizationCategory.support_unit) {
    return 'libraries'
  }
  if (row.category === OrganizationCategory.administrative_unit) {
    return 'general_services'
  }
  return 'other'
}

/** Static `msg` entries only — the Lingui extractor cannot see dynamic ids. */
const GROUP_LABELS: Record<StructureGroupKey, MessageDescriptor> = {
  teaching_research: msg`research_structures_group_teaching_research`,
  libraries: msg`research_structures_group_libraries`,
  general_services: msg`research_structures_group_general_services`,
  other: msg`research_structures_group_other`,
}

export const structureGroupLabel = (
  i18n: I18n,
  key: StructureGroupKey,
): string => i18n._(GROUP_LABELS[key])
