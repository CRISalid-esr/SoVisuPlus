import { PersonIdentifierType } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'

/**
 * Builds the SWORD `On-Behalf-Of` header value identifying the person a deposit is made for.
 *
 * Format (see spec): `login|<hal_login>;idhal|<idhal>` where the idhal part prefers
 * `idhals` over `idhali` (both accepted by HAL). ORCID is never included — HAL rejects it here.
 *
 * Returns `null` when either required part is missing, so callers can fail fast: a person is
 * only eligible to be deposited on behalf of if they have BOTH a `hal_login` and an
 * `idhals`/`idhali` identifier.
 */
export class HalOnBehalfOfBuilder {
  static build(identifiers: PersonIdentifier[]): string | null {
    const valueOf = (type: PersonIdentifierType): string | null =>
      identifiers.find((id) => id.type === type)?.value?.trim() || null

    const login = valueOf(PersonIdentifierType.hal_login)
    const idhal =
      valueOf(PersonIdentifierType.idhals) ??
      valueOf(PersonIdentifierType.idhali)

    if (!login || !idhal) return null

    return `login|${login};idhal|${idhal}`
  }
}
