import { PersonDAO } from '@/lib/daos/PersonDAO'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

const VALIDATABLE_IDENTIFIER_TYPES: PersonIdentifierType[] = [
  PersonIdentifierType.idref,
  PersonIdentifierType.orcid,
  PersonIdentifierType.idhals,
  PersonIdentifierType.idhali,
]

/**
 * One-off resync of the identifiers' `validated` flag from the graph, for
 * identifiers validated in the graph before the flag was stored locally.
 * Idempotent: rows already in sync are left untouched.
 */
export class IdentifierValidationSyncService {
  constructor(
    private personDAO = new PersonDAO(),
    private personGraphQLClient = new PersonGraphQLClient(),
  ) {}

  async syncFromGraph(): Promise<{
    people: number
    updated: number
    failed: number
  }> {
    const uids =
      await this.personDAO.fetchInternalPersonUidsWithIdentifierTypes(
        VALIDATABLE_IDENTIFIER_TYPES,
      )
    let updated = 0
    let failed = 0
    for (const uid of uids) {
      try {
        const person = await this.personGraphQLClient.getPersonByUid(uid)
        if (!person) {
          console.warn(`Person ${uid} not found in the graph, skipping`)
          continue
        }
        const identifiers = person
          .getIdentifiers()
          .filter((identifier) =>
            VALIDATABLE_IDENTIFIER_TYPES.includes(identifier.type),
          )
        updated += await this.personDAO.syncIdentifiersValidation(
          uid,
          identifiers,
        )
      } catch (error) {
        failed++
        console.error(`Failed to sync identifiers of person ${uid}:`, error)
      }
    }
    return { people: uids.length, updated, failed }
  }
}
