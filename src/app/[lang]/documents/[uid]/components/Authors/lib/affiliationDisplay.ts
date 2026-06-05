import { WorkingAffiliation } from './types'

export interface AffiliationIdentifierDisplay {
  /** Identifier type in CAPS (e.g. ROR, IDREF). */
  label: string
  value: string
}

/** Keep only the relevant ROR value (strip the https://ror.org/ prefix). */
export const truncateRor = (value: string): string =>
  value.replace(/^https?:\/\/ror\.org\//, '')

/**
 * Ordered identifier pairs for display: ROR first, then the rest. Each is rendered
 * as "<TYPE> <value>" (tags) or "<TYPE><value>" (inline) by the caller.
 */
export function orderedAffiliationIdentifiers(
  aff: WorkingAffiliation,
): AffiliationIdentifierDisplay[] {
  const pairs: AffiliationIdentifierDisplay[] = []
  if (aff.ror) pairs.push({ label: 'ROR', value: truncateRor(aff.ror) })
  if (aff.hal) pairs.push({ label: 'HAL', value: aff.hal })
  if (aff.idref) pairs.push({ label: 'IDREF', value: aff.idref })
  if (aff.nns) pairs.push({ label: 'NNS', value: aff.nns })
  if (aff.isni) pairs.push({ label: 'ISNI', value: aff.isni })
  if (aff.wikidata) pairs.push({ label: 'WIKIDATA', value: aff.wikidata })
  return pairs
}
