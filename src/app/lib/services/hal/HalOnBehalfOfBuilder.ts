import { PersonIdentifierType } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'

/**
 * Builds the SWORD `On-Behalf-Of` header value identifying the person a deposit is made for.
 *
 * The idhal part (preferring `idhals` over `idhali`, both accepted by HAL) is always required and
 * is sufficient on its own: `idhal|<idhal>`. When the person also has a `hal_login` (provisioned
 * via HAL CAS authentication) it is prepended: `login|<hal_login>;idhal|<idhal>`. ORCID is never
 * included — HAL rejects it here.
 *
 * Returns `null` only when no idhal is present. Whether a login-less (idhal-only) deposit is
 * *allowed* is an authorization concern enforced at deposit-creation time (the
 * `deposit_hal_unauthenticated` permission), not here.
 */
export class HalOnBehalfOfBuilder {
  static build(identifiers: PersonIdentifier[]): string | null {
    const valueOf = (type: PersonIdentifierType): string | null =>
      identifiers.find((id) => id.type === type)?.value?.trim() || null

    const login = valueOf(PersonIdentifierType.hal_login)
    const idhal =
      valueOf(PersonIdentifierType.idhals) ??
      valueOf(PersonIdentifierType.idhali)

    if (!idhal) return null

    return login ? `login|${login};idhal|${idhal}` : `idhal|${idhal}`
  }
}
