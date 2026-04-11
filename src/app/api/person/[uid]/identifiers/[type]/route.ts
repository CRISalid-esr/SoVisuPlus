import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

// Identifier types that can be updated through this route and their validation rules
const ALLOWED_TYPES: Partial<Record<PersonIdentifierType, RegExp>> = {
  [PersonIdentifierType.idref]: /^\d{8}[\dX]$/i,
}

type RouteContext = { params: Promise<{ uid: string; type: string }> }

const resolveContext = async (
  context: RouteContext,
  session: Session | null,
): Promise<
  | { error: NextResponse }
  | { uid: string; identifierType: PersonIdentifierType }
> => {
  if (!session?.user?.authz) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { uid, type } = await context.params

  const identifierType = PersonIdentifier.typeFromString(
    type,
  ) as PersonIdentifierType | null
  if (!identifierType || !(identifierType in ALLOWED_TYPES)) {
    return {
      error: NextResponse.json(
        {
          error: `Identifier type '${type}' cannot be updated through this endpoint`,
        },
        { status: 400 },
      ),
    }
  }

  return { uid, identifierType }
}

export const PUT = async (request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session
  const resolved = await resolveContext(context, session)
  if ('error' in resolved) return resolved.error
  const { uid, identifierType } = resolved

  let body: { value?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const value = body.value?.trim()
  const validationRegex = ALLOWED_TYPES[identifierType]!
  if (!value || !validationRegex.test(value)) {
    return NextResponse.json(
      { error: `Invalid format for identifier type '${identifierType}'` },
      { status: 400 },
    )
  }

  const personDAO = new PersonDAO()
  const person = await personDAO.fetchPersonByUid(uid)
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, person, 'identifiers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const personService = new PersonService()
    await personService.addOrUpdateIdentifier(
      uid,
      identifierType,
      value.toUpperCase(),
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`❌ Error updating ${identifierType} identifier:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export const DELETE = async (_request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session
  const resolved = await resolveContext(context, session)
  if ('error' in resolved) return resolved.error
  const { uid, identifierType } = resolved

  const personDAO = new PersonDAO()
  const person = await personDAO.fetchPersonByUid(uid)
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  }

  const ability = abilityFromAuthzContext(session.user.authz)
  if (!ability.can(PermissionAction.update, person, 'identifiers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const personService = new PersonService()
    await personService.removeIdentifier(uid, identifierType)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`❌ Error removing ${identifierType} identifier:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
