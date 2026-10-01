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
  /** Removal is restricted to wide-scoped editors for this identifier type. */
  removalRequiresWide: boolean
}

export type IdentifierCapabilities = {
  /** Authenticate / add-through-auth — own account only, ORCID/idHAL only. */
  canAuthenticate: boolean
  /** Add a non-authenticated identifier — wide-scoped editors only. */
  canAddUnauthenticated: boolean
  /** Remove the identifier (authenticated → own account only; see `identifierRemovalRequiresWideScope`). */
  canRemove: boolean
}

/** Whether an identifier type has an authentication workflow. */
export const identifierSupportsAuth = (type: PersonIdentifierType): boolean =>
  type === PersonIdentifierType.orcid ||
  type === PersonIdentifierType.idhals ||
  type === PersonIdentifierType.idhali

/**
 * Temporary: IdRef removal is denied to self-scoped editors until the backends
 * (ikg, harvester) correctly handle an IdRef being re-assigned afterwards.
 * See specs/882-no-self-deletion-of-idref-for-a-researcher/prompt.md.
 */
export const identifierRemovalRequiresWideScope = (
  type: PersonIdentifierType,
): boolean => type === PersonIdentifierType.idref

export const computeIdentifierCapabilities = ({
  canManage,
  isOwn,
  isWide,
  isAuthenticated,
  supportsAuth,
  removalRequiresWide,
}: IdentifierCapabilityInput): IdentifierCapabilities => ({
  canAuthenticate: supportsAuth && isOwn && canManage,
  canAddUnauthenticated: canManage && isWide,
  canRemove:
    canManage &&
    (removalRequiresWide ? isWide : isAuthenticated ? isOwn : isOwn || isWide),
})
