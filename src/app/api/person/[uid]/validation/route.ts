import { NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import {
  abilityFromAuthzContext,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { canValidateProfile } from '@/lib/identifiers/identifierCapabilities'
import { requireSession } from '@/app/auth/requireSession'

type RouteContext = { params: Promise<{ uid: string }> }

// Marks a person's profile as reviewed by a wide-scoped account editor.
export const PATCH = async (request: Request, context: RouteContext) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { uid } = await context.params

  let body: { validated?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  // Validation cannot be undone for now: only `validated: true` is accepted.
  if (body?.validated !== true) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const person = await new PersonDAO().fetchPersonByUid(uid)
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  const canManage = ability.can(PermissionAction.update, person, 'identifiers')
  const isWide = hasWiderThanSelfPersonScope(
    session.user.authz,
    'update',
    'Person',
    'identifiers',
  )
  if (!canManage || !isWide) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (
    !canValidateProfile({ canManage, isWide, isValidated: person.validated })
  ) {
    return NextResponse.json(
      { error: 'profile_already_validated' },
      { status: 409 },
    )
  }

  try {
    const updated = await new PersonService().validateProfile(
      uid,
      session.user.authz?.personUid ?? null,
    )
    if (!updated) {
      // Validated concurrently since the person was fetched
      return NextResponse.json(
        { error: 'profile_already_validated' },
        { status: 409 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`❌ Error validating profile of ${uid}:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
