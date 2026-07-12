'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  abilityFromAuthzContext,
  EMPTY_PRINCIPAL,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Person } from '@/types/Person'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import {
  computeIdentifierCapabilities,
  identifierSupportsAuth,
} from '@/lib/identifiers/identifierCapabilities'

export type IdentifierCapabilities = {
  /** The identifier of this type is authenticated (derived, not stored). */
  isAuthenticated: boolean
  /** Authenticate / add-through-auth (ORCID, IdHAL) — own account only. */
  canAuthenticate: boolean
  /** Add a non-authenticated identifier — wide-scoped editors only. */
  canAddUnauthenticated: boolean
  /** Remove the identifier, honouring the authenticated/own-account rules. */
  canRemove: boolean
}

/**
 * Single source of truth for the account-edition capability matrix
 * (specs/872-refactor-account-edition-workflow/prompt.md). Mirrors the
 * server-side gates in the identifier route and callbacks.
 *
 * @param person   the account being viewed (may be undefined while loading)
 * @param type     the identifier type this control manages
 * @param ownPerspective whether the viewer is looking at their own account
 */
export const useIdentifierCapabilities = (
  person: Person | undefined,
  type: PersonIdentifierType,
  ownPerspective: boolean,
): IdentifierCapabilities => {
  const { data: session } = useSession()
  const authz = session?.user?.authz ?? EMPTY_PRINCIPAL
  const ability = useMemo(() => abilityFromAuthzContext(authz), [authz])

  return useMemo(() => {
    const isAuthenticated = person?.isIdentifierAuthenticated(type) ?? false
    const canManage =
      !!person && ability.can(PermissionAction.update, person, 'identifiers')
    const isWide = hasWiderThanSelfPersonScope(
      authz,
      'update',
      'Person',
      'identifiers',
    )

    return {
      isAuthenticated,
      ...computeIdentifierCapabilities({
        canManage,
        isOwn: ownPerspective,
        isWide,
        isAuthenticated,
        supportsAuth: identifierSupportsAuth(type),
      }),
    }
  }, [person, type, ownPerspective, ability, authz])
}
