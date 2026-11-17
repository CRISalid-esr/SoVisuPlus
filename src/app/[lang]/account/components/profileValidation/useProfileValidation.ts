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
import {
  canSeeProfileValidation,
  canValidateProfile,
} from '@/lib/identifiers/identifierCapabilities'

export type ProfileValidationState = {
  /** The profile has been validated (only meaningful when `canSeeStatus`). */
  isValidated: boolean
  /** The viewer may see the validation status — wide-scoped editors only. */
  canSeeStatus: boolean
  /** The viewer may validate the profile now. */
  canValidate: boolean
}

/** Profile validation gating for the account page; mirrors the validation route. */
export const useProfileValidation = (
  person: Person | undefined,
): ProfileValidationState => {
  const { data: session } = useSession()
  const authz = session?.user?.authz ?? EMPTY_PRINCIPAL
  const ability = useMemo(() => abilityFromAuthzContext(authz), [authz])

  return useMemo(() => {
    const canManage =
      !!person && ability.can(PermissionAction.update, person, 'identifiers')
    const isWide = hasWiderThanSelfPersonScope(
      authz,
      'update',
      'Person',
      'identifiers',
    )
    const isValidated = person?.validated ?? false
    return {
      isValidated,
      canSeeStatus: canSeeProfileValidation({ canManage, isWide }),
      canValidate: canValidateProfile({ canManage, isWide, isValidated }),
    }
  }, [person, ability, authz])
}
