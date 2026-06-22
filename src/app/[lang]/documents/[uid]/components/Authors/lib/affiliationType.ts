import { AuthorityOrganizationType } from '@prisma/client'

/**
 * Affiliation types as exposed in the Author tab, using HAL's vocabulary.
 * Declared in display order — the select options and the suggestion chip both
 * iterate this constant so the order stays consistent.
 */
export const HAL_AFFILIATION_TYPES = [
  'institution',
  'department',
  'regrouplaboratory',
  'laboratory',
  'researchteam',
] as const

export type HalAffiliationType = (typeof HAL_AFFILIATION_TYPES)[number]

const HAL_AFFILIATION_TYPE_SET = new Set<string>(HAL_AFFILIATION_TYPES)

/**
 * Map our database `AuthorityOrganizationType` to the HAL value used as the
 * select's default. Every DB value maps except `organization`, which has no
 * sensible HAL default and returns null.
 */
const DB_TYPE_TO_HAL: Partial<
  Record<AuthorityOrganizationType, HalAffiliationType>
> = {
  [AuthorityOrganizationType.institution]: 'institution',
  [AuthorityOrganizationType.laboratory]: 'laboratory',
  [AuthorityOrganizationType.research_team]: 'researchteam',
  [AuthorityOrganizationType.institution_group]: 'institution',
  [AuthorityOrganizationType.laboratory_group]: 'regrouplaboratory',
  [AuthorityOrganizationType.research_team_group]: 'researchteam',
}

/** DB enum -> HAL select value (null when there is no sensible default). */
export function dbTypeToHal(
  type: AuthorityOrganizationType | null,
): HalAffiliationType | null {
  return type ? (DB_TYPE_TO_HAL[type] ?? null) : null
}

/**
 * Validate a raw HAL `type_s` string against the supported set, returning it
 * only if it is one of the known affiliation types; otherwise null.
 */
export function normalizeHalType(
  raw: string | null | undefined,
): HalAffiliationType | null {
  const normalized = raw?.trim().toLowerCase()
  return normalized && HAL_AFFILIATION_TYPE_SET.has(normalized)
    ? (normalized as HalAffiliationType)
    : null
}
