import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { ContributionStatus, WorkingContribution } from './types'

/**
 * Compute a contribution's status from its identifiers / not-aligned flag.
 *
 * - has a HAL identifier (idhals or idhali)      -> 'identified_and_aligned'
 * - else has orcid or idref                       -> 'identified'
 * - else flagged not-aligned (HAL "Add contributor") -> 'not_aligned'
 * - otherwise                                     -> 'not_identified'
 *
 * 'identified_and_aligned' prevails over 'identified'. `form_i`/`person_i` are never
 * stored as identifiers, so they cannot influence this.
 */
export function computeContributionStatus(
  contribution: Pick<WorkingContribution, 'identifiers' | 'notAligned'>,
): ContributionStatus {
  const types = new Set(contribution.identifiers.map((id) => id.type))

  if (
    types.has(PersonIdentifierType.idhals) ||
    types.has(PersonIdentifierType.idhali)
  ) {
    return 'identified_and_aligned'
  }
  if (
    types.has(PersonIdentifierType.orcid) ||
    types.has(PersonIdentifierType.idref)
  ) {
    return 'identified'
  }
  if (contribution.notAligned) {
    return 'not_aligned'
  }
  return 'not_identified'
}
