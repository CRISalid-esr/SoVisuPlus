import { NextResponse } from 'next/server'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { UserService } from '@/lib/services/UserService'
import { requireSession } from '@/app/auth/requireSession'
import {
  abilityFromAuthzContext,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { canSeeProfileValidation } from '@/lib/identifiers/identifierCapabilities'

export const GET = async () => {
  try {
    const { session, error: authError } = await requireSession()
    if (authError) return authError

    const userService = new UserService()
    const connectedUser = await userService.getUserByPersonIdentifier(
      new PersonIdentifier(PersonIdentifierType.local, session.user.username),
    )

    if (!connectedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    // The profile validation status is only disclosed to wide-scoped editors.
    const person = connectedUser.person
    if (
      person?.validated &&
      !canSeeProfileValidation({
        canManage: abilityFromAuthzContext(session.user.authz).can(
          PermissionAction.update,
          person,
          'identifiers',
        ),
        isWide: hasWiderThanSelfPersonScope(
          session.user.authz,
          'update',
          'Person',
          'identifiers',
        ),
      })
    ) {
      person.validated = false
    }
    return NextResponse.json(connectedUser)
  } catch (error) {
    console.error('Error fetching connected user:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
