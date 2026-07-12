import { PersonIdentifierType } from '@/types/PersonIdentifier'

/**
 * The account-edition capability matrix, as a pure function shared by the
 * identifier API route (server enforcement) and the account-page controls
 * (UI gating). See specs/872-refactor-account-edition-workflow/prompt.md.
 */
export type IdentifierCapabilityInput = {
  /** `ability.can(update, person, 'identifiers')` — encodes the scope perimeter. */
  canManage: boolean
  /** The acting user is looking at their own account. */
  isOwn: boolean
  /** The user holds the permission through a scope wider than their own Person. */
  isWide: boolean
  /** The identifier of this type is authenticated (derived, never stored). */
  isAuthenticated: boolean
  /** The identifier type has an authentication workflow (ORCID, idHAL). */
  supportsAuth: boolean
}

export type IdentifierCapabilities = {
  /** Authenticate / add-through-auth — own account only, ORCID/idHAL only. */
  canAuthenticate: boolean
  /** Add a non-authenticated identifier — wide-scoped editors only. */
  canAddUnauthenticated: boolean
  /** Remove the identifier (authenticated → own account only). */
  canRemove: boolean
}

/** Whether an identifier type has an authentication workflow. */
export const identifierSupportsAuth = (type: PersonIdentifierType): boolean =>
  type === PersonIdentifierType.orcid ||
  type === PersonIdentifierType.idhals ||
  type === PersonIdentifierType.idhali

export const computeIdentifierCapabilities = ({
  canManage,
  isOwn,
  isWide,
  isAuthenticated,
  supportsAuth,
}: IdentifierCapabilityInput): IdentifierCapabilities => ({
  canAuthenticate: supportsAuth && isOwn && canManage,
  canAddUnauthenticated: canManage && isWide,
  canRemove: canManage && (isAuthenticated ? isOwn : isOwn || isWide),
})
