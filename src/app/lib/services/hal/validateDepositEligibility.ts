import { PersonIdentifierType } from '@prisma/client'
import { Document } from '@/types/Document'
import { Person } from '@/types/Person'
import { isDepositableType } from './halDepositFormConfig'

/**
 * Reasons a document/person cannot be deposited. These are returned by the shared validator and
 * map 1:1 to the UI access gates, so the client and the server stay in lockstep.
 */
export type DepositIneligibilityReason =
  | 'type_not_depositable'
  | 'missing_identifiers'
  | 'missing_publication_date'
  | 'missing_journal'
  | 'no_hal_affiliation'

export type DepositEligibility =
  | { ok: true }
  | { ok: false; reason: DepositIneligibilityReason }

export interface DepositEligibilityOptions {
  /**
   * When true, the depositing user holds `deposit_hal_unauthenticated`, so the perspective person
   * does not need a `hal_login` — an idhal alone is sufficient.
   */
  allowUnauthenticated?: boolean
}

/** The person must have an idhal, and (unless unauthenticated deposits are allowed) a hal_login. */
const hasRequiredHalIdentifiers = (
  person: Person,
  allowUnauthenticated: boolean,
): boolean => {
  const hasIdhal =
    person.hasIdentifier(PersonIdentifierType.idhals) ||
    person.hasIdentifier(PersonIdentifierType.idhali)
  if (!hasIdhal) return false
  return allowUnauthenticated || person.hasIdentifier(PersonIdentifierType.hal_login)
}

/** Org identifier types HAL recognises for an affiliation (RNSR/ROR/ISNI/IdRef). */
const HAL_RECOGNISED_ORG_IDENTIFIERS = new Set(['nns', 'ror', 'isni', 'idref'])

const hasHalRecognisedAffiliation = (document: Document): boolean =>
  (document.contributions ?? []).some((contribution) =>
    contribution.affiliations.some((org) =>
      org.identifiers.some(
        (id) =>
          HAL_RECOGNISED_ORG_IDENTIFIERS.has(id.type) &&
          !!id.value?.trim(),
      ),
    ),
  )

/**
 * Pure eligibility check shared by the deposit API route and the client form. `halType` is the
 * (possibly user-refined) HAL document type. The person is the perspective person the deposit
 * is made on behalf of.
 */
export const validateDepositEligibility = (
  document: Document,
  person: Person,
  halType: string,
  options: DepositEligibilityOptions = {},
): DepositEligibility => {
  if (!isDepositableType(halType)) {
    return { ok: false, reason: 'type_not_depositable' }
  }

  if (!hasRequiredHalIdentifiers(person, !!options.allowUnauthenticated)) {
    return { ok: false, reason: 'missing_identifiers' }
  }

  if (!document.publicationDate?.trim()) {
    return { ok: false, reason: 'missing_publication_date' }
  }

  if (halType === 'ART' && !document.journal?.title?.trim()) {
    return { ok: false, reason: 'missing_journal' }
  }

  if (!hasHalRecognisedAffiliation(document)) {
    return { ok: false, reason: 'no_hal_affiliation' }
  }

  return { ok: true }
}
