import { PersonIdentifierType } from '@/types/PersonIdentifier'
import {
  AureHalAuthorDoc,
  AureHalStructureDoc,
} from '@/lib/services/AureHalAPIClient'
import { newLocalId } from './localId'
import { truncateRor } from './affiliationDisplay'
import {
  WorkingAffiliation,
  WorkingContribution,
  WorkingIdentifier,
} from './types'

const firstOrNull = (arr?: string[]): string | null =>
  arr && arr.length > 0 ? arr[0] : null

/** Strip a known URL prefix to keep only the bare identifier value. */
const stripPrefix = (value: string, ...prefixes: string[]): string => {
  let result = value.trim()
  for (const prefix of prefixes) {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length)
    }
  }
  return result
}

/**
 * Build the identifier/name fields applied to a contribution when a HAL author
 * profile is selected. Maps idHal_s -> idhals, orcidId_s -> orcid, idrefId_s -> idref.
 * `form_i` and `person_i` are intentionally never mapped to an identifier.
 */
export function halAuthorToContributionFields(doc: AureHalAuthorDoc): {
  displayName: string
  firstName: string | null
  lastName: string | null
  identifiers: WorkingIdentifier[]
} {
  const identifiers: WorkingIdentifier[] = []

  if (doc.idHal_s) {
    identifiers.push({ type: PersonIdentifierType.idhals, value: doc.idHal_s })
  }
  const orcid = firstOrNull(doc.orcidId_s)
  if (orcid) {
    identifiers.push({
      type: PersonIdentifierType.orcid,
      value: stripPrefix(orcid, 'https://orcid.org/', 'http://orcid.org/'),
    })
  }
  const idref = firstOrNull(doc.idrefId_s)
  if (idref) {
    identifiers.push({
      type: PersonIdentifierType.idref,
      value: stripPrefix(
        idref,
        'https://www.idref.fr/',
        'http://www.idref.fr/',
      ),
    })
  }

  return {
    displayName: doc.fullName_s,
    firstName: doc.firstName_s ?? null,
    lastName: doc.lastName_s ?? null,
    identifiers,
  }
}

/**
 * Build a WorkingAffiliation from a HAL structure doc (identified affiliation).
 * The structure docid is the HAL affiliation identifier (`hal`); other identifiers
 * follow the HAL -> app type map.
 */
export function halStructureToAffiliation(
  doc: AureHalStructureDoc,
): WorkingAffiliation {
  const name = doc.name_s || doc.label_s || null
  return {
    localId: newLocalId(),
    acronym: doc.acronym_s ?? null,
    name,
    label: doc.label_s ?? null,
    hal: doc.docid ?? null,
    idref: firstOrNull(doc.idref_s),
    isni: firstOrNull(doc.isni_s),
    nns: firstOrNull(doc.rnsr_s),
    ror: (() => {
      const v = firstOrNull(doc.ror_s)
      return v ? truncateRor(v) : null
    })(),
    wikidata: firstOrNull(doc.wikidata_s),
    importedText: null,
    halExtra: doc,
  }
}

/** True when the affiliation carries at least one identifier. */
export function isAffiliationIdentified(
  aff: Pick<
    WorkingAffiliation,
    'hal' | 'ror' | 'idref' | 'nns' | 'isni' | 'wikidata'
  >,
): boolean {
  return Boolean(
    aff.hal || aff.ror || aff.idref || aff.nns || aff.isni || aff.wikidata,
  )
}

/** Dedup key for the distinct-affiliation count: first present id, else the name. */
export function affiliationDedupKey(aff: WorkingAffiliation): string {
  return (
    aff.ror ||
    aff.idref ||
    aff.isni ||
    aff.nns ||
    aff.hal ||
    aff.wikidata ||
    (aff.name || aff.label || aff.importedText || '').trim().toLowerCase()
  )
}

/** Count distinct affiliations across all contributions (deduped by identifier/name). */
export function countDistinctAffiliations(
  contributions: WorkingContribution[],
): number {
  const keys = new Set<string>()
  for (const contribution of contributions) {
    for (const aff of contribution.affiliations) {
      const key = affiliationDedupKey(aff)
      if (key) keys.add(key)
    }
  }
  return keys.size
}
